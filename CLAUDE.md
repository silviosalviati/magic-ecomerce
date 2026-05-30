# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with hot reload (ts-node-dev)
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled dist/src/server.js

npx prisma migrate dev    # Apply pending migrations and regenerate client
npx prisma generate       # Regenerate Prisma client after schema changes
npx prisma studio         # Open visual DB browser
```

## Architecture

This is a Node.js + TypeScript REST API backend for the **Vista Magic** fashion e-commerce (vistamagic.com.br). Entry point: `src/server.ts`.

### Route modules

| Mount | Module | Purpose |
|---|---|---|
| `/products` | `src/products/` | Public product catalog, image upload, AI preview |
| `/admin` | `src/admin/` | Protected admin dashboard and product management |
| `/checkout` | `src/checkout/` | Asaas PIX payment flow |
| `/health` | inline | DB connectivity check |

### Auth

Admin routes require a valid JWT for a user with `isAdmin=true`. Implemented in `src/middlewares/auth.middleware.ts` and backed by the auth flow in `src/auth/`.

### Data model

- **Product** has many **Variants** (each variant = size + color + barcode + stock)
- `basePrice = costPrice * markup` — calculated at creation time and stored
- **Order** / **OrderItem** tables exist in the schema but are not yet wired to any routes

### GCS image storage (`src/config/storage.ts`)

Images live in bucket `magic-ecommerce-fotos` (env: `GCP_BUCKET_NAME`) under:
- `produtos/{barcode}/{filename}` — per-barcode photos (used by products routes)
- `produtos/{productId}-frente.png` / `produtos/{productId}-costas.png` — canonical front/back (used by admin `/foto` screen)

The controller serves images via a proxy endpoint (`GET /products/images/object?path=...`) that pipes GCS bytes through the API, so the public URL is always the API's own domain. There is also a signed-upload URL flow for direct browser-to-GCS uploads.

### Vertex AI preview (`src/config/vertexai.ts`)

`POST /products/:barcode/generate-preview` calls Google Imagen 3.0 (`imagen-3.0-fast-generate-001`) via REST to composite the product's front/back photos onto a mannequin. The result is saved to GCS as `produtos/{barcode}/{barcode}_Review.png`. Falls back to prompt-only mode if the image-conditioned API call returns 400/404.

### Checkout (`src/checkout/`)

Uses **Asaas** (Brazilian payment gateway) for PIX. Flow: find-or-create customer by CPF → create PIX payment → poll up to 5× for QR code availability → webhook endpoint for status updates.

### Required environment variables

```
DATABASE_URL                   # PostgreSQL connection string
GCP_PROJECT_ID                 # GCP project ID
GCP_BUCKET_NAME                # GCS bucket (default: magic-ecommerce-fotos)
GCP_PUBLIC_BASE_URL            # Public base URL for GCS images
GOOGLE_APPLICATION_CREDENTIALS # Path to service account JSON (fallback: ./secrets/gcp-key.json)
ASAAS_BASE_URL                 # Asaas API base URL (default: sandbox)
ASAAS_API_KEY                  # Asaas API key
PORT                           # Server port (default: 3001)
PUBLIC_API_BASE_URL            # This API's public URL (used to build image proxy URLs)
ALLOWED_ORIGINS                # Comma-separated extra CORS origins (optional)
```

### CORS

Allowed origins include `localhost:3000`, `localhost:5173`, `vistamagic.com.br`, and any `*.devtunnels.ms` subdomain (for VS Code dev tunnels). Extend via `ALLOWED_ORIGINS` env var.
