import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';

describe('Production Batches Endpoints', () => {
  const adminToken = getAdminAuthToken();

  it('GET /api/batches sin autenticación debe retornar 401', async () => {
    const res = await request(app).get('/api/batches');
    expect(res.status).toBe(401);
  });

  it('GET /api/batches con autenticación debe retornar lotes enriquecidos con métricas', async () => {
    const res = await request(app)
      .get('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const batch = res.body[0];
      expect(batch).toHaveProperty('id');
      expect(batch).toHaveProperty('batchCode');
      expect(batch).toHaveProperty('flavor');
      expect(batch).toHaveProperty('milkUsedLiters');
      expect(batch).toHaveProperty('totalLitersProduced');
      expect(batch).toHaveProperty('yieldPercentage');
    }
  });

  it('GET /api/batches/pending-orders debe retornar pedidos pendientes agrupados por sabor', async () => {
    const res = await request(app)
      .get('/api/batches/pending-orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
    expect(res.body).toHaveProperty('orders');
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  it('GET /api/batches/:id con ID inexistente debe responder 404', async () => {
    const res = await request(app)
      .get('/api/batches/999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/batches con leche negativa o cero debe fallar la validación Zod con 400', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: -5,
        flavor: 'Mora',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/batches solicitando una cantidad enorme de leche sin stock debe rechazar con 400', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: 999999, // Supera con creces el stock en inventario
        flavor: 'Arequipe',
        totalLitersProduced: 999999,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Stock insuficiente');
  });
});
