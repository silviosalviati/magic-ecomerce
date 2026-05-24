import { useState } from 'react';

interface PixConfirmationProps {
  qrCode: string;
  copyPaste: string;
  expiresAt: string | null | undefined;
  total: number;
}

function toCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PixConfirmation({ qrCode, copyPaste, expiresAt, total }: PixConfirmationProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select the text
    }
  }

  const expiryText = expiresAt
    ? new Date(expiresAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="payment-confirmation pix-confirmation">
      <div className="confirmation-icon">⚡</div>
      <h3 className="confirmation-title">PIX gerado com sucesso!</h3>
      <p className="confirmation-subtitle">
        Total: <strong>{toCurrency(total)}</strong>
        {expiryText && <> · Válido até {expiryText}</>}
      </p>

      <div className="pix-qr-wrap">
        <img
          className="pix-qr"
          src={`data:image/png;base64,${qrCode}`}
          alt="QR Code PIX"
        />
      </div>

      <p className="pix-instruction">
        Abra o app do seu banco, escolha pagar via PIX e escaneie o QR Code acima.
      </p>

      <p className="pix-copy-label">Ou copie o código PIX</p>

      <div
        className="pix-code-box"
        onClick={handleCopy}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
        title="Clique para copiar"
        aria-label="Código PIX — clique para copiar"
      >
        {copyPaste}
      </div>

      <button type="button" className="primary-btn pix-copy-btn" onClick={handleCopy}>
        {copied ? '✓ Código copiado!' : 'Copiar código PIX'}
      </button>

      <p className="confirmation-note">
        Após o pagamento você receberá a confirmação por e-mail.
      </p>
    </div>
  );
}
