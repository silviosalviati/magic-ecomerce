import axios from 'axios';

const ORIGIN_CEP = '06126050';
const WEIGHT_PER_ITEM_KG = 0.2;
const MELHOR_ENVIOS_API = 'https://melhorenvios.com.br/api/v2';
const SERVICES = '1,2,17'; // PAC, SEDEX, Jadlog .Package

export interface ShippingRateOption {
  id: string;
  name: string;
  company: string;
  price: number;
  deliveryDays: number | null;
  deliveryRange: { min: number; max: number } | null;
}

interface MelhorEnviosResponse {
  id: number;
  name: string;
  price: string | null;
  error?: string | null;
  delivery_time?: number;
  delivery_range?: { min: number; max: number };
  company?: { name: string } | string;
}

function buildPackage(quantity: number) {
  const weight = quantity * WEIGHT_PER_ITEM_KG;
  const height = Math.max(5, quantity * 2);
  return { weight, width: 25, height, length: 30 };
}

export async function calculateShippingRates(
  destinationCep: string,
  quantity: number,
): Promise<ShippingRateOption[]> {
  const token = process.env.MELHOR_ENVIOS_TOKEN;
  if (!token) throw new Error('MELHOR_ENVIOS_TOKEN não configurado.');

  const { data } = await axios.post<MelhorEnviosResponse[]>(
    `${MELHOR_ENVIOS_API}/me/shipment/calculate`,
    {
      from: { postal_code: ORIGIN_CEP },
      to: { postal_code: destinationCep },
      package: buildPackage(quantity),
      options: { receipt: false, own_hand: false },
      services: SERVICES,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'VistamagicApp/1.0 (contato@vistamagic.com.br)',
      },
      timeout: 10000,
    },
  );

  return (Array.isArray(data) ? data : [])
    .filter((s) => !s.error && s.price != null)
    .map((s) => ({
      id: String(s.id),
      name: s.name,
      company: typeof s.company === 'object' ? (s.company?.name ?? '') : (s.company ?? ''),
      price: Number(s.price),
      deliveryDays: s.delivery_time ?? null,
      deliveryRange: s.delivery_range ?? null,
    }));
}