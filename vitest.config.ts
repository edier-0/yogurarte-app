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
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&schema=yogurarte_test',
      JWT_SECRET: 'test-jwt-secret-for-vitest-suite-32chars-min',
    },
  },
});
