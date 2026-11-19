import { PrismaClient } from '@prisma/client';

// ----------------------------------------------------------------------------
// 🛡️ BLINDAJE DEFENSE-IN-DEPTH (DEVSECOPS):
// Bloqueo total si PrismaClient intenta instanciarse en modo test contra Neon/AWS
// ----------------------------------------------------------------------------
if (process.env.NODE_ENV === 'test') {
  const dbUrl = process.env.DATABASE_URL || '';
  const neonUrl = process.env.NEON_DATABASE_URL || '';
  if (dbUrl.includes('neon.tech') || dbUrl.includes('aws') || (neonUrl && dbUrl === neonUrl)) {
    throw new Error('⛔ DEFENSE-IN-DEPTH: Intento de instanciar PrismaClient en NODE_ENV=test contra base de datos remota/producción (Neon). Abortando.');
  }
}

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
