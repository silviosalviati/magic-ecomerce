import axios from 'axios';

const ASAAS_BASE = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3';
const ASAAS_KEY = process.env.ASAAS_API_KEY ?? '';

const client = axios.create({
  baseURL: ASAAS_BASE,
  headers: { access_token: ASAAS_KEY },
  timeout: 15000,
});

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
}

export interface PixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
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

export async function getPixQrCode(paymentId: string): Promise<PixQrCode> {
  const { data } = await client.get<PixQrCode>(`/payments/${paymentId}/pixQrCode`);
  return data;
}
