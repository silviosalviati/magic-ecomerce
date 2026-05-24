import { useState } from 'react';

interface BoletoConfirmationProps {
  boletoUrl: string;
  boletoBarcode: string | undefined;
  boletoDueDate: string | undefined;
  total: number;
}

function toCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function BoletoConfirmation({ boletoUrl, boletoBarcode, boletoDueDate, total }: BoletoConfirmationProps) {
  const [copied, setCopied] = useState(false);

  const dueDateText = boletoDueDate
    ? new Date(boletoDueDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
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
      <div className="confirmation-icon">📄</div>
      <h3 className="confirmation-title">Boleto gerado!</h3>
      <p className="confirmation-subtitle">
        Total: <strong>{toCurrency(total)}</strong>
        {dueDateText && <> · Vence em {dueDateText}</>}
      </p>

      <a
        href={boletoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="primary-btn boleto-open-btn"
      >
        📥 Abrir boleto PDF
      </a>

      {boletoBarcode && (
        <>
          <p className="pix-copy-label">Linha digitável</p>
          <div
            className="pix-code-box boleto-barcode"
            onClick={handleCopy}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
            title="Clique para copiar"
          >
            {boletoBarcode}
          </div>
          <button type="button" className="primary-btn pix-copy-btn" onClick={handleCopy}>
            {copied ? '✓ Código copiado!' : 'Copiar linha digitável'}
          </button>
        </>
      )}

      <div className="boleto-instructions">
        <p className="boleto-instruction-title">Como pagar:</p>
        <ul>
          <li>Abra o PDF e pague em qualquer banco ou app bancário</li>
          <li>Cole a linha digitável no app do seu banco</li>
          <li>O prazo de compensação é de até 3 dias úteis</li>
        </ul>
      </div>

      <p className="confirmation-note">
        Após a compensação você receberá a confirmação por e-mail.
      </p>
    </div>
  );
}
