import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/prisma.js';
import { getAdminAuthToken, getDriverAuthToken } from './setup.js';

describe('Product Presentations Catalog Endpoints (/api/production/presentations)', () => {
  const adminToken = getAdminAuthToken();
  const driverToken = getDriverAuthToken();

  let testPresentationId: number;
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testPresentationName = `TEST_${uniqueSuffix}ml`;

  // 1. Sin autenticación -> 401
  it('GET /api/production/presentations sin autenticación debe retornar 401', async () => {
    const res = await request(app).get('/api/production/presentations');
    expect(res.status).toBe(401);
  });

  // 2. Listado con autenticación -> 200 con presentaciones sembradas
  it('GET /api/production/presentations con autenticación debe retornar lista de presentaciones', async () => {
    const res = await request(app)
      .get('/api/production/presentations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);

    // Debe contener las 3 presentaciones estándar
    const names = res.body.map((p: any) => p.name);
    expect(names).toContain('1L');
    expect(names).toContain('2L');
    expect(names).toContain('500ml');

    const p500 = res.body.find((p: any) => p.name === '500ml');
    expect(p500.capacityLiters).toBe(0.5);
    expect(p500.defaultPrice).toBe(8000);
  });

  // 3. Filtro activeOnly
  it('GET /api/production/presentations?activeOnly=true debe retornar solo presentaciones activas', async () => {
    const res = await request(app)
      .get('/api/production/presentations?activeOnly=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((p: any) => {
      expect(p.isActive).toBe(true);
    });
  });

  // 4. Control de Acceso: POST sin token -> 401
  it('POST /api/production/presentations sin token debe retornar 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/production/presentations')
      .send({
        name: '250ml',
        label: '250 ml (Porción Personal)',
        capacityLiters: 0.25,
        defaultPrice: 4500,
      });

    expect(res.status).toBe(401);
  });

  // 5. Control de Acceso: POST con rol DOMICILIARIO -> 403
  it('POST /api/production/presentations con rol DOMICILIARIO debe responder 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/production/presentations')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        name: '250ml',
        label: '250 ml (Porción Personal)',
        capacityLiters: 0.25,
        defaultPrice: 4500,
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  // 6. Creación exitosa por ADMIN -> 201
  it('POST /api/production/presentations por ADMIN debe crear una nueva presentación y retornar 201', async () => {
    const res = await request(app)
      .post('/api/production/presentations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testPresentationName,
        label: `Test ${uniqueSuffix} ml`,
        capacityLiters: 0.25,
        defaultPrice: 4500,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(testPresentationName);
    expect(res.body.capacityLiters).toBe(0.25);
    expect(res.body.defaultPrice).toBe(4500);
    expect(res.body.isActive).toBe(true);

    testPresentationId = res.body.id;
  });

  // 7. Validación: capacidad <= 0 debe responder 400
  it('POST /api/production/presentations con capacidad <= 0 debe responder 400', async () => {
    const res = await request(app)
      .post('/api/production/presentations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `BAD_${uniqueSuffix}`,
        label: 'Capacidad Inválida',
        capacityLiters: -1,
        defaultPrice: 5000,
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // 8. Validación: duplicado case-insensitive debe responder 400
  it('POST /api/production/presentations con nombre duplicado debe responder 400', async () => {
    const res = await request(app)
      .post('/api/production/presentations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testPresentationName.toLowerCase(),
        label: 'Duplicado',
        capacityLiters: 0.25,
        defaultPrice: 4500,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Ya existe una presentación registrada');
  });

  // 9. Actualización exitosa (PUT) -> 200
  it('PUT /api/production/presentations/:id debe actualizar precio y etiqueta', async () => {
    const res = await request(app)
      .put(`/api/production/presentations/${testPresentationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        label: `Test Editado ${uniqueSuffix}`,
        defaultPrice: 5200,
      });

    expect(res.status).toBe(200);
    expect(res.body.label).toBe(`Test Editado ${uniqueSuffix}`);
    expect(res.body.defaultPrice).toBe(5200);
  });

  // 10. Toggle de estado (PATCH) -> 200
  it('PATCH /api/production/presentations/:id/toggle debe alternar el estado isActive', async () => {
    const toggle1 = await request(app)
      .patch(`/api/production/presentations/${testPresentationId}/toggle`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(toggle1.status).toBe(200);
    expect(toggle1.body.isActive).toBe(false);

    const toggle2 = await request(app)
      .patch(`/api/production/presentations/${testPresentationId}/toggle`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(toggle2.status).toBe(200);
    expect(toggle2.body.isActive).toBe(true);
  });

  // 11. Eliminación segura -> 200
  it('DELETE /api/production/presentations/:id debe eliminar si no tiene historial', async () => {
    const res = await request(app)
      .delete(`/api/production/presentations/${testPresentationId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const check = await prisma.productPresentation.findUnique({
      where: { id: testPresentationId },
    });
    expect(check).toBeNull();
  });
});
