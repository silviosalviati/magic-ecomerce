import { useNavigate } from 'react-router-dom';
import type { CartItem } from '../types';
import { formatCurrencyBRL } from '../lib/numberFormat';

type CartSidebarProps = {
  items: CartItem[];
  open: boolean;
  onClose: () => void;
  onDecrease: (cartKey: string) => void;
  onIncrease: (cartKey: string) => void;
  onRemove: (cartKey: string) => void;
};

function toCurrency(value: number): string {
  return formatCurrencyBRL(value);
}

export function CartSidebar({
  items,
  open,
  onClose,
  onDecrease,
  onIncrease,
  onRemove,
}: CartSidebarProps) {
  const navigate = useNavigate();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const FREE_SHIPPING_THRESHOLD = 299;
  const shippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const shippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  function handleClose() {
    onClose();
  }

  function handleCheckout() {
    onClose();
    navigate('/checkout');
  }

  return (
    <>
      <div className={open ? 'cart-backdrop open' : 'cart-backdrop'} onClick={handleClose} />
      <aside className={open ? 'cart-sidebar open' : 'cart-sidebar'} aria-label="Minha sacola">
        <div className="cart-header">
          <div>
            <p>Sacola</p>
            <h2>Minha seleção</h2>
          </div>
          <button type="button" className="icon-btn" onClick={handleClose}>
            Fechar
          </button>
        </div>

        <div className="cart-shipping-bar">
          {shippingRemaining > 0 ? (
            <p className="cart-shipping-label">
              Falta <strong>{toCurrency(shippingRemaining)}</strong> para ganhar até R$ 15 no frete
            </p>
          ) : (
            <p className="cart-shipping-label cart-shipping-achieved">
              Você ganhou <strong>até R$ 15 de desconto no frete.</strong>
            </p>
          )}
          <div className="cart-shipping-track">
            <div
              className="cart-shipping-fill"
              style={{ width: `${shippingProgress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(shippingProgress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        <div className="cart-body">
          {items.length === 0 && (
            <div className="cart-empty">
              <strong>Sua sacola está vazia.</strong>
              <p>Escolha cor, tamanho e adicione as peças que deseja comprar.</p>
              <p className="cart-empty-note">Desconto de até R$ 15 no frete acima de R$&nbsp;299</p>
            </div>
          )}
          {items.map((item) => (
            <article key={item.cartKey} className="cart-item">
              <img src={item.imageUrl} alt={item.name} />
              <div className="cart-item-copy">
                <h3>{item.name}</h3>
                <p>{item.color} • Tam. {item.size}</p>
                <strong>{toCurrency(item.price)}</strong>
                <div className="cart-actions">
                  <div className="qty-box">
                    <button type="button" onClick={() => onDecrease(item.cartKey)}>-</button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onIncrease(item.cartKey)}
                      disabled={item.quantity >= item.stock}
                    >+</button>
                  </div>
                  <button type="button" className="link-btn" onClick={() => onRemove(item.cartKey)}>
                    Remover
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="cart-footer">
          <div className="cart-total">
            <span>Subtotal</span>
            <strong>{toCurrency(subtotal)}</strong>
          </div>
          <button
            type="button"
            className="primary-btn cart-checkout"
            disabled={items.length === 0}
            onClick={handleCheckout}
          >
            Finalizar compra
          </button>
        </div>
      </aside>
    </>
  );
}
