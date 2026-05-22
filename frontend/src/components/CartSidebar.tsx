import { useState } from 'react';
import { checkout } from '../lib/api';
import type { CartItem, CheckoutPayload, CheckoutResponse } from '../types';

type CartSidebarProps = {
  items: CartItem[];
  open: boolean;
  onClose: () => void;
  onDecrease: (cartKey: string) => void;
  onIncrease: (cartKey: string) => void;
  onRemove: (cartKey: string) => void;
};

function toCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCpf(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

type Step = 'cart' | 'form' | 'pix';

export function CartSidebar({
  items,
  open,
  onClose,
  onDecrease,
  onIncrease,
  onRemove,
}: CartSidebarProps) {
  const [step, setStep] = useState<Step>('cart');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<CheckoutResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cpfDigits = cpf.replace(/\D/g, '');

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep('cart');
      setError(null);
    }, 300);
  }

  async function handleCheckout() {
    setError(null);
    setLoading(true);
    try {
      const payload: CheckoutPayload = {
        name: name.trim(),
        email: email.trim(),
        cpf: cpfDigits,
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          priceAtPurchase: i.price,
        })),
      };
      const result = await checkout(payload);
      setPixData(result);
      setStep('pix');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar PIX. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function copyPixCode() {
    if (!pixData?.pixCopyPaste) return;
    await navigator.clipboard.writeText(pixData.pixCopyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
      <div className={open ? 'cart-backdrop open' : 'cart-backdrop'} onClick={handleClose} />
      <aside className={open ? 'cart-sidebar open' : 'cart-sidebar'} aria-label="Minha sacola">

        {/* ── STEP 1: CART ──────────────────────────────────────── */}
        {step === 'cart' && (
          <>
            <div className="cart-header">
              <div>
                <p>Sacola</p>
                <h2>Minha seleção</h2>
              </div>
              <button type="button" className="icon-btn" onClick={handleClose}>
                Fechar
              </button>
            </div>

            <div className="cart-body">
              {items.length === 0 && (
                <div className="cart-empty">
                  <strong>Sua sacola está vazia.</strong>
                  <p>Escolha cor, tamanho e adicione as peças que deseja comprar.</p>
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
                onClick={() => { setError(null); setStep('form'); }}
              >
                Finalizar compra
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: FORM ──────────────────────────────────────── */}
        {step === 'form' && (
          <>
            <div className="cart-header">
              <div>
                <p>Pagamento</p>
                <h2>Seus dados</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setStep('cart')}>
                ← Voltar
              </button>
            </div>

            <div className="cart-body">
              <div className="checkout-form">
                <div className="field-group">
                  <label className="field-label" htmlFor="co-name">Nome completo</label>
                  <input
                    id="co-name"
                    className="field-input"
                    type="text"
                    autoComplete="name"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="co-email">E-mail</label>
                  <input
                    id="co-email"
                    className="field-input"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="co-cpf">CPF</label>
                  <input
                    id="co-cpf"
                    className="field-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                  />
                </div>
                {error && <p className="form-error">{error}</p>}
              </div>
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <span>Total</span>
                <strong>{toCurrency(subtotal)}</strong>
              </div>
              <button
                type="button"
                className="primary-btn cart-checkout"
                disabled={loading || !name.trim() || !email.trim() || cpfDigits.length !== 11}
                onClick={handleCheckout}
              >
                {loading ? 'Gerando PIX…' : 'Gerar PIX'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: PIX ───────────────────────────────────────── */}
        {step === 'pix' && pixData && (
          <>
            <div className="cart-header">
              <div>
                <p>Pagamento PIX</p>
                <h2>Quase lá!</h2>
              </div>
              <button type="button" className="icon-btn" onClick={handleClose}>
                Fechar
              </button>
            </div>

            <div className="cart-body">
              <div className="pix-wrap">
                <img
                  className="pix-qr"
                  src={`data:image/png;base64,${pixData.pixQrCode}`}
                  alt="QR Code PIX"
                />
                <p className="pix-instruction">
                  Abra o app do seu banco, escolha pagar via PIX<br />
                  e escaneie o QR Code acima.
                </p>
                <p className="pix-copy-label">Ou copie o código PIX</p>
                <div
                  className="pix-code-box"
                  onClick={copyPixCode}
                  title="Clique para copiar"
                >
                  {pixData.pixCopyPaste}
                </div>
                <button type="button" className="pix-copy-btn" onClick={copyPixCode}>
                  {copied ? '✓ Código copiado!' : 'Copiar código PIX'}
                </button>
                <p className="pix-instruction" style={{ fontSize: '10px' }}>
                  Após o pagamento você receberá a confirmação por e-mail.<br />
                  Total: <strong>{toCurrency(pixData.total)}</strong>
                </p>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
