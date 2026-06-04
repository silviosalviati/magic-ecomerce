import type { PaymentMethod } from '../../types';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

function PixIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8 12L12 8L16 12L12 16L8 12Z" fill="currentColor" opacity="0.9"/>
      <path d="M16 12L20 8L24 12L20 16L16 12Z" fill="currentColor" opacity="0.6"/>
      <path d="M8 20L12 16L16 20L12 24L8 20Z" fill="currentColor" opacity="0.6"/>
      <path d="M16 20L20 16L24 20L20 24L16 20Z" fill="currentColor" opacity="0.9"/>
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 32 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1" width="30" height="18" rx="2" />
      <line x1="1" y1="7" x2="31" y2="7" />
      <line x1="5" y1="13" x2="11" y2="13" />
      <line x1="5" y1="15.5" x2="9" y2="15.5" />
    </svg>
  );
}

function BoletoIcon() {
  return (
    <svg viewBox="0 0 28 22" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="3" height="20" rx="0.5" fill="currentColor" opacity="0.9"/>
      <rect x="6" y="1" width="1.5" height="20" rx="0.5" fill="currentColor" opacity="0.6"/>
      <rect x="9" y="1" width="3" height="20" rx="0.5" fill="currentColor" opacity="0.9"/>
      <rect x="14" y="1" width="1.5" height="20" rx="0.5" fill="currentColor" opacity="0.6"/>
      <rect x="17.5" y="1" width="2.5" height="20" rx="0.5" fill="currentColor" opacity="0.9"/>
      <rect x="22" y="1" width="1.5" height="20" rx="0.5" fill="currentColor" opacity="0.6"/>
      <rect x="25" y="1" width="2" height="20" rx="0.5" fill="currentColor" opacity="0.9"/>
    </svg>
  );
}

const METHODS: { id: PaymentMethod; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    id: 'PIX',
    label: 'PIX',
    sub: 'Instantâneo',
    icon: <PixIcon />,
  },
  {
    id: 'CREDIT_CARD',
    label: 'Cartão',
    sub: 'Parcelamento disponível',
    icon: <CardIcon />,
  },
  {
    id: 'BOLETO',
    label: 'Boleto',
    sub: 'Vence em 3 dias',
    icon: <BoletoIcon />,
  },
];

export function PaymentMethodSelector({ selected, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="payment-tabs" role="tablist" aria-label="Método de pagamento">
      {METHODS.map((method) => {
        const isActive = selected === method.id;
        return (
          <button
            key={method.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? 'payment-tab active' : 'payment-tab'}
            onClick={() => onChange(method.id)}
          >
            <span className="payment-tab-icon">{method.icon}</span>
            <span className="payment-tab-label">{method.label}</span>
            <span className="payment-tab-desc">{method.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
