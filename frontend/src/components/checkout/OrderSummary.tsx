import type { CartItem } from '../../types';

interface OrderSummaryProps {
  items: CartItem[];
  onDecrease?: (cartKey: string) => void;
  onIncrease?: (cartKey: string) => void;
  onRemove?: (cartKey: string) => void;
}

function toCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OrderSummary({ items, onDecrease, onIncrease, onRemove }: OrderSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="order-summary-panel">
      <h3 className="order-summary-title">Resumo do pedido</h3>

      <ul className="order-summary-items">
        {items.map((item) => (
          <li key={item.cartKey} className="order-summary-item">
            <div className="order-summary-thumb-wrap">
              <img src={item.imageUrl} alt={item.name} className="order-summary-thumb" />
              <span className="order-summary-qty">{item.quantity}</span>
            </div>
            <div className="order-summary-info">
              <p className="order-summary-name">{item.name}</p>
              <p className="order-summary-meta">{item.color} · Tam. {item.size}</p>
              {(onDecrease || onIncrease || onRemove) && (
                <div className="order-summary-controls">
                  {onDecrease && (
                    <button type="button" className="qty-mini" onClick={() => onDecrease(item.cartKey)}>−</button>
                  )}
                  <span className="qty-mini-val">{item.quantity}</span>
                  {onIncrease && (
                    <button
                      type="button"
                      className="qty-mini"
                      onClick={() => onIncrease(item.cartKey)}
                      disabled={item.quantity >= item.stock}
                    >+</button>
                  )}
                  {onRemove && (
                    <button type="button" className="qty-mini-remove" onClick={() => onRemove(item.cartKey)}>
                      Remover
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="order-summary-price">{toCurrency(item.price * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="order-summary-divider" />

      <div className="order-summary-row">
        <span>Subtotal</span>
        <span>{toCurrency(subtotal)}</span>
      </div>
      <div className="order-summary-row order-summary-total">
        <span>Total</span>
        <strong>{toCurrency(subtotal)}</strong>
      </div>
    </div>
  );
}
