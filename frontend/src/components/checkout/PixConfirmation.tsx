import { useState } from 'react';
import { formatCurrencyBRL } from '../../lib/numberFormat';

interface PixConfirmationProps {
  qrCode: string;
  copyPaste: string;
  expiresAt: string | null | undefined;
  total: number;
}

function toCurrency(value: number): string {
  return formatCurrencyBRL(value);
}

export function PixConfirmation({ qrCode, copyPaste, expiresAt, total }: PixConfirmationProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select text
    }
  }

  const expiryText = expiresAt
    ? new Date(expiresAt).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div className="payment-confirmation pix-confirmation">

      <div className="confirm-header">
        <div className="confirm-icon confirm-icon--success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h3 className="confirmation-title">PIX gerado com sucesso</h3>
          <p className="confirmation-subtitle">
            Total: <strong>{toCurrency(total)}</strong>
            {expiryText && <span className="confirm-expiry"> · Válido até {expiryText}</span>}
          </p>
        </div>
      </div>

      <div className="pix-qr-wrap">
        <div className="pix-qr-frame">
          <img
            className="pix-qr"
            src={`data:image/png;base64,${qrCode}`}
            alt="QR Code PIX"
          />
        </div>
        <p className="pix-instruction">
          Abra o app do seu banco e escaneie o QR Code para pagar
        </p>
      </div>

      <div className="pix-copy-section">
        <p className="pix-copy-label">Ou use o código Pix Copia e Cola</p>
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
        <button type="button" className="pix-copy-btn" onClick={handleCopy}>
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Código copiado
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar código PIX
            </>
          )}
        </button>
      </div>

      <p className="confirmation-note">
        Após o pagamento você receberá a confirmação por e-mail.
      </p>
    </div>
  );
}
