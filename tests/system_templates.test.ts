import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import prisma from '../src/prisma.js';
import { getAdminAuthToken, getDriverAuthToken } from './setup.js';
import {
  interpolateTemplate,
  renderSystemTemplate,
  ORDER_STATUS_LABELS,
} from '../src/modules/crm/crm.service.js';
import { CANONICAL_SYSTEM_TEMPLATES } from '../src/modules/crm/system-templates.constants.js';

describe('System WhatsApp Templates (Spec 014)', () => {
  const adminToken = getAdminAuthToken();
  const driverToken = getDriverAuthToken();
  const salesToken = getAdminAuthToken({ role: 'VENTAS', username: 'ventas_test' });

  beforeAll(async () => {
    // Asegurar que las 9 plantillas canónicas estén presentes en la base de datos de test
    for (const tpl of CANONICAL_SYSTEM_TEMPLATES) {
      await prisma.systemWhatsAppTemplate.upsert({
        where: { code: tpl.code },
        update: {
          title: tpl.title,
          category: tpl.category,
          description: tpl.description,
          defaultContent: tpl.defaultContent,
          availableVariables: JSON.stringify(tpl.availableVariables),
        },
        create: {
          code: tpl.code,
          title: tpl.title,
          category: tpl.category,
          description: tpl.description,
          content: tpl.defaultContent,
          defaultContent: tpl.defaultContent,
          availableVariables: JSON.stringify(tpl.availableVariables),
          autoTrigger: tpl.autoTrigger,
        },
      });
    }
  });

  describe('REST Endpoints & RBAC Security', () => {
    it('GET /api/crm/system-templates sin autenticación debe responder 401', async () => {
      const res = await request(app).get('/api/crm/system-templates');
      expect(res.status).toBe(401);
    });

    it('GET /api/crm/system-templates con rol no autorizado (DOMICILIARIO) debe responder 403', async () => {
      const res = await request(app)
        .get('/api/crm/system-templates')
        .set('Authorization', `Bearer ${driverToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/crm/system-templates con rol ADMIN debe responder 200 y listar las 9 plantillas canónicas', async () => {
      const res = await request(app)
        .get('/api/crm/system-templates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(9);

      const codes = res.body.map((t: any) => t.code);
      expect(codes).toContain('ORDER_STATUS_TRACKING');
      expect(codes).toContain('DELIVERY_IN_ROUTE_SHORT');
      expect(codes).toContain('DELIVERY_IN_ROUTE_FULL');
      expect(codes).toContain('DELIVERED_PAID');
      expect(codes).toContain('DELIVERED_UNPAID');
      expect(codes).toContain('PAID_NOT_DELIVERED');
      expect(codes).toContain('PAYMENT_REMINDER');
      expect(codes).toContain('LOYALTY_PROGRESS');
      expect(codes).toContain('LOYALTY_REWARD_CLAIM');

      // Validar estructura de campos
      const first = res.body[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('code');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('category');
      expect(first).toHaveProperty('description');
      expect(first).toHaveProperty('content');
      expect(first).toHaveProperty('defaultContent');
      expect(first).toHaveProperty('availableVariables');
      expect(first).toHaveProperty('autoTrigger');
    });

    it('GET /api/crm/system-templates con rol VENTAS debe responder 200 (lectura permitida)', async () => {
      const res = await request(app)
        .get('/api/crm/system-templates')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('PUT /api/crm/system-templates/:id sin autenticación debe responder 401', async () => {
      const res = await request(app).put('/api/crm/system-templates/1').send({
        content: 'Nuevo texto de prueba',
      });
      expect(res.status).toBe(401);
    });

    it('PUT /api/crm/system-templates/:id con rol no ADMIN (VENTAS o DOMICILIARIO) debe responder 403', async () => {
      const resSales = await request(app)
        .put('/api/crm/system-templates/1')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ content: 'Intento de edicion por ventas' });
      expect(resSales.status).toBe(403);

      const resDriver = await request(app)
        .put('/api/crm/system-templates/1')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ content: 'Intento de edicion por domiciliario' });
      expect(resDriver.status).toBe(403);
    });

    it('PUT /api/crm/system-templates/:id con contenido vacío o espacios debe responder 400 (RF-10)', async () => {
      // Obtener ID de una plantilla existente
      const tpl = await prisma.systemWhatsAppTemplate.findFirst({
        where: { code: 'ORDER_STATUS_TRACKING' },
      });
      expect(tpl).toBeTruthy();

      const resEmpty = await request(app)
        .put(`/api/crm/system-templates/${tpl!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: '' });
      expect(resEmpty.status).toBe(400);

      const resSpaces = await request(app)
        .put(`/api/crm/system-templates/${tpl!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: '    \n  \t  ' });
      expect(resSpaces.status).toBe(400);
    });

    it('PUT /api/crm/system-templates/:id con ID inexistente debe responder 404', async () => {
      const res = await request(app)
        .put('/api/crm/system-templates/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'Texto valido' });
      expect(res.status).toBe(404);
    });

    it('PUT /api/crm/system-templates/:id con ADMIN y datos válidos debe actualizar content y autoTrigger (RF-9, RF-14)', async () => {
      const tpl = await prisma.systemWhatsAppTemplate.findFirst({
        where: { code: 'DELIVERED_PAID' },
      });
      expect(tpl).toBeTruthy();

      const nuevoTexto = '¡Hola {{cliente}}! Gracias por tu compra pagada. Pedido #{{pedido}} entregado con éxito.';
      const res = await request(app)
        .put(`/api/crm/system-templates/${tpl!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: nuevoTexto,
          autoTrigger: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.content).toBe(nuevoTexto);
      expect(res.body.autoTrigger).toBe(true);

      // Verificar persistencia en base de datos
      const updated = await prisma.systemWhatsAppTemplate.findUnique({
        where: { id: tpl!.id },
      });
      expect(updated?.content).toBe(nuevoTexto);
      expect(updated?.autoTrigger).toBe(true);
    });

    it('POST /api/crm/system-templates/:id/reset sin autenticación debe responder 401', async () => {
      const res = await request(app).post('/api/crm/system-templates/1/reset');
      expect(res.status).toBe(401);
    });

    it('POST /api/crm/system-templates/:id/reset con rol no ADMIN debe responder 403', async () => {
      const res = await request(app)
        .post('/api/crm/system-templates/1/reset')
        .set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(403);
    });

    it('POST /api/crm/system-templates/:id/reset con ADMIN debe restablecer content a defaultContent (RF-12)', async () => {
      const tpl = await prisma.systemWhatsAppTemplate.findFirst({
        where: { code: 'DELIVERED_PAID' },
      });
      expect(tpl).toBeTruthy();

      const res = await request(app)
        .post(`/api/crm/system-templates/${tpl!.id}/reset`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.content).toBe(tpl!.defaultContent);

      const refreshed = await prisma.systemWhatsAppTemplate.findUnique({
        where: { id: tpl!.id },
      });
      expect(refreshed?.content).toBe(tpl!.defaultContent);
    });

    it('GET /api/orders/:id/whatsapp debe compilar el mensaje usando la plantilla canónica correspondiente (RF-1)', async () => {
      const order = await prisma.order.findFirst({
        include: { customer: true, items: true },
      });
      if (order) {
        const res = await request(app)
          .get(`/api/orders/${order.id}/whatsapp`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('whatsappUrl');
        expect(res.body).toHaveProperty('rawMessage');
        expect(res.body).toHaveProperty('templateCode');
        expect(res.body.rawMessage).toContain('YogurArte');
      }
    });
  });

  describe('Motor de Compilación e Interpolación Pura (RF-19 a RF-27)', () => {
    it('Diccionario de estados canónicos debe traducir fielmente los 6 estados de entrega (RF-21)', () => {
      expect(ORDER_STATUS_LABELS['PENDING']).toBe('🕒 Pendiente por preparar');
      expect(ORDER_STATUS_LABELS['PREPARING']).toBe('🥣 En preparación');
      expect(ORDER_STATUS_LABELS['READY_FOR_DISPATCH']).toBe('📦 Listo para despacho');
      expect(ORDER_STATUS_LABELS['IN_ROUTE']).toBe('🛵 En camino');
      expect(ORDER_STATUS_LABELS['DELIVERED']).toBe('✅ Entregado');
      expect(ORDER_STATUS_LABELS['CANCELLED']).toBe('❌ Cancelado');
    });

    it('interpolateTemplate debe reemplazar todas las 14 variables dinámicas soportadas', () => {
      const rawTemplate = [
        'Cliente: {{cliente}}',
        'Pedido: {{pedido}}',
        'Estado: {{estado}}',
        'Productos: {{productos}}',
        'Total: {{total}}',
        'Saldo: {{saldo_pendiente}}',
        'Abono: {{abono}}',
        'Dirección: {{direccion}}',
        'Nequi: {{nequi}}',
        'Banco: {{banco}}',
        'Instagram: {{instagram}}',
        'Acumuladas: {{botellas_acumuladas}}',
        'Restantes: {{botellas_restantes}}',
        'Premios: {{premios_disponibles}}',
      ].join('\n');

      const data = {
        cliente: 'Carlos Mendoza',
        pedido: 'PED-1024',
        estado: 'PREPARING',
        productos: '• 2x 1L (Fresa) - $24.000 COP',
        total: 24000,
        saldo_pendiente: 10000,
        abono: 14000,
        direccion: 'Calle 13 # 10-20',
        nequi: '3024581882',
        banco: 'Nequi / Bancolombia',
        instagram: 'https://instagram.com/yogurarte.co',
        botellas_acumuladas: 8.5,
        botellas_restantes: 1.5,
        premios_disponibles: 1,
      };

      const result = interpolateTemplate(rawTemplate, data);

      expect(result).toContain('Cliente: Carlos Mendoza');
      expect(result).toContain('Pedido: PED-1024');
      expect(result).toContain('Estado: 🥣 En preparación');
      expect(result).toContain('Productos: • 2x 1L (Fresa) - $24.000 COP');
      expect(result).toContain('Total: $ 24.000 COP');
      expect(result).toContain('Saldo: $ 10.000 COP');
      expect(result).toContain('Abono: $ 14.000 COP');
      expect(result).toContain('Dirección: Calle 13 # 10-20');
      expect(result).toContain('Nequi: 3024581882');
      expect(result).toContain('Banco: Nequi / Bancolombia');
      expect(result).toContain('Instagram: https://instagram.com/yogurarte.co');
      expect(result).toContain('Acumuladas: 8.5');
      expect(result).toContain('Restantes: 1.5');
      expect(result).toContain('Premios: 1');
    });

    it('interpolateTemplate debe aplicar fallbacks seguros cuando faltan datos (RF-20, RF-22, RF-23, RF-24)', () => {
      const template = 'Hola {{cliente}}, tu pedido #{{pedido}} va a {{direccion}}. Saldo: {{saldo_pendiente}}. Nequi: {{nequi}}, Banco: {{banco}}, IG: {{instagram}}.';

      const result = interpolateTemplate(template, {
        pedido: 'PED-999',
        saldo_pendiente: 0, // Pagado
      });

      expect(result).toContain('Hola Cliente'); // Fallback nombre (RF-22)
      expect(result).toContain('tu pedido #PED-999');
      expect(result).toContain('va a Entrega en punto de venta / Sin dirección registrada'); // Fallback dirección (RF-23)
      expect(result).toContain('Saldo: $0 COP (Paz y Salvo)'); // Fallback saldo pagado (RF-24)
      expect(result).toContain('Nequi: 3024581882'); // Fallback Nequi
      expect(result).toContain('Banco: Nequi / Bancolombia'); // Fallback Banco
      expect(result).toContain('IG: https://www.instagram.com/yogurartesanalfonseca'); // Fallback IG
    });

    it('interpolateTemplate debe formatear botellas enteras sin decimales y fraccionadas con 1 decimal (RF-27)', () => {
      const template = 'Acumuladas: {{botellas_acumuladas}} | Restantes: {{botellas_restantes}}';

      // Enteros
      const resultEnteros = interpolateTemplate(template, {
        botellas_acumuladas: 10,
        botellas_restantes: 0,
      });
      expect(resultEnteros).toBe('Acumuladas: 10 | Restantes: 0');

      // Fracciones
      const resultFracciones = interpolateTemplate(template, {
        botellas_acumuladas: 7.5,
        botellas_restantes: 2.5,
      });
      expect(resultFracciones).toBe('Acumuladas: 7.5 | Restantes: 2.5');
    });

    it('interpolateTemplate no debe fallar con caracteres especiales en el contenido (Caso Límite 3)', () => {
      const template = 'Precios con $ y barras \\ y formato *negrita* y _cursiva_ para {{cliente}}';
      const result = interpolateTemplate(template, { cliente: 'Juan' });
      expect(result).toBe('Precios con $ y barras \\ y formato *negrita* y _cursiva_ para Juan');
    });

    it('renderSystemTemplate debe compilar una plantilla desde DB o fallback canónico en memoria si no existe (RF-20)', async () => {
      const compiled = await renderSystemTemplate('ORDER_STATUS_TRACKING', {
        cliente: 'Laura Gómez',
        pedido: 'PED-100',
        estado: 'IN_ROUTE',
        total: 12000,
        saldo_pendiente: 0,
      });

      expect(compiled).toContain('¡Hola *Laura Gómez*!');
      expect(compiled).toContain('*🛵 En camino*');
      expect(compiled).toContain('*Total:* $ 12.000 COP');
      expect(compiled).toContain('$0 COP (Paz y Salvo)');
    });
  });
});
