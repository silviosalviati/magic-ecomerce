# Shipping Options — Design

## Summary

Add shipping method selection to checkout Step 1, with real-time quotes via Melhor Envios API and a free "pickup" option that triggers a contact email.

## Flow

1. User fills CEP in Step 1 → address auto-fills + shipping rates fetched in parallel
2. ShippingSelector appears with carrier options + "Retirar na loja" (always free)
3. Selected shipping cost is added to the order total in the sidebar
4. "Continuar para pagamento" only enables when shipping is selected
5. On order confirmation, if RETIRADA: `sendPickupContactEmail` fires

## Architecture

### Backend

- `src/checkout/melhorenvios.service.ts` — `calculateShippingRates(cep, quantity)` calls Melhor Envios API v2. Origin fixed at CEP 06126050. Weight = quantity × 200g. Services: PAC (1), SEDEX (2), Jadlog .Package (17).
- `GET /checkout/shipping-rates?cep=&quantity=` — new endpoint returning normalized rate list
- `POST /checkout` — now accepts `shippingMethod`, `shippingLabel`, `shippingCost`. Total = subtotal − discount + shippingCost. Saves to Order. RETIRADA triggers pickup email.

### Schema

```prisma
shippingLabel  String?
shippingCost   Decimal? @db.Decimal(10, 2)
```

### Frontend

- `ShippingRateOption` type added to `types.ts`
- `getShippingRates(cep, quantity)` added to `api.ts`
- `ShippingSelector` component — loading/error/options states, PICKUP_OPTION appended client-side
- `CheckoutPage` — shipping state, `fetchShipping()`, total includes `shippingCost`, CEP change resets shipping
- Sidebar pricing shows Frete row (green "Grátis" for pickup/free)

### Email

`sendPickupContactEmail` in `mailer.ts` — sent on order creation when shippingMethod === 'RETIRADA'. Contains: contato@vistamagic.com.br and (11) 96970-7136.

## Environment

```
MELHOR_ENVIOS_TOKEN=<token from melhorenvios.com.br account>
```