import type { PaymentMethod } from '../../types';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const METHODS: { id: PaymentMethod; label: string; icon: string; description: string }[] = [
  {
    id: 'PIX',
    label: 'PIX',
    icon: '⚡',
    description: 'Pagamento instantâneo',
  },
  {
    id: 'CREDIT_CARD',
    label: 'Cartão de Crédito',
    icon: '💳',
    description: 'Em até 12x sem juros',
  },
  {
    id: 'BOLETO',
    label: 'Boleto',
    icon: '📄',
    description: 'Vence em 3 dias úteis',
  },
];

export function PaymentMethodSelector({ selected, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="payment-tabs" role="tablist" aria-label="Método de pagamento">
      {METHODS.map((method) => (
        <button
          key={method.id}
          type="button"
          role="tab"
          aria-selected={selected === method.id}
          className={selected === method.id ? 'payment-tab active' : 'payment-tab'}
          onClick={() => onChange(method.id)}
        >
          <span className="payment-tab-icon">{method.icon}</span>
          <span className="payment-tab-label">{method.label}</span>
          <span className="payment-tab-desc">{method.description}</span>
        </button>
      ))}
    </div>
  );
}
