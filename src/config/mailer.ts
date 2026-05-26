import nodemailer from 'nodemailer';

function toBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpSecure = toBoolean(process.env.SMTP_SECURE) ?? smtpPort === 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function formatCurrency(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface OrderItem {
  variantId: string;
  quantity: number;
  priceAtPurchase: number | string;
  productName?: string;
  color?: string;
  size?: string;
}

interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerCpf: string;
  paymentMethod: string;
  total: number | string;
  items: OrderItem[];
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto Bancário',
  CREDIT_CARD: 'Cartão de Crédito',
};

function buildFrontendUrl(pathname: string): string {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://vistamagic.com.br').replace(/\/$/, '');
  return `${frontendUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendStoreNotification(data: OrderEmailData): Promise<void> {
  const storeEmail = process.env.STORE_EMAIL;
  if (!storeEmail || !process.env.SMTP_USER) return;

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #2a2a2a">${item.productName || item.variantId}</td>
        <td style="padding:8px;border-bottom:1px solid #2a2a2a">${item.color || '—'} / ${item.size || '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #2a2a2a;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #2a2a2a;text-align:right">${formatCurrency(Number(item.priceAtPurchase) * item.quantity)}</td>
      </tr>`
    )
    .join('');

  const addressHtml = data.address?.street
    ? `<p style="margin:4px 0"><strong>Endereço:</strong> ${data.address.street}, ${data.address.number}${data.address.complement ? ` — ${data.address.complement}` : ''}, ${data.address.neighborhood || ''}, ${data.address.city || ''}/${data.address.state || ''} — CEP ${data.address.zip || ''}</p>`
    : '';

  await transporter.sendMail({
    from: `"MAGI.C Loja" <${process.env.SMTP_USER}>`,
    to: storeEmail,
    subject: `🛍️ Nova venda aprovada — ${formatCurrency(data.total)}`,
    html: `
      <div style="font-family:sans-serif;background:#0d0d0d;color:#f5ede8;padding:32px;max-width:600px;margin:auto">
        <h1 style="font-size:22px;margin:0 0 24px;color:#e8b4b0">✅ Nova venda aprovada!</h1>
        <p style="margin:4px 0"><strong>Pedido:</strong> #${data.orderId.slice(0, 8).toUpperCase()}</p>
        <p style="margin:4px 0"><strong>Cliente:</strong> ${data.customerName}</p>
        <p style="margin:4px 0"><strong>E-mail:</strong> ${data.customerEmail}</p>
        <p style="margin:4px 0"><strong>CPF:</strong> ${data.customerCpf}</p>
        <p style="margin:4px 0"><strong>Pagamento:</strong> ${PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod}</p>
        ${addressHtml}
        <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px">
          <thead>
            <tr style="background:#1a1a1a">
              <th style="padding:8px;text-align:left">Produto</th>
              <th style="padding:8px;text-align:left">Variante</th>
              <th style="padding:8px;text-align:center">Qtd</th>
              <th style="padding:8px;text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:10px 8px;text-align:right;font-weight:bold">Total</td>
              <td style="padding:10px 8px;text-align:right;font-weight:bold;color:#e8b4b0;font-size:16px">${formatCurrency(data.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`,
  });
}

