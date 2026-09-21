import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import prisma from '../src/prisma.js';
import { getAdminAuthToken, getDriverAuthToken } from './setup.js';

describe('CRM & WhatsApp Endpoints', () => {
  const adminToken = getAdminAuthToken();
  const driverToken = getDriverAuthToken();
  let createdQuickReplyId: number;

  it('GET /api/crm/status sin autenticación debe responder 401', async () => {
    const res = await request(app).get('/api/crm/status');
    expect(res.status).toBe(401);
  });

  it('GET /api/crm/status con rol no autorizado (DOMICILIARIO) debe responder 403', async () => {
    const res = await request(app)
      .get('/api/crm/status')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(403);
  });

  it('GET /api/crm/status con rol ADMIN debe responder 200 con estado de conexión', async () => {
    const res = await request(app)
      .get('/api/crm/status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });

  it('GET /api/crm/conversations debe responder 200 con array de conversaciones', async () => {
    const res = await request(app)
      .get('/api/crm/conversations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/crm/quick-replies debe responder 200 con las plantillas disponibles', async () => {
    const res = await request(app)
      .get('/api/crm/quick-replies')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/crm/quick-replies debe permitir crear una plantilla y DELETE eliminarla', async () => {
    const testShortcut = `/test_${Date.now().toString().slice(-6)}`;
    const createRes = await request(app)
      .post('/api/crm/quick-replies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        shortcut: testShortcut,
        title: 'Plantilla de Prueba Automatizada',
        content: 'Contenido de prueba para Vitest',
        category: 'INFO',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body.shortcut).toBe(testShortcut);
    createdQuickReplyId = createRes.body.id;

    // Eliminar la plantilla creada
    const deleteRes = await request(app)
      .delete(`/api/crm/quick-replies/${createdQuickReplyId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toHaveProperty('success', true);
  });

  it('GET /api/crm/loyalty debe responder 200 con métricas de fidelización y paginación', async () => {
    const res = await request(app)
      .get('/api/crm/loyalty')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('customers');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.customers)).toBe(true);
  });

  it('GET /api/crm/recurring debe responder 200 con listado de compras frecuentes', async () => {
    const res = await request(app)
      .get('/api/crm/recurring')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  afterAll(async () => {
    if (createdQuickReplyId) {
      await prisma.crmQuickReply.deleteMany({
        where: { id: createdQuickReplyId },
      });
    }
  });
});
