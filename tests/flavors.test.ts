import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken, getDriverAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Production Flavors Catalog Endpoints (/api/production/flavors)', () => {
  const adminToken = getAdminAuthToken();
  const driverToken = getDriverAuthToken();

  let testFlavorId: number;
  let flavorWithHistoryId: number;
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testFlavorName = `Sabor Test ${uniqueSuffix}`;
  const flavorWithHistoryName = `Sabor Historial ${uniqueSuffix}`;

  beforeAll(async () => {
    // Asegurar que la tabla tenga datos iniciales
    await prisma.productFlavor.upsert({
      where: { name: 'Natural' },
      update: {},
      create: { name: 'Natural', isActive: true },
    });
  });

  // 1. Listado sin autenticación -> 401
  it('GET /api/production/flavors sin autenticación debe retornar 401', async () => {
    const res = await request(app).get('/api/production/flavors');
    expect(res.status).toBe(401);
  });

  // 2. Listado con autenticación -> 200
  it('GET /api/production/flavors con autenticación debe retornar lista de sabores', async () => {
    const res = await request(app)
      .get('/api/production/flavors')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const item = res.body[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('name');
    expect(item).toHaveProperty('isActive');
  });

  // 3. Filtrado de activos
  it('GET /api/production/flavors?activeOnly=true debe retornar solo sabores activos', async () => {
    const res = await request(app)
      .get('/api/production/flavors?activeOnly=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((flavor: any) => {
      expect(flavor.isActive).toBe(true);
    });
  });

  // 4. Creación sin autenticación -> 401
  it('POST /api/production/flavors sin token debe retornar 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/production/flavors')
      .send({ name: 'Mango Biche' });

    expect(res.status).toBe(401);
  });

  // 5. Creación con rol no autorizado (DOMICILIARIO) -> 403
  it('POST /api/production/flavors con rol DOMICILIARIO debe responder 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/production/flavors')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ name: 'Mango Biche' });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.code).toBe('FORBIDDEN_ROLE');
  });

  // 6. Creación exitosa por ADMIN -> 201 Created
  it('POST /api/production/flavors por ADMIN debe crear un nuevo sabor y retornar 201', async () => {
    const res = await request(app)
      .post('/api/production/flavors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: testFlavorName });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(testFlavorName);
    expect(res.body.isActive).toBe(true);

    testFlavorId = res.body.id;
  });

  // 7. Creación con espacios extra sanitizados
  it('POST /api/production/flavors con espacios múltiples debe sanitizar el nombre', async () => {
    const rawName = `  Arándanos    Silvestres   ${uniqueSuffix}  `;
    const cleanExpected = `Arándanos Silvestres ${uniqueSuffix}`;

    const res = await request(app)
      .post('/api/production/flavors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: rawName });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(cleanExpected);

    // Limpieza posterior
    await prisma.productFlavor.delete({ where: { id: res.body.id } }).catch(() => {});
  });

  // 8. Rechazo ante nombre vacío o solo espacios -> 400 Bad Request
  it('POST /api/production/flavors con nombre vacío o solo espacios debe responder 400', async () => {
    const res = await request(app)
      .post('/api/production/flavors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '     ' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // 9. Rechazo ante nombre duplicado (case-insensitive) -> 400 Bad Request
  it('POST /api/production/flavors con nombre duplicado (insensible a mayúsculas) debe responder 400', async () => {
    const res = await request(app)
      .post('/api/production/flavors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: testFlavorName.toUpperCase() });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Ya existe un sabor registrado');
  });

  // 10. Alternancia de estado activo/inactivo (toggle) -> 200
  it('PATCH /api/production/flavors/:id/toggle debe alternar el estado isActive del sabor', async () => {
    const toggle1 = await request(app)
      .patch(`/api/production/flavors/${testFlavorId}/toggle`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(toggle1.status).toBe(200);
    expect(toggle1.body.isActive).toBe(false);

    const toggle2 = await request(app)
      .patch(`/api/production/flavors/${testFlavorId}/toggle`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(toggle2.status).toBe(200);
    expect(toggle2.body.isActive).toBe(true);
  });

  // 11. Eliminación física segura cuando no tiene historial
  it('DELETE /api/production/flavors/:id debe eliminar el sabor si no tiene historial', async () => {
    const res = await request(app)
      .delete(`/api/production/flavors/${testFlavorId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const check = await prisma.productFlavor.findUnique({ where: { id: testFlavorId } });
    expect(check).toBeNull();
  });

  // 12. Baja lógica preventiva cuando el sabor tiene historial en lotes
  it('DELETE /api/production/flavors/:id debe ejecutar baja lógica (desactivar) si tiene historial', async () => {
    // 1. Crear sabor con historial
    const flavorRes = await request(app)
      .post('/api/production/flavors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: flavorWithHistoryName });
    expect(flavorRes.status).toBe(201);
    flavorWithHistoryId = flavorRes.body.id;

    // 2. Crear lote con este sabor para generar historial
    const batch = await prisma.productionBatch.create({
      data: {
        batchCode: `LOT-TEST-${uniqueSuffix}`,
        milkUsedLiters: 10,
        totalLitersProduced: 9.6,
        yieldPercentage: 96,
        flavor: flavorWithHistoryName,
        status: 'COMPLETADO',
      },
    });

    // 3. Intentar eliminar el sabor -> debe desactivarlo en lugar de borrarlo
    const deleteRes = await request(app)
      .delete(`/api/production/flavors/${flavorWithHistoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.deactivated).toBe(true);

    const check = await prisma.productFlavor.findUnique({ where: { id: flavorWithHistoryId } });
    expect(check).not.toBeNull();
    expect(check?.isActive).toBe(false);

    // Limpieza del lote y sabor de prueba
    await prisma.productionBatch.delete({ where: { id: batch.id } }).catch(() => {});
    await prisma.productFlavor.delete({ where: { id: flavorWithHistoryId } }).catch(() => {});
  });
});
