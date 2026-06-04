# Analytics — Aba de Tráfego (Admin)

**Data:** 2026-06-04  
**Escopo:** Monitoramento de acessos do storefront público no painel admin

---

## Objetivo

Criar uma aba **Tráfego** no admin para visualizar visitas do storefront, origem dos visitantes e funil completo de conversão (visita → produto → carrinho → checkout → pedido).

---

## Modelo de Dados

### `AnalyticsSession`
Representa uma visita única identificada por `sessionId` gerado no browser (localStorage/cookie).

```prisma
model AnalyticsSession {
  sessionId    String   @id
  firstSeen    DateTime @default(now())
  lastSeen     DateTime @updatedAt
  pageCount    Int      @default(0)
  linkedEmail  String?
  linkedCpf    String?
  referrer     String?
  utmSource    String?
  utmMedium    String?
  utmCampaign  String?
  userAgent    String?
  events       AnalyticsEvent[]
}
```

### `AnalyticsEvent`
Cada evento rastreado dentro de uma sessão.

```prisma
model AnalyticsEvent {
  id        Int              @id @default(autoincrement())
  sessionId String
  session   AnalyticsSession @relation(fields: [sessionId], references: [sessionId])
  eventType String
  page      String?
  productId Int?
  payload   Json?
  createdAt DateTime         @default(now())
}
```

**Tipos de evento (`eventType`):**
| Valor | Quando disparar |
|---|---|
| `page_view` | Toda navegação de página |
| `product_view` | Ao abrir página de produto |
| `variant_select` | Ao selecionar tamanho/cor |
| `add_to_cart` | Ao adicionar ao carrinho |
| `checkout_start` | Ao iniciar o checkout |
| `checkout_complete` | Ao confirmar pedido (com `orderId` no payload) |

---

## Endpoints da API

### Público (sem autenticação)

```
POST /analytics/event
```

**Body:**
```json
{
  "sessionId": "uuid-gerado-no-browser",
  "eventType": "page_view",
  "page": "/produtos/vestido-floral",
  "productId": 42,
  "payload": { "variantId": 7, "qty": 1 },
  "referrer": "https://instagram.com",
  "utmSource": "instagram",
  "utmMedium": "social",
  "utmCampaign": "verao2026"
}
```

**Lógica:**
- Se `sessionId` não existe → cria `AnalyticsSession` com dados de origem + insere evento
- Se `sessionId` existe → atualiza `lastSeen` + incrementa `pageCount` + insere evento
- Se payload contém CPF/email → salva em `linkedCpf`/`linkedEmail` na sessão

### Admin (requer JWT admin)

| Endpoint | Descrição |
|---|---|
| `GET /admin/analytics/overview?period=today\|7d\|30d` | KPIs resumidos |
| `GET /admin/analytics/funnel?period=...` | Contagem por estágio do funil |
| `GET /admin/analytics/sources?period=...` | Agrupamento por origem (UTM / referrer) |
| `GET /admin/analytics/products?period=...` | Produtos mais vistos |
| `GET /admin/analytics/sessions?period=...&page=1` | Sessões paginadas com eventos |

**Resposta de `overview`:**
```json
{
  "sessions": 142,
  "pageViews": 389,
  "addToCart": 38,
  "checkouts": 21,
  "orders": 14,
  "conversionRate": 9.86
}
```

---

## Layout do Painel Admin

Nova aba **"Tráfego"** no menu lateral do admin.

### Linha 1 — Seletor de período + KPI Cards

Seletor: `[Hoje]` `[7 dias]` `[30 dias]` — atualiza todos os dados ao trocar.

5 cards: **Sessões**, **Page Views**, **Adicionaram ao Carrinho**, **Checkouts**, **Taxa de Conversão**.

### Linha 2 — Funil de Conversão + Origens de Tráfego

**Funil (esquerda):** barras horizontais proporcionais mostrando queda entre estágios:
- Visitas → Produto visto → Carrinho → Checkout → Pedido

**Origens (direita):** lista rankeada com barra de progresso:
- direto / instagram / google / whatsapp / etc.

### Linha 3 — Produtos mais vistos

Tabela com colunas: Produto | Views | Adicionados ao carrinho | Taxa de conversão para carrinho.

### Linha 4 — Sessões recentes (expansível)

Tabela paginada: Sessão (ID curto) | Início | Páginas visitadas | Origem | Último estágio atingido.

Período padrão ao abrir: **Hoje**.

---

## Fluxo de Identificação Anônimo → Conhecido

```
1. Browser gera UUID → salva em localStorage como "sessionId"
2. Cada evento envia esse sessionId
3. No checkout_start/checkout_complete → frontend inclui CPF/email no payload
4. API linka sessionId ao CPF/email → histórico completo da visita fica atribuído ao cliente
```

---

## Considerações de Performance

- Índices em `AnalyticsEvent.sessionId`, `AnalyticsEvent.createdAt`, `AnalyticsEvent.eventType`
- Índice em `AnalyticsSession.firstSeen` para queries por período
- Queries de overview usam `GROUP BY` + `COUNT` direto no PostgreSQL (sem ORM overhead)
- `POST /analytics/event` deve responder rápido (fire-and-forget no frontend) — considerar resposta 202