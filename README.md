# Magic E-commerce API

Backend de e-commerce desenvolvido em **Node.js + TypeScript**, com suporte a gestão de produtos, variantes, estoque, pedidos e integração com **Google Cloud** (Storage e Vertex AI).

## Produção (GCP)

- **Cloud Run:** https://magic-ecomerce-api-731025483706.us-central1.run.app
- **Healthcheck:** https://magic-ecomerce-api-731025483706.us-central1.run.app/health
- **Leitor de estoque:** https://magic-ecomerce-api-731025483706.us-central1.run.app/leitor

## Tecnologias

- **Runtime:** Node.js + TypeScript
- **Framework:** Express 5
- **ORM:** Prisma (PostgreSQL)
- **Cloud:** Google Cloud Storage · Google Vertex AI
- **Auth:** Middleware de API key para rotas administrativas

## Estrutura do Projeto

```
src/
├── server.ts                  # Entrypoint da aplicação
├── admin/
│   ├── admin.controller.ts
│   └── admin.routes.ts
├── products/
│   ├── products.controller.ts
│   └── products.routes.ts
├── config/
│   ├── database.ts            # Conexão Prisma/PostgreSQL
│   ├── storage.ts             # Google Cloud Storage
│   └── vertexai.ts            # Google Vertex AI
└── middlewares/
    ├── auth.middleware.ts      # Autenticação por API key
    └── validate.middleware.ts  # Validação de dados

prisma/
├── schema.prisma              # Modelos: User, Product, Variant, Order, OrderItem
└── migrations/                # Migrações do banco de dados
```

## Modelos de Dados

| Modelo       | Descrição                                         |
|--------------|---------------------------------------------------|
| `User`       | Usuários (admin e clientes)                       |
| `Product`    | Produtos com preço base, custo e markup           |
| `Variant`    | Variantes por tamanho/cor com controle de estoque |
| `Order`      | Pedidos vinculados a usuários                     |
| `OrderItem`  | Itens de pedido com preço no momento da compra    |

## Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
# Crie o arquivo .env na raiz com suas credenciais

# Executar migrações
npx prisma migrate deploy

# Iniciar em modo desenvolvimento
npm run dev
```

## Variáveis de Ambiente

Este projeto não lê mais um arquivo `.env` automaticamente.

Em produção, as variáveis são injetadas pelo Cloud Run e pelo Secret Manager.
Para execução local, exporte as variáveis no shell ou configure-as no ambiente da sua sessão antes de iniciar a API ou rodar comandos do Prisma.

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
PORT=3001
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173,https://vistamagic.com.br,https://www.vistamagic.com.br"
JWT_SECRET="chave-secreta-longa-e-unica"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="contato@vistamagic.com.br"
SMTP_PASS="senha-de-app"
STORE_EMAIL="contato@vistamagic.com.br"
FRONTEND_URL="https://vistamagic.com.br"
GCP_PROJECT_ID="seu-projeto-gcp"
GCP_BUCKET_NAME="seu-bucket"
GCP_PUBLIC_BASE_URL="https://storage.googleapis.com/seu-bucket"
GOOGLE_APPLICATION_CREDENTIALS="./secrets/gcp-key.json"
```

> **Atenção:** Não volte a introduzir segredos em `.env`. Use variáveis do ambiente da sessão local e, em produção, Secret Manager/Cloud Run.

## Scripts

| Comando       | Descrição                          |
|---------------|------------------------------------|
| `npm run dev` | Inicia o servidor com hot-reload   |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm run start` | Inicia servidor compilado (`dist`) |

## Deploy (Cloud Run)

```bash
gcloud run deploy magic-ecomerce-api \
    --source . \
    --region us-central1 \
    --project magic-ecomerce \
    --allow-unauthenticated
```

## Rotas Principais

- `GET/POST /products` — Listagem e criação de produtos
- `PATCH/DELETE /products/:id` — Edição e remoção de produtos
- `POST /admin/*` — Rotas administrativas (requerem `x-admin-key`)
- `GET /leitor` — Interface HTML de leitura de estoque

## Licença

MIT
