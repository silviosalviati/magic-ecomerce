import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkout } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { CartItem, CheckoutResponse, CreditCardFormData, PaymentMethod } from '../types';
import { BoletoConfirmation } from '../components/checkout/BoletoConfirmation';
import { CreditCardForm } from '../components/checkout/CreditCardForm';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { PaymentMethodSelector } from '../components/checkout/PaymentMethodSelector';
import { PixConfirmation } from '../components/checkout/PixConfirmation';

interface CheckoutPageProps {
  cartItems: CartItem[];
  onDecrease: (cartKey: string) => void;
  onIncrease: (cartKey: string) => void;
  onRemove: (cartKey: string) => void;
  onClearCart: () => void;
}

type Step = 'details' | 'payment' | 'confirmation';

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

const EMPTY_CARD: CreditCardFormData = {
  cardHolderName: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvv: '',
  phone: '',
  postalCode: '',
  addressNumber: '',
  installments: 1,
};

const STEP_LABELS: Record<Step, string> = {
  details: 'Dados pessoais',
  payment: 'Pagamento',
  confirmation: 'Confirmação',
};

const STEP_ORDER: Step[] = ['details', 'payment', 'confirmation'];

export function CheckoutPage({
  cartItems,
  onDecrease,
  onIncrease,
  onRemove,
  onClearCart,
}: CheckoutPageProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>('details');
  const [cpf, setCpf] = useState('');
  // Address
  const [addressZip, setAddressZip] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [cardData, setCardData] = useState<CreditCardFormData>(EMPTY_CARD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<CheckoutResponse | null>(null);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cpfDigits = cpf.replace(/\D/g, '');
  const stepIndex = STEP_ORDER.indexOf(step);

  // Wait for auth to resolve before redirecting — avoids sending logged-in users to /entrar
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/entrar', {
        state: { from: '/checkout', message: 'Faça login para finalizar sua compra.' },
        replace: true,
      });
    }
  }, [user, authLoading, navigate]);

  // Redirect to home if cart is empty and we haven't finished an order
  useEffect(() => {
    if (cartItems.length === 0 && step !== 'confirmation') {
      navigate('/');
    }
  }, [cartItems.length, step, navigate]);

  // Render nothing while auth is resolving — prevents flash and wrong redirects
  if (authLoading) return null;

  async function handleCepBlur() {
    const clean = addressZip.replace(/\D/g, '');
    if (clean.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddressStreet(data.logradouro || '');
        setAddressNeighborhood(data.bairro || '');
        setAddressCity(data.localidade || '');
        setAddressState(data.uf || '');
        // Pre-fill card CEP too
        setCardData((prev) => ({ ...prev, postalCode: clean }));
      }
    } catch {
      // Ignore CEP lookup errors silently
    } finally {
      setCepLoading(false);
    }
  }

  function formatCep(raw: string): string {
    const d = raw.replace(/\D/g, '').slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  function canProceedFromDetails(): boolean {
    return (
      cpfDigits.length === 11 &&
      addressZip.replace(/\D/g, '').length === 8 &&
      addressNumber.trim().length > 0
    );
  }

  function canConfirmPayment(): boolean {
    if (paymentMethod === 'PIX' || paymentMethod === 'BOLETO') return true;
    if (paymentMethod === 'CREDIT_CARD') {
      const phoneDigits = cardData.phone.replace(/\D/g, '');
      const cepDigits = cardData.postalCode.replace(/\D/g, '');
      return (
        cardData.cardHolderName.trim().length > 0 &&
        cardData.cardNumber.replace(/\s/g, '').length >= 13 &&
        cardData.cardExpiry.length === 5 &&
        cardData.cardCvv.length >= 3 &&
        phoneDigits.length >= 10 &&
        cepDigits.length === 8 &&
        cardData.addressNumber.trim().length > 0
      );
    }
    return false;
  }

  async function handleConfirmPayment() {
    setError(null);
    setLoading(true);
    try {
      const basePayload = {
        name: user!.name,
        email: user!.email,
        cpf: cpfDigits,
        items: cartItems.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          priceAtPurchase: i.price,
        })),
        paymentMethod,
        addressZip: addressZip.replace(/\D/g, ''),
        addressStreet: addressStreet.trim(),
        addressNumber: addressNumber.trim(),
        addressComplement: addressComplement.trim() || undefined,
        addressNeighborhood: addressNeighborhood.trim(),
        addressCity: addressCity.trim(),
        addressState: addressState.trim(),
      };

      let result: CheckoutResponse;

      if (paymentMethod === 'CREDIT_CARD') {
        result = await checkout({
          ...basePayload,
          cardHolderName: cardData.cardHolderName,
          cardNumber: cardData.cardNumber.replace(/\s/g, ''),
          cardExpiry: cardData.cardExpiry,
          cardCvv: cardData.cardCvv,
          phone: cardData.phone.replace(/\D/g, ''),
          postalCode: cardData.postalCode.replace(/\D/g, '') || addressZip.replace(/\D/g, ''),
          addressNumber: cardData.addressNumber || addressNumber.trim(),
          installments: cardData.installments,
        });
      } else {
        result = await checkout(basePayload);
      }

      setOrderResult(result);
      onClearCart();
      setStep('confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function getPaymentButtonLabel(): string {
    if (loading) {
      const labels: Record<PaymentMethod, string> = {
        PIX: 'Gerando PIX…',
        CREDIT_CARD: 'Processando cartão…',
        BOLETO: 'Gerando boleto…',
      };
      return labels[paymentMethod];
    }
    const labels: Record<PaymentMethod, string> = {
      PIX: 'Gerar PIX',
      CREDIT_CARD: 'Pagar com cartão',
      BOLETO: 'Gerar boleto',
    };
    return labels[paymentMethod];
  }

  return (
    <div className="checkout-page">
      {/* Minimal header */}
      <header className="checkout-header">
        <button
          type="button"
          className="checkout-back-link"
          onClick={() => navigate('/')}
          aria-label="Voltar para a loja"
        >
          ← Vista Magic
        </button>
        <span className="checkout-secure-badge">🔒 Checkout seguro</span>
      </header>

      {/* Progress stepper */}
      <nav className="checkout-progress" aria-label="Etapas do checkout">
        {STEP_ORDER.map((s, i) => (
          <div
            key={s}
            className={[
              'checkout-step',
              i < stepIndex ? 'done' : '',
              i === stepIndex ? 'active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="checkout-step-bubble">
              {i < stepIndex ? '✓' : i + 1}
            </div>
            <span className="checkout-step-label">{STEP_LABELS[s]}</span>
            {i < STEP_ORDER.length - 1 && <div className="checkout-step-line" />}
          </div>
        ))}
      </nav>

      {/* Main layout */}
      <div className="checkout-layout">
        {/* Left — form area */}
        <main className="checkout-main">

          {/* ── STEP 1: DADOS PESSOAIS ─────────────────────────── */}
          {step === 'details' && (
            <section className="checkout-section">
              <h2 className="checkout-section-title">Entrega</h2>

              <div className="checkout-form">
                <div className="checkout-logged-user">
                  <span className="checkout-logged-label">Comprando como</span>
                  <strong className="checkout-logged-name">{user?.name}</strong>
                  <span className="checkout-logged-email">{user?.email}</span>
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

                <div className="checkout-divider">
                  <span>Endereço de entrega</span>
                </div>

                <div className="field-row">
                  <div className="field-group" style={{ flex: '0 0 160px' }}>
                    <label className="field-label" htmlFor="co-zip">
                      CEP {cepLoading && <span className="cep-loading">buscando…</span>}
                    </label>
                    <input
                      id="co-zip"
                      className="field-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="00000-000"
                      value={addressZip}
                      onChange={(e) => setAddressZip(formatCep(e.target.value))}
                      onBlur={handleCepBlur}
                    />
                  </div>
                  <div className="field-group" style={{ flex: 1 }}>
                    <label className="field-label" htmlFor="co-street">Rua / Avenida</label>
                    <input
                      id="co-street"
                      className="field-input"
                      type="text"
                      autoComplete="street-address"
                      placeholder="Nome da rua"
                      value={addressStreet}
                      onChange={(e) => setAddressStreet(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field-row">
                  <div className="field-group" style={{ flex: '0 0 110px' }}>
                    <label className="field-label" htmlFor="co-number">Número</label>
                    <input
                      id="co-number"
                      className="field-input"
                      type="text"
                      placeholder="123"
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(e.target.value)}
                    />
                  </div>
                  <div className="field-group" style={{ flex: 1 }}>
                    <label className="field-label" htmlFor="co-complement">
                      Complemento <span className="field-optional">(opcional)</span>
                    </label>
                    <input
                      id="co-complement"
                      className="field-input"
                      type="text"
                      placeholder="Apto, bloco, casa…"
                      value={addressComplement}
                      onChange={(e) => setAddressComplement(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field-row">
                  <div className="field-group" style={{ flex: 1 }}>
                    <label className="field-label" htmlFor="co-neighborhood">Bairro</label>
                    <input
                      id="co-neighborhood"
                      className="field-input"
                      type="text"
                      placeholder="Bairro"
                      value={addressNeighborhood}
                      onChange={(e) => setAddressNeighborhood(e.target.value)}
                    />
                  </div>
                  <div className="field-group" style={{ flex: 2 }}>
                    <label className="field-label" htmlFor="co-city">Cidade</label>
                    <input
                      id="co-city"
                      className="field-input"
                      type="text"
                      autoComplete="address-level2"
                      placeholder="Cidade"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                    />
                  </div>
                  <div className="field-group" style={{ flex: '0 0 70px' }}>
                    <label className="field-label" htmlFor="co-state">UF</label>
                    <input
                      id="co-state"
                      className="field-input"
                      type="text"
                      autoComplete="address-level1"
                      placeholder="SP"
                      maxLength={2}
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="primary-btn checkout-cta"
                disabled={!canProceedFromDetails()}
                onClick={() => setStep('payment')}
              >
                Continuar para pagamento →
              </button>
            </section>
          )}

          {/* ── STEP 2: PAGAMENTO ──────────────────────────────── */}
          {step === 'payment' && (
            <section className="checkout-section">
              <button
                type="button"
                className="checkout-back-btn"
                onClick={() => setStep('details')}
              >
                ← Voltar
              </button>
              <h2 className="checkout-section-title">Forma de pagamento</h2>

              <PaymentMethodSelector
                selected={paymentMethod}
                onChange={(m) => { setPaymentMethod(m); setError(null); }}
              />

              {paymentMethod === 'PIX' && (
                <div className="payment-info-box">
                  <p>⚡ O QR Code PIX será gerado ao confirmar.</p>
                  <p className="payment-info-note">
                    Válido por 30 minutos após a geração.
                  </p>
                </div>
              )}

              {paymentMethod === 'CREDIT_CARD' && (
                <CreditCardForm
                  data={cardData}
                  onChange={setCardData}
                  total={subtotal}
                />
              )}

              {paymentMethod === 'BOLETO' && (
                <div className="payment-info-box">
                  <p>📄 O boleto será gerado ao confirmar.</p>
                  <p className="payment-info-note">
                    Vencimento em 3 dias úteis. Pague em qualquer banco ou app.
                  </p>
                </div>
              )}

              {error && <p className="form-error checkout-error">{error}</p>}

              <button
                type="button"
                className="primary-btn checkout-cta"
                disabled={loading || !canConfirmPayment()}
                onClick={handleConfirmPayment}
              >
                {getPaymentButtonLabel()}
              </button>

              <p className="checkout-security-note">
                🔒 Seus dados são protegidos com criptografia SSL
              </p>
            </section>
          )}

          {/* ── STEP 3: CONFIRMAÇÃO ────────────────────────────── */}
          {step === 'confirmation' && orderResult && (
            <section className="checkout-section">
              {orderResult.paymentMethod === 'PIX' && (
                <PixConfirmation
                  qrCode={orderResult.pixQrCode!}
                  copyPaste={orderResult.pixCopyPaste!}
                  expiresAt={orderResult.pixExpiresAt}
                  total={orderResult.total}
                />
              )}

              {orderResult.paymentMethod === 'BOLETO' && (
                <BoletoConfirmation
                  boletoUrl={orderResult.boletoUrl!}
                  boletoBarcode={orderResult.boletoBarcode}
                  boletoDueDate={orderResult.boletoDueDate}
                  total={orderResult.total}
                />
              )}

              {orderResult.paymentMethod === 'CREDIT_CARD' && (
                <div className="payment-confirmation card-confirmation">
                  {orderResult.cardStatus === 'CONFIRMED' || orderResult.cardStatus === 'RECEIVED' ? (
                    <>
                      <div className="confirmation-icon">✅</div>
                      <h3 className="confirmation-title">Pagamento aprovado!</h3>
                      <p className="confirmation-subtitle">
                        Total de {toCurrency(orderResult.total)} debitado com sucesso.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="confirmation-icon">⚠️</div>
                      <h3 className="confirmation-title">Pagamento em análise</h3>
                      <p className="confirmation-subtitle">
                        Seu pagamento está sendo processado. Você receberá a confirmação por e-mail.
                      </p>
                    </>
                  )}
                  <p className="confirmation-note">
                    Pedido #{orderResult.orderId.slice(0, 8).toUpperCase()} registrado.
                  </p>
                </div>
              )}

              <button
                type="button"
                className="ghost-btn checkout-home-btn"
                onClick={() => navigate('/')}
              >
                Continuar comprando
              </button>
            </section>
          )}
        </main>

        {/* Right — sticky order summary */}
        <aside className="checkout-sidebar">
          <OrderSummary
            items={step === 'confirmation' ? [] : cartItems}
            onDecrease={step === 'details' ? onDecrease : undefined}
            onIncrease={step === 'details' ? onIncrease : undefined}
            onRemove={step === 'details' ? onRemove : undefined}
          />
          {step !== 'confirmation' && (
            <div className="order-summary-total-cta">
              <div className="order-summary-row order-summary-total">
                <span>Total</span>
                <strong>{toCurrency(subtotal)}</strong>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
