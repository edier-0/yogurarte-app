import { defineConfig } from 'vitest/config';

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
      DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/yogurarte_db?schema=yogurarte_test',
      JWT_SECRET: 'test-jwt-secret-for-vitest-suite-32chars-min',
    },
  },
});
