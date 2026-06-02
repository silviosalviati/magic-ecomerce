import axios from 'axios';

const ASAAS_BASE = (process.env.ASAAS_BASE_URL ?? 'https://api-sandbox.asaas.com/v3').trim();
const ASAAS_KEY = (process.env.ASAAS_API_KEY ?? '').trim();

const client = axios.create({
  baseURL: ASAAS_BASE,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'magic-ecomerce-api',
    access_token: ASAAS_KEY,
  },
  timeout: 15000,
});

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

export interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  bankSlipUrl?: string;
  nossoNumero?: string;
  invoiceUrl?: string;
}

export interface PixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export interface BoletoData {
  bankSlipUrl: string;
  nossoNumero: string;
  dueDate: string;
}

export interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface CreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
}

export interface InstallmentSimulation {
  installmentCount: number;
  installmentValue: number;
  totalValue: number;
}

function toNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function collectSimulationCandidates(value: unknown, out: InstallmentSimulation[]): void {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectSimulationCandidates(item, out);
    }
    return;
  }

  if (typeof value !== 'object') return;

  const node = value as Record<string, unknown>;

  const installmentCount = toNumber(node.installmentCount);
  const installmentValue = toNumber(node.installmentValue);
  const totalValue = toNumber(node.totalValue);

  if (installmentCount && installmentCount > 0) {
    const resolvedInstallmentValue = installmentValue ?? (totalValue ? totalValue / installmentCount : null);
    const resolvedTotalValue = totalValue ?? (installmentValue ? installmentValue * installmentCount : null);

    if (resolvedInstallmentValue && resolvedTotalValue) {
      out.push({
        installmentCount,
        installmentValue: resolvedInstallmentValue,
        totalValue: resolvedTotalValue,
      });
    }
  }

  for (const nested of Object.values(node)) {
    collectSimulationCandidates(nested, out);
  }
}

export async function findOrCreateCustomer(
  name: string,
  email: string,
  cpfCnpj: string,
): Promise<AsaasCustomer> {
  const clean = cpfCnpj.replace(/\D/g, '');
  const search = await client.get<{ data: AsaasCustomer[] }>('/customers', {
    params: { cpfCnpj: clean },
  });
  if (search.data.data.length > 0) return search.data.data[0];

  const { data } = await client.post<AsaasCustomer>('/customers', {
    name,
    email,
    cpfCnpj: clean,
  });
  return data;
}

export async function createPixPayment(
  customerId: string,
  value: number,
  description: string,
): Promise<AsaasPayment> {
  const due = new Date();
  due.setDate(due.getDate() + 1);
  const dueDate = due.toISOString().split('T')[0];

  const { data } = await client.post<AsaasPayment>('/payments', {
    customer: customerId,
    billingType: 'PIX',
    dueDate,
    value,
    description,
  });
  return data;
}

export async function createBoletoPayment(
  customerId: string,
  value: number,
  description: string,
): Promise<AsaasPayment> {
  const due = new Date();
  due.setDate(due.getDate() + 3);
  const dueDate = due.toISOString().split('T')[0];

  const { data } = await client.post<AsaasPayment>('/payments', {
    customer: customerId,
    billingType: 'BOLETO',
    dueDate,
    value,
    description,
  });
  return data;
}

export async function createCreditCardPayment(
  customerId: string,
  value: number,
  description: string,
  cardData: CreditCardData,
  holderInfo: CreditCardHolderInfo,
  installments: number = 1,
): Promise<AsaasPayment> {
  const today = new Date().toISOString().split('T')[0];
  const installmentValue = Number((value / installments).toFixed(2));

  const payload: Record<string, unknown> = {
    customer: customerId,
    billingType: 'CREDIT_CARD',
    dueDate: today,
    value,
    description,
    creditCard: cardData,
    creditCardHolderInfo: holderInfo,
  };

  if (installments > 1) {
    payload.installmentCount = installments;
    payload.installmentValue = installmentValue;
  }

  const { data } = await client.post<AsaasPayment>('/payments', payload);
  return data;
}

export async function getPaymentLimits(): Promise<{ maxInstallmentCount?: number }> {
  const { data } = await client.get<Record<string, unknown>>('/payments/limits');

  const direct = toNumber((data as Record<string, unknown>).maxInstallmentCount);
  if (direct && direct > 0) {
    return { maxInstallmentCount: direct };
  }

  const nested = [] as InstallmentSimulation[];
  collectSimulationCandidates(data, nested);
  const maxFromNested = nested.reduce((max, row) => Math.max(max, row.installmentCount), 0);
  if (maxFromNested > 0) {
    return { maxInstallmentCount: maxFromNested };
  }

  return {};
}

export async function simulateInstallments(
  value: number,
  installmentCount: number,
): Promise<InstallmentSimulation | null> {
  const body = {
    value,
    installmentCount,
    billingTypes: ['CREDIT_CARD'],
  };

  const { data } = await client.post<Record<string, unknown>>('/payments/simulate', body);
  const found: InstallmentSimulation[] = [];
  collectSimulationCandidates(data, found);

  const preferred = found.find((row) => row.installmentCount === installmentCount);
  if (preferred) return preferred;

  return found[0] ?? null;
}

export async function getPixQrCode(paymentId: string): Promise<PixQrCode> {
  let lastError: unknown;

  // Asaas may take a few seconds to make the PIX QR code available after payment creation.
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const { data } = await client.get<PixQrCode>(`/payments/${paymentId}/pixQrCode`);
      if (data?.encodedImage && data?.payload) {
        return data;
      }
    } catch (error) {
      lastError = error;

      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      // Retry transient unavailability statuses from Asaas.
      if (status !== 400 && status !== 404 && status !== 429) {
        throw error;
      }
    }

    await wait(700 * attempt);
  }

  throw lastError ?? new Error('Não foi possível obter o QR Code PIX no Asaas.');
}

export async function getBoletoData(paymentId: string): Promise<BoletoData> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const { data } = await client.get<AsaasPayment>(`/payments/${paymentId}`);
      if (data?.bankSlipUrl) {
        return {
          bankSlipUrl: data.bankSlipUrl,
          nossoNumero: data.nossoNumero ?? '',
          dueDate: data.dueDate,
        };
      }
    } catch (error) {
      lastError = error;

      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status !== 400 && status !== 404 && status !== 429) {
        throw error;
      }
    }

    await wait(700 * attempt);
  }

  throw lastError ?? new Error('Não foi possível obter os dados do boleto no Asaas.');
}