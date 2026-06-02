import type { ShippingRateOption } from '../../types';

const PICKUP_OPTION: ShippingRateOption = {
  id: 'RETIRADA',
  name: 'Retirar na loja',
  company: 'Vista Magic',
  price: 0,
  deliveryDays: null,
  deliveryRange: null,
};

function toCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function deliveryLabel(option: ShippingRateOption): string {
  if (option.id === 'RETIRADA') return 'Combinar via WhatsApp';
  if (option.deliveryRange) {
    return `${option.deliveryRange.min} a ${option.deliveryRange.max} dias úteis`;
  }
  if (option.deliveryDays) return `Até ${option.deliveryDays} dias úteis`;
  return option.company;
}

interface ShippingSelectorProps {
  rates: ShippingRateOption[];
  loading: boolean;
  error: boolean;
  selected: ShippingRateOption | null;
  onChange: (option: ShippingRateOption) => void;
  onRetry: () => void;
}

export function ShippingSelector({ rates, loading, error, selected, onChange, onRetry }: ShippingSelectorProps) {
  const allOptions = [...rates, PICKUP_OPTION];
  const hasCarrierRates = rates.length > 0;

  return (
    <div className="shipping-selector">
      <p className="shipping-selector-title">Opções de entrega</p>

      {loading && (
        <div className="shipping-loading">
          <span className="shipping-spinner" />
          Calculando frete…
        </div>
      )}

      {!loading && error && (
        <div className="shipping-error">
          <p>Não foi possível calcular o frete para este CEP.</p>
          <button type="button" className="shipping-retry-btn" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {!hasCarrierRates && (
            <div className="shipping-empty-hint">
              Não encontramos opções de transportadora para este CEP no momento. Você ainda pode escolher retirada na loja.
            </div>
          )}
          <div className="shipping-options">
            {allOptions.map((option) => {
              const isSelected = selected?.id === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`shipping-option${isSelected ? ' selected' : ''}`}
                  onClick={() => onChange(option)}
                >
                  <span className="shipping-option-radio">
                    <span className="shipping-option-radio-dot" />
                  </span>
                  <span className="shipping-option-info">
                    <span className="shipping-option-name">{option.name}</span>
                    <span className="shipping-option-meta">{deliveryLabel(option)}</span>
                  </span>
                  <span className={`shipping-option-price${option.price === 0 ? ' shipping-option-free' : ''}`}>
                    {option.price === 0 ? 'Grátis' : toCurrency(option.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}