import { useState } from 'react';
import type { Order } from '../types';

const STATUS_LABELS: Record<string, string> = {
  PENDING:   'Aguardando pagamento',
  PAID:      'Pagamento confirmado',
  PREPARING: 'Em preparação',
  SHIPPED:   'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  OVERDUE:   'Pagamento vencido',
  REFUNDED:  'Reembolsado',
};

const STATUS_ACCENT: Record<string, string> = {
  PENDING:   '#ffc107',
  OVERDUE:   '#ef8ba0',
  PAID:      '#7fcf9a',
  PREPARING: '#64b5f6',
  SHIPPED:   '#ce93d8',
  DELIVERED: '#7fcf9a',
  CANCELLED: '#ef8ba0',
  REFUNDED:  '#ef8ba0',
};

const STEPS = [
  { key: 'RECEIVED',  label: 'Pedido recebido' },
  { key: 'PAID',      label: 'Pagamento' },
  { key: 'PREPARING', label: 'Preparação' },
  { key: 'DELIVERED', label: 'Entrega' },
];

const STATUS_STEP_INDEX: Record<string, number> = {
  PENDING:   0,
  PAID:      1,
  PREPARING: 2,
  SHIPPED:   3,
  DELIVERED: 4,
  CANCELLED: -1,
  OVERDUE:   -1,
  REFUNDED:  -1,
};

const SHIPPING_LABELS: Record<string, string> = {
  CORREIOS: 'Correios',
  UBER:     'Uber Flash',
  PICKUP:   'Retirada na loja',
};

const PAYMENT_LABELS: Record<string, string> = {
  PIX:         'PIX',
  BOLETO:      'Boleto',
  CREDIT_CARD: 'Cartão de crédito',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatCurrency(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);

  const label  = STATUS_LABELS[order.status] || order.status;
  const accent = STATUS_ACCENT[order.status] || 'rgba(232,180,176,0.4)';
  const stepIndex = STATUS_STEP_INDEX[order.status] ?? 0;
  const isTerminal = order.status === 'CANCELLED' || order.status === 'OVERDUE' || order.status === 'REFUNDED';

  return (
    <article className="oc-card">

      {/* Left accent bar */}
      <div className="oc-accent-bar" style={{ background: accent }} aria-hidden="true" />

      <div className="oc-body">

        {/* ── TOP ROW ── */}
        <div className="oc-top">
          <div className="oc-meta">
            <span className="oc-id">#{order.id.slice(0, 8).toUpperCase()}</span>
            <span className="oc-date">{formatDate(order.createdAt)}</span>
          </div>
          <div className="oc-top-right">
            <span
              className="oc-badge"
              style={{ '--badge-accent': accent } as React.CSSProperties}
            >
              {label}
            </span>
            <span className="oc-total">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* ── STATUS STEPPER (only for normal flow) ── */}
        {!isTerminal && (
          <div className="oc-stepper" aria-label="Progresso do pedido">
            {STEPS.map((step, i) => {
              const done    = i < stepIndex;
              const current = i === stepIndex;
              return (
                <div
                  key={step.key}
                  className={`oc-step ${done ? 'oc-step--done' : ''} ${current ? 'oc-step--current' : ''}`}
                >
                  <div className="oc-step-node">
                    {done ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="oc-step-dot" />
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`oc-step-line ${done ? 'oc-step-line--done' : ''}`} aria-hidden="true" />
                  )}
                  <span className="oc-step-label">{step.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TERMINAL STATUS ── */}
        {isTerminal && (
          <div className="oc-terminal" style={{ '--badge-accent': accent } as React.CSSProperties}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{label}</span>
          </div>
        )}

        {/* ── ITEMS ── */}
        <ul className="oc-items">
          {order.items.map((item) => (
            <li key={item.id} className="oc-item">
              <span className="oc-item-name">{item.productName}</span>
              <span className="oc-item-detail">{item.color} · Tam. {item.size}</span>
              <span className="oc-item-qty">×{item.quantity}</span>
              <span className="oc-item-price">{formatCurrency(Number(item.priceAtPurchase) * item.quantity)}</span>
            </li>
          ))}
        </ul>

        {/* ── FOOTER: meta + tracking ── */}
        <div className="oc-footer">
          <div className="oc-footer-meta">
            {order.paymentMethod && (
              <span className="oc-chip">{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</span>
            )}
            {order.shippingMethod && (
              <span className="oc-chip">{SHIPPING_LABELS[order.shippingMethod] || order.shippingMethod}</span>
            )}
          </div>

          {/* Tracking actions */}
          {order.shippingMethod === 'CORREIOS' && order.trackingCode && (
            <div className="oc-tracking">
              <code className="oc-tracking-code">{order.trackingCode}</code>
              <a
                className="oc-tracking-btn"
                href={`https://rastreamento.correios.com.br/app/index.php?objetos=${order.trackingCode}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Rastrear nos Correios →
              </a>
            </div>
          )}

          {order.shippingMethod === 'UBER' && order.trackingUrl && (
            <a
              className="oc-tracking-btn"
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Acompanhar entrega →
            </a>
          )}

          {order.shippingMethod === 'PICKUP' && order.status === 'SHIPPED' && (
            <div className="oc-pickup-ready">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Pronto para retirada na loja
            </div>
          )}
        </div>

        {/* ── TIMELINE (expandable) ── */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="oc-timeline-wrap">
            <button
              type="button"
              className="oc-timeline-toggle"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? 'Ocultar histórico' : 'Ver histórico de status'}
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="12" height="12"
                style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {expanded && (
              <ol className="oc-timeline">
                {order.statusHistory.map((entry, i) => (
                  <li key={i} className="oc-timeline-item">
                    <span className="oc-tl-dot" aria-hidden="true" />
                    <div className="oc-tl-content">
                      <span className="oc-tl-status">{STATUS_LABELS[entry.status] || entry.status}</span>
                      {entry.note && <span className="oc-tl-note">{entry.note}</span>}
                      <span className="oc-tl-date">{formatDate(entry.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

      </div>
    </article>
  );
}