export async function sendCustomerConfirmation(data: OrderEmailData): Promise<void> {
  if (!process.env.SMTP_USER) return;

  const frontendUrl = process.env.FRONTEND_URL || 'https://vistamagic.com.br';

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #2a2a2a">${item.productName || item.variantId}</td>
        <td style="padding:8px;border-bottom:1px solid #2a2a2a">${item.color || '—'} / ${item.size || '—'}</td>
        <td style="padding:8px;border-bottom:1px solid #2a2a2a;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #2a2a2a;text-align:right">${formatCurrency(Number(item.priceAtPurchase) * item.quantity)}</td>
      </tr>`
    )
    .join('');

  await transporter.sendMail({
    from: `"MAGI.C" <${process.env.SMTP_USER}>`,
    to: data.customerEmail,
    subject: `Seu pedido foi confirmado! ✨ — MAGI.C`,
    html: `
      <div style="font-family:sans-serif;background:#0d0d0d;color:#f5ede8;padding:32px;max-width:600px;margin:auto">
        <h1 style="font-size:22px;margin:0 0 8px;color:#e8b4b0">Pedido confirmado!</h1>
        <p style="margin:0 0 24px;color:#a89b95">Obrigada pela sua compra, ${data.customerName.split(' ')[0]}. 🎉</p>
        <p style="margin:4px 0"><strong>Pedido:</strong> #${data.orderId.slice(0, 8).toUpperCase()}</p>
        <p style="margin:4px 0"><strong>Pagamento:</strong> ${PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px">
          <thead>
            <tr style="background:#1a1a1a">
              <th style="padding:8px;text-align:left">Produto</th>
              <th style="padding:8px;text-align:left">Variante</th>
              <th style="padding:8px;text-align:center">Qtd</th>
              <th style="padding:8px;text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:10px 8px;text-align:right;font-weight:bold">Total</td>
              <td style="padding:10px 8px;text-align:right;font-weight:bold;color:#e8b4b0;font-size:16px">${formatCurrency(data.total)}</td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top:28px;text-align:center">
          <a href="${frontendUrl}/rastrear-pedido" style="background:#e8b4b0;color:#0d0d0d;padding:12px 28px;text-decoration:none;font-weight:600;display:inline-block">
            Acompanhar meu pedido
          </a>
        </div>
        <p style="margin-top:24px;font-size:12px;color:#5a5050">Dúvidas? Fale conosco no WhatsApp: (11) 96970-7136</p>
      </div>`,
  });
}

export async function sendEmailVerification(params: {
  email: string;
  name: string;
  token: string;
}): Promise<void> {
  if (!process.env.SMTP_USER) return;

  const verifyUrl = buildFrontendUrl(`/verificar-email?token=${encodeURIComponent(params.token)}`);

  await transporter.sendMail({
    from: `"MAGI.C" <${process.env.SMTP_USER}>`,
    to: params.email,
    subject: 'Confirme seu e-mail para ativar sua conta — MAGI.C',
    html: `
      <div style="font-family:sans-serif;background:#0d0d0d;color:#f5ede8;padding:32px;max-width:600px;margin:auto">
        <h1 style="font-size:22px;margin:0 0 12px;color:#e8b4b0">Confirme seu e-mail</h1>
        <p style="margin:0 0 18px">Olá, ${escapeHtml(params.name)}. Para ativar sua conta, confirme seu e-mail clicando no botão abaixo.</p>
        <div style="margin:24px 0;text-align:center">
          <a href="${verifyUrl}" style="background:#e8b4b0;color:#0d0d0d;padding:12px 28px;text-decoration:none;font-weight:600;display:inline-block">
            Confirmar e-mail
          </a>
        </div>
        <p style="font-size:12px;color:#a89b95;word-break:break-all">Se o botão não abrir, use este link: ${verifyUrl}</p>
      </div>`,
  });
}

export async function sendPasswordResetEmail(params: {
  email: string;
  name: string;
  token: string;
}): Promise<void> {
  if (!process.env.SMTP_USER) return;

  const resetUrl = buildFrontendUrl(`/redefinir-senha?token=${encodeURIComponent(params.token)}`);

  await transporter.sendMail({
    from: `"MAGI.C" <${process.env.SMTP_USER}>`,
    to: params.email,
    subject: 'Redefinição de senha — MAGI.C',
    html: `
      <div style="font-family:sans-serif;background:#0d0d0d;color:#f5ede8;padding:32px;max-width:600px;margin:auto">
        <h1 style="font-size:22px;margin:0 0 12px;color:#e8b4b0">Redefinir sua senha</h1>
        <p style="margin:0 0 18px">Olá, ${escapeHtml(params.name)}. Recebemos uma solicitação para redefinir sua senha.</p>
        <div style="margin:24px 0;text-align:center">
          <a href="${resetUrl}" style="background:#e8b4b0;color:#0d0d0d;padding:12px 28px;text-decoration:none;font-weight:600;display:inline-block">
            Criar nova senha
          </a>
        </div>
        <p style="font-size:12px;color:#a89b95;word-break:break-all">Se o botão não abrir, use este link: ${resetUrl}</p>
      </div>`,
  });
}
