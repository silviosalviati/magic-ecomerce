# Magic E-commerce API

Backend de e-commerce desenvolvido em **Node.js + TypeScript**, com suporte a gestão de produtos, variantes, estoque, pedidos e integração com **Google Cloud** (Storage e Vertex AI).

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
cp .env.example .env
# Edite o .env com suas credenciais

# Executar migrações
npx prisma migrate deploy

# Iniciar em modo desenvolvimento
npm run dev
```

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz com as seguintes variáveis:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
PORT=3001
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
ADMIN_API_KEY="sua-chave-secreta"
GCP_PROJECT_ID="seu-projeto-gcp"
GCP_BUCKET_NAME="seu-bucket"
GOOGLE_APPLICATION_CREDENTIALS="./secrets/gcp-key.json"
```

> **Atenção:** Nunca commite o arquivo `.env` nem a pasta `secrets/` (já estão no `.gitignore`).

## Scripts

| Comando       | Descrição                          |
|---------------|------------------------------------|
| `npm run dev` | Inicia o servidor com hot-reload   |

## Rotas Principais

- `GET/POST /products` — Listagem e criação de produtos
- `PATCH/DELETE /products/:id` — Edição e remoção de produtos
- `POST /admin/*` — Rotas administrativas (requerem `x-admin-key`)
- `GET /leitor` — Interface HTML de leitura de estoque

## Licença

MIT
