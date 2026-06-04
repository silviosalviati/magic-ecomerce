import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { productsRouter } from './products/products.routes';
import { adminRouter } from './admin/admin.routes';
import { checkoutRouter } from './checkout/checkout.routes';
import { ordersRouter } from './orders/orders.routes';
import { authRouter } from './auth/auth.routes';
import { prisma } from './config/database';
import { cleanupNonVariantPhotos } from './admin/photo-cleanup.service';
import { cleanupDuplicateProducts } from './products/product-merge-cleanup.service';
import { addSecurityHeaders } from './middlewares/security.middleware';

const app = express();
const PORT = process.env.PORT ?? 3001;
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT?.trim() || '30mb';

app.disable('x-powered-by');
const localApiOrigins = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
];
const productionWebOrigins = [
  'https://vistamagic.com.br',
  'https://www.vistamagic.com.br',
  'https://magic-ecomerce-web-731025483706.us-central1.run.app',
];

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname } = new URL(origin);
    const normalized = hostname.toLowerCase();
    return normalized === 'devtunnels.ms' || normalized.endsWith('.devtunnels.ms');
  } catch {
    return false;
  }
}

// ─── CORS controlado ─────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? Array.from(
    new Set([
      ...process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
      ...productionWebOrigins,
    ])
  )
  : [
    'http://localhost:3000',
    'http://localhost:5173',
    ...localApiOrigins,
    ...productionWebOrigins,
  ];

app.use(
  cors({
    origin: (origin, callback) => {
      // 🔓 Permite sem origin, allowlist explícita e subdomínios reais de devtunnels.ms
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origem não permitida — ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tunnel-Skip-AntiPhishing-Page'],
  })
);

// ─── Body parser com limite ───────────────────────────────────────────────────
app.use(addSecurityHeaders);
app.use(express.json({ limit: JSON_BODY_LIMIT }));

// ─── Rotas ───────────────────────────────────────────────────────────────────
app.use('/products', productsRouter);
app.use('/admin', adminRouter);
app.use('/checkout', checkoutRouter);
app.use('/orders', ordersRouter);
app.use('/auth', authRouter);

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'online',
      db: 'online',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV ?? 'development',
    });
  } catch (error) {
    console.error('[HEALTH] Falha ao consultar banco:', error);
    res.status(503).json({
      status: 'degraded',
      db: 'offline',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV ?? 'development',
    });
  }
});

// ─── Handler de rotas não encontradas ────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ─── Handler global de erros ──────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const knownError = err as Error & {
    status?: number;
    statusCode?: number;
    type?: string;
  };

  const status =
    knownError.statusCode ||
    knownError.status ||
    (knownError.type === 'entity.too.large' ? 413 : 500);

  if (status === 413) {
    res.status(413).json({
      error: 'As fotos sao muito grandes. Envie imagens menores e tente novamente.',
    });
    return;
  }

  console.error('[ERROR]', err.message);
  res.status(status).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Erro interno do servidor.'
        : err.message,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 MAGI.C API rodando na porta ${PORT}`);
  console.log(`🌍 Env: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`=========================================`);

  const shouldCleanupNonVariantPhotos =
    String(process.env.CLEANUP_NON_VARIANT_IMAGES || '').trim().toLowerCase() === 'true';

  if (shouldCleanupNonVariantPhotos) {
    cleanupNonVariantPhotos()
      .then((result) => {
        console.log('[cleanup][non-variant-photos] concluído', result);
      })
      .catch((error) => {
        console.error('[cleanup][non-variant-photos] falhou', error);
      });
  }

  const shouldCleanupDuplicateProducts =
    String(process.env.CLEANUP_DUPLICATE_PRODUCTS || '').trim().toLowerCase() === 'true';

  if (shouldCleanupDuplicateProducts) {
    cleanupDuplicateProducts()
      .then((result) => {
        console.log('[cleanup][duplicate-products] concluído', result);
      })
      .catch((error) => {
        console.error('[cleanup][duplicate-products] falhou', error);
      });
  }
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n[${signal}] Encerrando servidor...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ Conexão com DB encerrada. Bye!');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));