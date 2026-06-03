import nodemailer from 'nodemailer';

class MailerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailerUnavailableError';
  }
}

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

function assertMailerAvailable(): void {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user || !pass) {
    throw new MailerUnavailableError('Envio de e-mail indisponível: SMTP_USER/SMTP_PASS não configurados.');
  }
}

export function isMailerConfigured(): boolean {
  return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

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

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG     = '#080808';
const CARD   = '#0F0F0F';
const CARD2  = '#141414';
const BORDER = '#1E1E1E';
const BORD2  = '#252525';
const ACCENT = '#E8B4B0';
const TEXT   = '#F0E8E4';
const MUTED  = '#9A8D87';
const FAINT  = '#6B5F5C';
const GHOST  = '#3D3330';
const SERIF  = "Georgia,'Times New Roman',Times,serif";
const SANS   = 'Arial,Helvetica,sans-serif';
const MONO   = "'Courier New',Courier,monospace";

// ─── Layout helpers ───────────────────────────────────────────────────────────
function emailHeader(): string {
  return `
  <tr>
    <td style="background:${CARD};padding:30px 40px 22px;text-align:center;border:1px solid ${BORDER};border-bottom:none;">
      <p style="margin:0;font-family:${SERIF};font-size:18px;font-weight:400;letter-spacing:8px;color:${TEXT};text-transform:uppercase;">VISTA MAGIC</p>
      <div style="width:28px;height:1px;background:${ACCENT};margin:10px auto 0;"></div>
    </td>
  </tr>`;
}

function emailFooter(note?: string): string {
  return `
  <tr>
    <td style="background:${BG};padding:26px 40px 30px;text-align:center;border:1px solid ${BORDER};border-top:1px solid ${BORDER};">
      ${note ? `<p style="margin:0 0 16px;font-family:${SANS};font-size:12px;color:${FAINT};line-height:1.6;">${note}</p><div style="width:24px;height:1px;background:${BORDER};margin:0 auto 16px;"></div>` : ''}
      <p style="margin:0 0 5px;font-family:${SERIF};font-size:10px;letter-spacing:4px;color:${GHOST};text-transform:uppercase;">Vista Magic</p>
      <p style="margin:0 0 4px;font-family:${SANS};font-size:11px;color:${GHOST};">vistamagic.com.br</p>
      <p style="margin:0;font-family:${SANS};font-size:10px;color:${GHOST};">&copy; 2024 Vista Magic &middot; Todos os direitos reservados</p>
    </td>
  </tr>`;
}

function emailShell(rows: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Vista Magic</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${BG}" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;width:100%;">
          ${rows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Store notification (internal) ───────────────────────────────────────────
export async function sendStoreNotification(data: OrderEmailData): Promise<void> {
  const storeEmail = process.env.STORE_EMAIL;
  if (!storeEmail) return;
  assertMailerAvailable();

  const orderRef = `#${data.orderId.slice(0, 8).toUpperCase()}`;

  const itemsHtml = data.items.map((item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${BORD2};font-family:${SANS};font-size:13px;color:${TEXT};">${escapeHtml(item.productName || item.variantId)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${BORD2};font-family:${SANS};font-size:13px;color:${MUTED};">${escapeHtml(item.color || '—')} / ${escapeHtml(item.size || '—')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${BORD2};font-family:${SANS};font-size:13px;color:${MUTED};text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${BORD2};font-family:${SANS};font-size:13px;color:${TEXT};text-align:right;white-space:nowrap;">${formatCurrency(Number(item.priceAtPurchase) * item.quantity)}</td>
    </tr>`).join('');

  const addressHtml = data.address?.street
    ? `<p style="margin:0;padding:14px 16px;background:${BG};border:1px solid ${BORDER};font-family:${SANS};font-size:13px;color:${TEXT};line-height:1.6;">
        <span style="color:${MUTED};">Endereço: </span>${escapeHtml(data.address.street)}, ${escapeHtml(data.address.number || '')}${data.address.complement ? ` &mdash; ${escapeHtml(data.address.complement)}` : ''}, ${escapeHtml(data.address.neighborhood || '')}, ${escapeHtml(data.address.city || '')}/${escapeHtml(data.address.state || '')} &mdash; CEP&nbsp;${escapeHtml(data.address.zip || '')}
      </p>`
    : '';

  const html = emailShell(`
    ${emailHeader()}
    <tr>
      <td style="background:${CARD};border:1px solid ${BORDER};border-top:none;padding:32px 40px 36px;">

        <p style="margin:0 0 4px;font-family:${SANS};font-size:11px;letter-spacing:2px;color:${FAINT};text-transform:uppercase;">Nova venda aprovada</p>
        <p style="margin:0 0 28px;font-family:${SERIF};font-size:28px;font-weight:400;color:${ACCENT};">${formatCurrency(data.total)}</p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid ${BORDER};width:38%;">
              <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;">Pedido</p>
            </td>
            <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${BORDER};">
              <p style="margin:0;font-family:${MONO};font-size:13px;color:${TEXT};">${orderRef}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid ${BORDER};">
              <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;">Cliente</p>
            </td>
            <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${BORDER};">
              <p style="margin:0;font-family:${SANS};font-size:13px;color:${TEXT};">${escapeHtml(data.customerName)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid ${BORDER};">
              <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;">E-mail</p>
            </td>
            <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${BORDER};">
              <p style="margin:0;font-family:${SANS};font-size:13px;color:${TEXT};">${escapeHtml(data.customerEmail)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid ${BORDER};">
              <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;">CPF</p>
            </td>
            <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${BORDER};">
              <p style="margin:0;font-family:${MONO};font-size:13px;color:${TEXT};">${escapeHtml(data.customerCpf)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;${addressHtml ? '' : 'border-bottom:none;'}">
              <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;">Pagamento</p>
            </td>
            <td style="padding:10px 0 10px 16px;${addressHtml ? '' : 'border-bottom:none;'}">
              <p style="margin:0;font-family:${SANS};font-size:13px;color:${TEXT};">${PAYMENT_LABELS[data.paymentMethod] || escapeHtml(data.paymentMethod)}</p>
            </td>
          </tr>
        </table>

        ${addressHtml ? `<div style="margin-bottom:24px;">${addressHtml}</div>` : ''}

        <p style="margin:0 0 10px;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;">Itens do pedido</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${BORDER};">
          <thead>
            <tr style="background:${CARD2};">
              <th style="padding:10px 12px;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;text-align:left;font-weight:400;">Produto</th>
              <th style="padding:10px 12px;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;text-align:left;font-weight:400;">Variante</th>
              <th style="padding:10px 12px;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;text-align:center;font-weight:400;">Qtd</th>
              <th style="padding:10px 12px;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;text-align:right;font-weight:400;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr style="background:${CARD2};">
              <td colspan="3" style="padding:14px 12px;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;text-align:right;">Total</td>
              <td style="padding:14px 12px;font-family:${SERIF};font-size:20px;font-weight:400;color:${ACCENT};text-align:right;white-space:nowrap;">${formatCurrency(data.total)}</td>
            </tr>
          </tfoot>
        </table>

      </td>
    </tr>
    ${emailFooter()}
  `);

  await transporter.sendMail({
    from: `"Vista Magic" <${process.env.SMTP_USER}>`,
    to: storeEmail,
    subject: `Nova venda · ${data.customerName} · ${formatCurrency(data.total)}`,
    html,
  });
}

// ─── Customer order confirmation ──────────────────────────────────────────────
export async function sendCustomerConfirmation(data: OrderEmailData): Promise<void> {
  assertMailerAvailable();

  const trackUrl = buildFrontendUrl('/rastrear-pedido');
  const orderRef = `#${data.orderId.slice(0, 8).toUpperCase()}`;
  const firstName = escapeHtml(data.customerName.split(' ')[0]);
  const paymentLabel = PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod;

  const itemsHtml = data.items.map((item) => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid ${BORD2};vertical-align:top;">
        <p style="margin:0 0 4px;font-family:${SANS};font-size:14px;color:${TEXT};">${escapeHtml(item.productName || item.variantId)}</p>
        <p style="margin:0;font-family:${SANS};font-size:12px;color:${MUTED};">${escapeHtml(item.color || '—')} &middot; ${escapeHtml(item.size || '—')}</p>
      </td>
      <td style="padding:16px 0 16px 20px;border-bottom:1px solid ${BORD2};vertical-align:top;text-align:center;white-space:nowrap;">
        <p style="margin:0;font-family:${SANS};font-size:13px;color:${FAINT};">&times;&nbsp;${item.quantity}</p>
      </td>
      <td style="padding:16px 0 16px 20px;border-bottom:1px solid ${BORD2};vertical-align:top;text-align:right;white-space:nowrap;">
        <p style="margin:0;font-family:${SANS};font-size:13px;color:${TEXT};">${formatCurrency(Number(item.priceAtPurchase) * item.quantity)}</p>
      </td>
    </tr>`).join('');

  const html = emailShell(`
    ${emailHeader()}

    <!-- Hero -->
    <tr>
      <td style="background:linear-gradient(160deg,#1A1210 0%,#1E1614 55%,#1A1210 100%);border:1px solid ${BORDER};border-top:none;border-bottom:none;padding:40px 40px 36px;">
        <p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:2px;color:${FAINT};text-transform:uppercase;">Confirmação de pedido</p>
        <h1 style="margin:0 0 6px;font-family:${SERIF};font-size:30px;font-weight:400;color:${TEXT};line-height:1.3;">Obrigada pela<br>sua compra, <em>${firstName}</em>.</h1>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;">
          <tr>
            <td style="background:#1A1A1A;border:1px solid ${BORD2};padding:5px 12px;">
              <span style="font-family:${MONO};font-size:12px;letter-spacing:1px;color:${MUTED};">${orderRef}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Payment method -->
    <tr>
      <td style="background:${CARD};border:1px solid ${BORDER};border-top:none;border-bottom:none;padding:24px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-left:2px solid ${ACCENT};padding-left:14px;">
              <p style="margin:0 0 3px;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;">Método de pagamento</p>
              <p style="margin:0;font-family:${SANS};font-size:14px;color:${TEXT};">${paymentLabel}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Items -->
    <tr>
      <td style="background:${CARD};border:1px solid ${BORDER};border-top:none;padding:0 40px 0;">
        <div style="border-top:1px solid ${BORDER};padding-top:20px;">
          <p style="margin:0 0 0;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;padding-bottom:4px;">Itens do pedido</p>
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${itemsHtml}
          <tr>
            <td colspan="2" style="padding:20px 0 8px;text-align:right;">
              <p style="margin:0;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;">Total do pedido</p>
            </td>
            <td style="padding:20px 0 8px 20px;text-align:right;white-space:nowrap;">
              <p style="margin:0;font-family:${SERIF};font-size:24px;font-weight:400;color:${ACCENT};">${formatCurrency(data.total)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="background:${CARD};border:1px solid ${BORDER};border-top:none;padding:28px 40px 36px;">
        <div style="border-top:1px solid ${BORDER};padding-top:28px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td bgcolor="${ACCENT}">
                <a href="${trackUrl}" style="display:inline-block;padding:15px 36px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:2px;color:#0A0A0A;text-decoration:none;text-transform:uppercase;">ACOMPANHAR PEDIDO</a>
              </td>
            </tr>
          </table>
          <p style="margin:22px 0 0;font-family:${SANS};font-size:12px;color:${FAINT};line-height:1.6;">
            Dúvidas? Fale conosco pelo WhatsApp:
            <a href="https://wa.me/5511969707136" style="color:${MUTED};text-decoration:none;">(11)&nbsp;96970&#8209;7136</a>
          </p>
        </div>
      </td>
    </tr>

    ${emailFooter('Você receberá atualizações sobre seu pedido por e-mail.')}
  `);

  await transporter.sendMail({
    from: `"Vista Magic" <${process.env.SMTP_USER}>`,
    to: data.customerEmail,
    subject: `Pedido confirmado ${orderRef} — Vista Magic`,
    html,
  });
}

// ─── Pickup contact (retirada na loja) ───────────────────────────────────────
export async function sendPickupContactEmail(params: {
  customerName: string;
  customerEmail: string;
  orderId: string;
  total: number;
}): Promise<void> {
  assertMailerAvailable();

  const orderRef = `#${params.orderId.slice(0, 8).toUpperCase()}`;
  const firstName = escapeHtml(params.customerName.split(' ')[0]);

  const html = emailShell(`
    ${emailHeader()}

    <!-- Hero -->
    <tr>
      <td style="background:linear-gradient(160deg,#1A1210 0%,#1E1614 55%,#1A1210 100%);border:1px solid ${BORDER};border-top:none;border-bottom:none;padding:40px 40px 36px;">
        <p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:2px;color:${FAINT};text-transform:uppercase;">Pedido confirmado · Retirada</p>
        <h1 style="margin:0 0 6px;font-family:${SERIF};font-size:30px;font-weight:400;color:${TEXT};line-height:1.3;">Obrigada, <em>${firstName}</em>.<br>Vamos combinar a retirada.</h1>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;">
          <tr>
            <td style="background:#1A1A1A;border:1px solid ${BORD2};padding:5px 12px;">
              <span style="font-family:${MONO};font-size:12px;letter-spacing:1px;color:${MUTED};">${orderRef}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background:${CARD};border:1px solid ${BORDER};border-top:none;padding:32px 40px 36px;">
        <p style="margin:0 0 24px;font-family:${SANS};font-size:14px;line-height:1.7;color:${MUTED};">
          Seu pedido no valor de <strong style="color:${TEXT};">${formatCurrency(params.total)}</strong> foi registrado. Entre em contato para combinarmos o horário e local de retirada:
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${BORDER};margin-bottom:24px;">
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid ${BORDER};">
              <p style="margin:0 0 4px;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;">E-mail</p>
              <a href="mailto:contato@vistamagic.com.br" style="font-family:${SANS};font-size:14px;color:${ACCENT};text-decoration:none;">contato@vistamagic.com.br</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 4px;font-family:${SANS};font-size:11px;letter-spacing:1px;color:${FAINT};text-transform:uppercase;">WhatsApp</p>
              <a href="https://wa.me/5511969707136" style="font-family:${SANS};font-size:14px;color:${ACCENT};text-decoration:none;">(11) 96970-7136</a>
            </td>
          </tr>
        </table>

        <p style="margin:0;font-family:${SANS};font-size:12px;color:${GHOST};line-height:1.6;">
          Mencione o pedido <strong style="color:${FAINT};">${orderRef}</strong> ao entrar em contato.
        </p>
      </td>
    </tr>

    ${emailFooter()}
  `);

  await transporter.sendMail({
    from: `"Vista Magic" <${process.env.SMTP_USER}>`,
    to: params.customerEmail,
    subject: `Pedido ${orderRef} confirmado — Combinar retirada · Vista Magic`,
    html,
  });
}

// ─── Email verification / account activation ──────────────────────────────────
export async function sendEmailVerification(params: {
  email: string;
  name: string;
  token: string;
}): Promise<void> {
  assertMailerAvailable();

  const verifyUrl = buildFrontendUrl(`/verificar-email?token=${encodeURIComponent(params.token)}`);
  const firstName = escapeHtml(params.name.split(' ')[0]);

  const html = emailShell(`
    ${emailHeader()}

    <!-- Hero -->
    <tr>
      <td style="background:linear-gradient(160deg,#1A1210 0%,#1E1614 55%,#1A1210 100%);border:1px solid ${BORDER};border-top:none;border-bottom:none;padding:40px 40px 36px;">
        <p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:2px;color:${FAINT};text-transform:uppercase;">Ativação de conta</p>
        <h1 style="margin:0;font-family:${SERIF};font-size:30px;font-weight:400;color:${TEXT};line-height:1.3;">Bem-vinda(o),<br><em>${firstName}</em>.</h1>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background:${CARD};border:1px solid ${BORDER};border-top:none;padding:32px 40px 36px;">
        <p style="margin:0 0 12px;font-family:${SANS};font-size:15px;line-height:1.7;color:${TEXT};">
          Sua conta na <strong>Vista Magic</strong> foi criada com sucesso.
        </p>
        <p style="margin:0 0 28px;font-family:${SANS};font-size:14px;line-height:1.7;color:${MUTED};">
          Para garantir a segurança da sua conta e começar a explorar nossa coleção exclusiva, confirme seu endereço de e-mail.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td bgcolor="${ACCENT}">
              <a href="${verifyUrl}" style="display:inline-block;padding:15px 40px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:2px;color:#0A0A0A;text-decoration:none;text-transform:uppercase;">CONFIRMAR E-MAIL</a>
            </td>
          </tr>
        </table>

        <div style="margin-top:32px;border-top:1px solid ${BORDER};padding-top:24px;">
          <p style="margin:0 0 10px;font-family:${SANS};font-size:12px;color:${FAINT};line-height:1.6;">
            Este link expira em <strong style="color:${MUTED};">24 horas</strong>. Se o botão não funcionar, copie e cole este endereço no seu navegador:
          </p>
          <p style="margin:0;padding:13px 16px;background:${BG};border:1px solid ${BORDER};font-family:${MONO};font-size:11px;color:${MUTED};word-break:break-all;line-height:1.7;">${verifyUrl}</p>
          <p style="margin:18px 0 0;font-family:${SANS};font-size:12px;color:${GHOST};">
            Não criou esta conta? Pode ignorar este e-mail com segurança.
          </p>
        </div>
      </td>
    </tr>

    ${emailFooter()}
  `);

  await transporter.sendMail({
    from: `"Vista Magic" <${process.env.SMTP_USER}>`,
    to: params.email,
    subject: 'Confirme seu e-mail — Vista Magic',
    text: `Olá, ${params.name}.\n\nPara ativar sua conta na Vista Magic, confirme seu e-mail:\n${verifyUrl}\n\nEste link expira em 24 horas.\n\nSe você não criou esta conta, ignore este e-mail.`,
    html,
  });
}

// ─── Password reset ───────────────────────────────────────────────────────────
export async function sendPasswordResetEmail(params: {
  email: string;
  name: string;
  token: string;
}): Promise<void> {
  assertMailerAvailable();

  const resetUrl = buildFrontendUrl(`/redefinir-senha?token=${encodeURIComponent(params.token)}`);
  const firstName = escapeHtml(params.name.split(' ')[0]);

  const html = emailShell(`
    ${emailHeader()}

    <!-- Hero -->
    <tr>
      <td style="background:linear-gradient(160deg,#1A1210 0%,#1E1614 55%,#1A1210 100%);border:1px solid ${BORDER};border-top:none;border-bottom:none;padding:40px 40px 36px;">
        <p style="margin:0 0 6px;font-family:${SANS};font-size:11px;letter-spacing:2px;color:${FAINT};text-transform:uppercase;">Segurança da conta</p>
        <h1 style="margin:0;font-family:${SERIF};font-size:30px;font-weight:400;color:${TEXT};line-height:1.3;">Redefinir<br>sua senha</h1>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background:${CARD};border:1px solid ${BORDER};border-top:none;padding:32px 40px 36px;">
        <p style="margin:0 0 12px;font-family:${SANS};font-size:15px;line-height:1.7;color:${TEXT};">
          Olá, <strong>${firstName}</strong>.
        </p>
        <p style="margin:0 0 28px;font-family:${SANS};font-size:14px;line-height:1.7;color:${MUTED};">
          Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong style="color:${TEXT};">1 hora</strong>.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td bgcolor="${ACCENT}">
              <a href="${resetUrl}" style="display:inline-block;padding:15px 40px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:2px;color:#0A0A0A;text-decoration:none;text-transform:uppercase;">CRIAR NOVA SENHA</a>
            </td>
          </tr>
        </table>

        <div style="margin-top:32px;border-top:1px solid ${BORDER};padding-top:24px;">
          <p style="margin:0 0 10px;font-family:${SANS};font-size:12px;color:${FAINT};line-height:1.6;">
            Se o botão não funcionar, copie e cole este endereço no seu navegador:
          </p>
          <p style="margin:0;padding:13px 16px;background:${BG};border:1px solid ${BORDER};font-family:${MONO};font-size:11px;color:${MUTED};word-break:break-all;line-height:1.7;">${resetUrl}</p>
          <p style="margin:18px 0 0;font-family:${SANS};font-size:12px;color:${GHOST};">
            Se você não solicitou esta redefinição, ignore este e-mail. Sua senha permanece inalterada.
          </p>
        </div>
      </td>
    </tr>

    ${emailFooter()}
  `);

  await transporter.sendMail({
    from: `"Vista Magic" <${process.env.SMTP_USER}>`,
    to: params.email,
    subject: 'Redefinição de senha — Vista Magic',
    html,
  });
}
