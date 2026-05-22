// ✅ DEVE ser a primeira instrução — carrega .env antes de qualquer import
import 'dotenv/config';

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path'; // 🧩 Importado para gerenciar caminhos de arquivos
import { productsRouter } from './products/products.routes';
import { adminRouter } from './admin/admin.routes';
import { prisma } from './config/database';

const app = express();
const PORT = process.env.PORT ?? 3001;
const localApiOrigins = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
];
const productionWebOrigins = [
  'https://vistamagic.com.br',
  'https://www.vistamagic.com.br',
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
    allowedHeaders: ['Content-Type', 'x-admin-key', 'X-Tunnel-Skip-AntiPhishing-Page'],
  })
);

// ─── Body parser com limite ───────────────────────────────────────────────────
app.use(express.json({ limit: '12mb' }));

// ─── Rotas ───────────────────────────────────────────────────────────────────
app.use('/products', productsRouter);
app.use('/admin', adminRouter);

// 🧶 ROTA: Serve o HTML do leitor direto pelo backend (Bypassa o Preflight do celular)
app.get('/leitor', (_req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'leitor-estoque.html'));
});

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
  console.error('[ERROR]', err.message);
  res.status(500).json({
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