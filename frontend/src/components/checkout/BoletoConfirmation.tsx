import { useState } from 'react';
import { formatCurrencyBRL } from '../../lib/numberFormat';

interface BoletoConfirmationProps {
  boletoUrl: string;
  boletoBarcode: string | undefined;
  boletoDueDate: string | undefined;
  total: number;
}

function toCurrency(value: number): string {
  return formatCurrencyBRL(value);
}

export function BoletoConfirmation({ boletoUrl, boletoBarcode, boletoDueDate, total }: BoletoConfirmationProps) {
  const [copied, setCopied] = useState(false);

  const dueDateText = boletoDueDate
    ? new Date(boletoDueDate).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : null;

  async function handleCopy() {
    if (!boletoBarcode) return;
    try {
      await navigator.clipboard.writeText(boletoBarcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="payment-confirmation boleto-confirmation">

      <div className="confirm-header">
        <div className="confirm-icon confirm-icon--success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h3 className="confirmation-title">Boleto gerado</h3>
          <p className="confirmation-subtitle">
            Total: <strong>{toCurrency(total)}</strong>
            {dueDateText && <span className="confirm-expiry"> · Vence em {dueDateText}</span>}
          </p>
        </div>
      </div>

      <a
        href={boletoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="boleto-open-btn"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Abrir boleto PDF
      </a>

      {boletoBarcode && (
        <div className="pix-copy-section">
          <p className="pix-copy-label">Linha digitável</p>
          <div
            className="pix-code-box"
            onClick={handleCopy}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
            title="Clique para copiar"
          >
            {boletoBarcode}
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
                Copiar linha digitável
              </>
            )}
          </button>
        </div>
      )}

      <div className="boleto-instructions">
        <p className="boleto-instruction-title">Como pagar</p>
        <ul>
          <li>Abra o PDF e pague em qualquer banco ou app bancário</li>
          <li>Cole a linha digitável diretamente no app do seu banco</li>
          <li>O prazo de compensação é de até 3 dias úteis</li>
        </ul>
      </div>

      <p className="confirmation-note">
        Após a compensação você receberá a confirmação por e-mail.
      </p>
    </div>
  );
}
