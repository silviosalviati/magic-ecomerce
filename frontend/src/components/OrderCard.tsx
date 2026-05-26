import type { Order } from '../types';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pagamento confirmado',
  PREPARING: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  OVERDUE: 'Vencido',
  REFUNDED: 'Reembolsado',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'status-pending',
  PAID: 'status-paid',
  PREPARING: 'status-preparing',
  SHIPPED: 'status-shipped',
  DELIVERED: 'status-delivered',
  CANCELLED: 'status-cancelled',
  OVERDUE: 'status-overdue',
  REFUNDED: 'status-refunded',
};

const STATUS_BAR: Record<string, string> = {
  PENDING: '#ffc107',
  OVERDUE: '#ffc107',
  PAID: '#81c784',
  PREPARING: '#64b5f6',
  SHIPPED: '#ce93d8',
  DELIVERED: '#66bb6a',
  CANCELLED: '#e57373',
  REFUNDED: '#e57373',
};

const SHIPPING_LABELS: Record<string, string> = {
  CORREIOS: 'Correios',
  UBER: 'Uber Flash',
  PICKUP: 'Retirada na loja',
};

const PAYMENT_LABELS: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de Crédito',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OrderCard({ order }: { order: Order }) {
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const statusClass = STATUS_COLORS[order.status] || 'status-pending';
  const barColor = STATUS_BAR[order.status] || 'rgba(232,180,176,0.3)';

  return (
    <article
      className="order-card"
      style={{ '--order-bar-color': barColor } as React.CSSProperties}
    >
      <div className="order-card-inner">
        <div className="order-card-header">
          <div>
            <p className="order-card-id">Pedido #{order.id.slice(0, 8).toUpperCase()}</p>
            <p className="order-card-date">{formatDate(order.createdAt)}</p>
          </div>
          <div className="order-card-right">
            <span className={`order-status-badge ${statusClass}`}>{statusLabel}</span>
            <p className="order-card-total">{formatCurrency(order.total)}</p>
          </div>
        </div>

        <ul className="order-card-items">
          {order.items.map((item) => (
            <li key={item.id} className="order-card-item">
              <span className="order-item-name">{item.productName}</span>
              <span className="order-item-variant">{item.color} · Tam. {item.size}</span>
              <span className="order-item-qty">×{item.quantity}</span>
              <span className="order-item-price">{formatCurrency(Number(item.priceAtPurchase) * item.quantity)}</span>
            </li>
          ))}
        </ul>

        {(order.paymentMethod || order.shippingMethod) && (
          <div className="order-card-footer">
            {order.paymentMethod && (
              <p className="order-card-meta">
                {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
              </p>
            )}
            {order.shippingMethod && (
              <p className="order-card-meta">
                {SHIPPING_LABELS[order.shippingMethod] || order.shippingMethod}
              </p>
            )}
          </div>
        )}

        {/* Correios tracking */}
        {order.shippingMethod === 'CORREIOS' && order.trackingCode && (
          <div className="order-tracking">
            <p className="order-tracking-label">Rastreio</p>
            <code className="order-tracking-code">{order.trackingCode}</code>
            <a
              className="order-tracking-link btn-outline"
              href={`https://rastreamento.correios.com.br/app/index.php?objetos=${order.trackingCode}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Rastrear
            </a>
          </div>
        )}

        {/* Uber tracking */}
        {order.shippingMethod === 'UBER' && order.trackingUrl && (
          <div className="order-tracking">
            <a
              className="order-tracking-link btn-outline"
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Acompanhar entrega
            </a>
          </div>
        )}

        {/* Pickup */}
        {order.shippingMethod === 'PICKUP' && order.status === 'SHIPPED' && (
          <div className="order-tracking order-tracking--pickup">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="order-tracking-label">Pronto para retirada na loja</p>
          </div>
        )}

        {/* Status history */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="order-timeline">
            {order.statusHistory.map((update, i) => (
              <div key={i} className="order-timeline-item">
                <span className="order-timeline-dot" />
                <div>
                  <p className="order-timeline-status">{STATUS_LABELS[update.status] || update.status}</p>
                  {update.note && <p className="order-timeline-note">{update.note}</p>}
                  <p className="order-timeline-date">{formatDate(update.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
