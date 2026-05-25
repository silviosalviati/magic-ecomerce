import axios from 'axios';

interface WhatsAppMessage {
  orderId: string;
  customerName: string;
  paymentMethod: string;
  total: number | string;
  itemCount: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão',
};

export async function notifyStoreWhatsApp(data: WhatsAppMessage): Promise<void> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const storeNumber = process.env.STORE_WHATSAPP_NUMBER;

  if (!instanceId || !token || !storeNumber) return;

  const total = Number(data.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const method = PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod;
  const orderId = data.orderId.slice(0, 8).toUpperCase();

  const text =
    `✅ *Nova venda aprovada — MAGI.C*\n\n` +
    `Pedido: #${orderId}\n` +
    `Cliente: ${data.customerName}\n` +
    `Itens: ${data.itemCount}\n` +
    `Pagamento: ${method}\n` +
    `*Total: ${total}*`;

  try {
    await axios.post(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      { phone: storeNumber, message: text },
      { timeout: 8000 }
    );
  } catch (err) {
    console.error('[whatsapp] Falha ao enviar notificação:', (err as Error).message);
  }
}
