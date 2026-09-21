import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Aumentar timeout por defecto para transacciones interactivas contra Neon PostgreSQL en la nube
const originalTransaction = prisma.$transaction.bind(prisma);
prisma.$transaction = ((arg: any, options?: any) => {
  if (typeof arg === 'function') {
    return originalTransaction(arg, {
      maxWait: 15000,
      timeout: 30000,
      ...options,
    });
  }
  return originalTransaction(arg, options);
}) as any;

export default prisma;
