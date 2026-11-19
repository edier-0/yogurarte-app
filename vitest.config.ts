import { defineConfig } from 'vitest/config';

// ----------------------------------------------------------------------------
// 🛡️ BLINDAJE DE SEGURIDAD CRÍTICO (DEVSECOPS):
// Queda terminantemente prohibido ejecutar Vitest contra bases de datos en la nube (Neon/AWS).
// ----------------------------------------------------------------------------
const candidateDb = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
const neonUrl = process.env.NEON_DATABASE_URL || '';
const isCloudOrProd = Boolean(
  candidateDb && (
    candidateDb.includes('neon.tech') || 
    candidateDb.includes('aws') || 
    (neonUrl && candidateDb === neonUrl)
  )
);

if (isCloudOrProd) {
  throw new Error(
    '\n🚨 ==============================================================================\n' +
    '⛔ BLOQUEO CRÍTICO DE SEGURIDAD: INTENTO DE TESTS EN PRODUCCIÓN (NEON / AWS)\n' +
    '==============================================================================\n' +
    'Está TERMINANTEMENTE PROHIBIDO ejecutar la suite de pruebas contra la base de\n' +
    'datos de producción o ramas remotas en la nube.\n' +
    'Las pruebas deben ejecutarse exclusivamente en Postgres local (localhost:5432) o en CI.\n' +
    '==============================================================================\n'
  );
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 35000,
    hookTimeout: 35000,
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false, // Ejecución secuencial para no generar colisiones de datos en el schema de prueba
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/yogurarte_test?schema=public',
      JWT_SECRET: 'test-jwt-secret-for-vitest-suite-32chars-min',
    },
  },
});
