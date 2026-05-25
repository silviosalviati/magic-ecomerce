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
  OVERDUE: 'status-cancelled',
  REFUNDED: 'status-cancelled',
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

  return (
    <article className="order-card">
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

      {order.paymentMethod && (
        <p className="order-card-meta">
          Pagamento: {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
        </p>
      )}

      {order.shippingMethod && (
        <p className="order-card-meta">
          Entrega: {SHIPPING_LABELS[order.shippingMethod] || order.shippingMethod}
        </p>
      )}

      {/* Correios tracking */}
      {order.shippingMethod === 'CORREIOS' && order.trackingCode && (
        <div className="order-tracking">
          <p className="order-tracking-label">Código de rastreio:</p>
          <code className="order-tracking-code">{order.trackingCode}</code>
          <a
            className="order-tracking-link btn-outline"
            href={`https://rastreamento.correios.com.br/app/index.php?objetos=${order.trackingCode}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Rastrear nos Correios
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
        <div className="order-tracking">
          <p className="order-tracking-label">✅ Pronto para retirada na loja!</p>
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
    </article>
  );
}
