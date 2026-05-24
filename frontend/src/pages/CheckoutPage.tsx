import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkout } from '../lib/api';
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
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [cardData, setCardData] = useState<CreditCardFormData>(EMPTY_CARD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<CheckoutResponse | null>(null);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cpfDigits = cpf.replace(/\D/g, '');
  const stepIndex = STEP_ORDER.indexOf(step);

  // Redirect to home if cart is empty and we haven't finished an order
  useEffect(() => {
    if (cartItems.length === 0 && step !== 'confirmation') {
      navigate('/');
    }
  }, [cartItems.length, step, navigate]);

  function canProceedFromDetails(): boolean {
    return name.trim().length > 0 && email.trim().length > 0 && cpfDigits.length === 11;
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
        name: name.trim(),
        email: email.trim(),
        cpf: cpfDigits,
        items: cartItems.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          priceAtPurchase: i.price,
        })),
        paymentMethod,
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
          postalCode: cardData.postalCode.replace(/\D/g, ''),
          addressNumber: cardData.addressNumber,
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
              <h2 className="checkout-section-title">Seus dados</h2>

              <div className="checkout-form">
                <div className="field-group">
                  <label className="field-label" htmlFor="co-name">Nome completo</label>
                  <input
                    id="co-name"
                    className="field-input"
                    type="text"
                    autoComplete="name"
                    placeholder="Seu nome completo"
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
