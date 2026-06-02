import { useState } from 'react';
import type { CreditCardFormData, InstallmentOption } from '../../types';
import { formatCurrencyBRL } from '../../lib/numberFormat';

interface CreditCardFormProps {
  data: CreditCardFormData;
  onChange: (data: CreditCardFormData) => void;
  total: number;
  installmentOptions: InstallmentOption[];
  installmentSource?: 'asaas' | 'fallback';
  maxNoInterestInstallments?: number;
}

function detectBrand(number: string): 'visa' | 'mastercard' | 'amex' | 'elo' | 'unknown' {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]|^2[2-7]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) return 'elo';
  return 'unknown';
}

const BRAND_LABEL: Record<string, string> = {
  visa: 'VISA',
  mastercard: 'MASTERCARD',
  amex: 'AMEX',
  elo: 'ELO',
  unknown: '',
};

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d;
}

function toCurrency(value: number): string {
  return formatCurrencyBRL(value);
}

export function CreditCardForm({
  data,
  onChange,
  total,
  installmentOptions,
  installmentSource = 'fallback',
  maxNoInterestInstallments,
}: CreditCardFormProps) {
  const [cvvFlip, setCvvFlip] = useState(false);
  const noInterestLimit = installmentSource === 'asaas' ? 6 : Number(maxNoInterestInstallments) || 6;

  const brand = detectBrand(data.cardNumber);
  const brandLabel = BRAND_LABEL[brand];

  const maskedNumber = data.cardNumber
    ? data.cardNumber.replace(/\d(?=.{4})/g, '•').padEnd(19, ' ').slice(0, 19)
    : '•••• •••• •••• ••••';

  function set(field: keyof CreditCardFormData, value: string | number) {
    onChange({ ...data, [field]: value });
  }

  const options = installmentOptions.length > 0
    ? installmentOptions
    : [{ installments: 1, installmentValue: total, total, hasInterest: false, interestAmount: 0 }];

  return (
    <div className="card-form">
      {/* Visual card preview */}
      <div className={`card-preview ${cvvFlip ? 'flipped' : ''} brand-${brand}`}>
        <div className="card-face card-front">
          <div className="card-brand-label">{brandLabel}</div>
          <div className="card-number-display">{maskedNumber}</div>
          <div className="card-bottom-row">
            <div>
              <div className="card-field-label">TITULAR</div>
              <div className="card-holder-display">
                {data.cardHolderName || 'SEU NOME'}
              </div>
            </div>
            <div>
              <div className="card-field-label">VALIDADE</div>
              <div className="card-expiry-display">
                {data.cardExpiry || 'MM/AA'}
              </div>
            </div>
          </div>
        </div>
        <div className="card-face card-back">
          <div className="card-stripe" />
          <div className="card-cvv-wrap">
            <div className="card-field-label">CVV</div>
            <div className="card-cvv-display">{data.cardCvv ? '•••' : '•••'}</div>
          </div>
        </div>
      </div>

      {/* Card inputs */}
      <div className="card-fields">
        <div className="field-group">
          <label className="field-label" htmlFor="card-number">Número do cartão</label>
          <input
            id="card-number"
            className="field-input"
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            value={data.cardNumber}
            onChange={(e) => set('cardNumber', formatCardNumber(e.target.value))}
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="card-holder">Nome no cartão</label>
          <input
            id="card-holder"
            className="field-input"
            type="text"
            autoComplete="cc-name"
            placeholder="Como aparece no cartão"
            value={data.cardHolderName}
            onChange={(e) => set('cardHolderName', e.target.value.toUpperCase())}
          />
        </div>

        <div className="card-row-2">
          <div className="field-group">
            <label className="field-label" htmlFor="card-expiry">Validade</label>
            <input
              id="card-expiry"
              className="field-input"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/AA"
              value={data.cardExpiry}
              onChange={(e) => set('cardExpiry', formatExpiry(e.target.value))}
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="card-cvv">CVV</label>
            <input
              id="card-cvv"
              className="field-input"
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={4}
              value={data.cardCvv}
              onFocus={() => setCvvFlip(true)}
              onBlur={() => setCvvFlip(false)}
              onChange={(e) => set('cardCvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>
        </div>

        <div className="field-group installment-field">
          <span className="field-label">Parcelamento</span>
          <div className="installment-list">
            {options.map((option) => {
              const isSelected = data.installments === option.installments;
              const isVista = option.installments === 1;
              const hasInterest = isVista ? false : (installmentSource === 'asaas' ? option.installments > noInterestLimit || option.hasInterest : option.hasInterest);
              const tag = isVista ? 'À VISTA' : hasInterest ? 'COM JUROS EMBUTIDOS' : 'SEM JUROS';
              return (
                <button
                  key={option.installments}
                  type="button"
                  className={`installment-option${isSelected ? ' selected' : ''}${hasInterest ? ' has-interest' : ''}`}
                  onClick={() => set('installments', option.installments)}
                >
                  <span className="installment-count">{option.installments}×</span>
                  <span className="installment-per-month">
                    {toCurrency(option.installmentValue)}
                    {hasInterest && (
                      <span className="installment-total">total {toCurrency(option.total)}</span>
                    )}
                  </span>
                  <span className={`installment-tag${isVista ? ' tag-vista' : hasInterest ? ' tag-juros' : ' tag-free'}`}>
                    {tag}
                  </span>
                </button>
              );
            })}
          </div>
          {installmentSource === 'asaas' ? (
            <small className="field-hint">
              Sem juros em até 6x. De 7x a 12x, juros já entram no valor total.
            </small>
          ) : Number(maxNoInterestInstallments) > 0 && (
            <small className="field-hint">
              Sem juros em até {maxNoInterestInstallments}×.
            </small>
          )}
        </div>
      </div>

      {/* Address fields required by Asaas */}
      <div className="card-address-section">
        <p className="card-address-title">Endereço de cobrança</p>
        <div className="card-row-2">
          <div className="field-group">
            <label className="field-label" htmlFor="card-cep">CEP</label>
            <input
              id="card-cep"
              className="field-input"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              value={data.postalCode}
              onChange={(e) => set('postalCode', formatCep(e.target.value))}
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="card-addr-num">Número</label>
            <input
              id="card-addr-num"
              className="field-input"
              type="text"
              placeholder="123"
              value={data.addressNumber}
              onChange={(e) => set('addressNumber', e.target.value)}
            />
          </div>
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="card-phone">Telefone</label>
          <input
            id="card-phone"
            className="field-input"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            value={data.phone}
            onChange={(e) => set('phone', formatPhone(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
