import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientPropertyName = '__prisma';
type GlobalWithPrisma = typeof globalThis & {
  [prismaClientPropertyName]?: PrismaClient;
};
const globalWithPrisma = globalThis as GlobalWithPrisma;

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('[DB] DATABASE_URL não definida.');

  const adapter = new PrismaPg({ connectionString: url });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['error'],
  });
}

export const prisma: PrismaClient =
  globalWithPrisma[prismaClientPropertyName] ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalWithPrisma[prismaClientPropertyName] = prisma;
}