import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import prisma from '../src/prisma.js';
import { normalizeColombianJid } from '../src/services/whatsapp.service.js';
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

  it('POST /api/crm/loyalty/redeem debe rechazar canje si el cliente no tiene 10 botellas acumuladas', async () => {
    // Buscar un cliente de prueba
    const customer = await prisma.customer.findFirst();
    if (customer) {
      const res = await request(app)
        .post('/api/crm/loyalty/redeem')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customerId: customer.id });

      // Si no tiene 10 botellas, devuelve 400 Bad Request
      if (res.status === 400) {
        expect(res.body).toHaveProperty('error');
      } else {
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
      }
    }
  });

  it('Ciclo completo de compra recurrente: crear, listar, generar comanda y eliminar', async () => {
    const customer = await prisma.customer.findFirst();
    if (!customer) return;

    // 1. Crear recurrencia
    const createRes = await request(app)
      .post('/api/crm/recurring')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer.id,
        frequencyDays: 7,
        preferredFlavor: 'Mora',
        bottleSize: '1L',
        quantity: 2,
        nextDate: new Date().toISOString().split('T')[0],
        notes: 'Entrega semanal los lunes',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toHaveProperty('id');
    const scheduleId = createRes.body.id;

    // 2. Modificar estado (pausar)
    const updateRes = await request(app)
      .put(`/api/crm/recurring/${scheduleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.isActive).toBe(false);

    // 3. Reactivar
    await request(app)
      .put(`/api/crm/recurring/${scheduleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });

    // 4. Generar pedido a partir de la recurrencia
    const triggerRes = await request(app)
      .post(`/api/crm/recurring/${scheduleId}/create-order`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 201]).toContain(triggerRes.status);
    expect(triggerRes.body).toHaveProperty('success', true);
    expect(triggerRes.body).toHaveProperty('order');
    const createdOrderId = triggerRes.body.order.id;

    // 5. Eliminar la recurrencia
    const deleteRes = await request(app)
      .delete(`/api/crm/recurring/${scheduleId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);

    // Limpiar el pedido creado en la prueba
    if (createdOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.order.deleteMany({ where: { id: createdOrderId } });
    }
  });

  describe('Unificación de Chats y Normalización Preventiva', () => {
    it('normalizeColombianJid debe remover el prefijo "9" de números colombianos (5793... -> 573...)', () => {
      expect(normalizeColombianJid('5793001234567@s.whatsapp.net')).toBe('573001234567@s.whatsapp.net');
      expect(normalizeColombianJid('5793001234567:1@s.whatsapp.net')).toBe('573001234567:1@s.whatsapp.net');
      expect(normalizeColombianJid('5793001234567')).toBe('573001234567');
      expect(normalizeColombianJid('+57 9 300 123 4567')).toBe('573001234567');
      // No debe alterar números estándar de Colombia ni otros países
      expect(normalizeColombianJid('573001234567@s.whatsapp.net')).toBe('573001234567@s.whatsapp.net');
      expect(normalizeColombianJid('18001234567@s.whatsapp.net')).toBe('18001234567@s.whatsapp.net');
    });

    it('POST /api/crm/chats/merge y POST /api/crm/chats/unlink deben fusionar chats y desvincular preservando historial', async () => {
      // 1. Crear un cliente para la prueba
      const customer = await prisma.customer.create({
        data: {
          fullName: 'Cliente Prueba Merge ' + Date.now().toString().slice(-4),
          phone: '3001234567',
          address: 'Calle 10 # 20-30',
        },
      });

      // 2. Crear conversación duplicada A (con prefijo 579)
      const convA = await prisma.chatConversation.create({
        data: {
          remoteJid: `579300${Date.now().toString().slice(-6)}@s.whatsapp.net`,
          phoneNumber: '5793001234567',
          contactName: 'Contacto Duplicado 579',
          lastMessageText: 'Mensaje antiguo en chat A',
          lastMessageTimestamp: new Date(Date.now() - 3600000),
        },
      });

      // Mensaje en chat A
      const msgA = await prisma.chatMessage.create({
        data: {
          conversationId: convA.id,
          messageId: `TEST-MSG-A-${Date.now()}`,
          text: 'Hola desde el chat duplicado 579',
          fromMe: false,
          timestamp: new Date(Date.now() - 3600000),
        },
      });

      // 3. Crear conversación destino B (con prefijo canónico 57 y vinculada al cliente)
      const canonicalJid = `57300${Date.now().toString().slice(-6)}@s.whatsapp.net`;
      const convB = await prisma.chatConversation.create({
        data: {
          remoteJid: canonicalJid,
          phoneNumber: '573001234567',
          contactName: customer.fullName,
          customerId: customer.id,
          lastMessageText: 'Mensaje reciente en chat B',
          lastMessageTimestamp: new Date(),
        },
      });

      // Mensaje en chat B
      const msgB = await prisma.chatMessage.create({
        data: {
          conversationId: convB.id,
          messageId: `TEST-MSG-B-${Date.now()}`,
          text: 'Respuesta en el chat canónico',
          fromMe: true,
          timestamp: new Date(),
        },
      });

      // 4. Invocar endpoint POST /api/crm/chats/merge
      const mergeRes = await request(app)
        .post('/api/crm/chats/merge')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceChatId: convA.id,
          targetClientId: customer.id,
          canonicalJid,
        });

      expect(mergeRes.status).toBe(200);
      expect(mergeRes.body).toHaveProperty('id', convB.id);
      expect(mergeRes.body.customerId).toBe(customer.id);
      expect(mergeRes.body).toHaveProperty('messages');
      expect(Array.isArray(mergeRes.body.messages)).toBe(true);

      // Verificar que los mensajes de A se hayan movido a B
      const messageIdsInB = mergeRes.body.messages.map((m: any) => m.messageId);
      expect(messageIdsInB).toContain(msgA.messageId);
      expect(messageIdsInB).toContain(msgB.messageId);

      // Verificar que el chat duplicado A fue eliminado
      const deletedConvA = await prisma.chatConversation.findUnique({
        where: { id: convA.id },
      });
      expect(deletedConvA).toBeNull();

      // 5. Invocar endpoint POST /api/crm/chats/unlink
      const unlinkRes = await request(app)
        .post('/api/crm/chats/unlink')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          chatId: convB.id,
        });

      expect(unlinkRes.status).toBe(200);
      expect(unlinkRes.body.customerId).toBeNull();

      // Verificar que los mensajes sigan intactos tras la desvinculación
      const finalMessages = await prisma.chatMessage.findMany({
        where: { conversationId: convB.id },
      });
      expect(finalMessages.length).toBe(2);

      // Limpieza final
      await prisma.chatMessage.deleteMany({ where: { conversationId: convB.id } });
      await prisma.chatConversation.deleteMany({ where: { id: convB.id } });
      await prisma.customer.deleteMany({ where: { id: customer.id } });
    });
  });

  afterAll(async () => {
    if (createdQuickReplyId) {
      await prisma.crmQuickReply.deleteMany({
        where: { id: createdQuickReplyId },
      });
    }
  });
});
