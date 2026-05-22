# MAGI.C Ecommerce Frontend

Frontend profissional do ecommerce MAGI.C, desenvolvido com React + TypeScript + Vite.

## Requisitos

- Node.js 20+
- npm 10+

## Rodando local

1. Instale dependencias:

```bash
npm install
```

2. Configure variaveis de ambiente:

```bash
cp .env.example .env
```

3. Rode em desenvolvimento:

```bash
npm run dev
```

## Integracao com backend na nuvem

O frontend usa a variavel `VITE_API_BASE_URL` para consumir as rotas do backend:

- `GET /products`

Exemplo no `.env`:

```env
VITE_API_BASE_URL=https://magic-ecomerce-api-731025483706.us-central1.run.app
```

## Build de producao

```bash
npm run build
```

## Deploy no Cloud Run

Este frontend ja inclui `Dockerfile` e `nginx.conf` para SPA.

Deploy (na pasta `frontend`):

```bash
gcloud run deploy magic-ecomerce-web \
  --source . \
  --region us-central1 \
  --project magic-ecomerce \
  --allow-unauthenticated
```
