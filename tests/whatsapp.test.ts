import { describe, it, expect } from 'vitest';
import { buildWhatsAppUrl as buildBackendWhatsAppUrl } from '../src/utils/whatsapp.utils.js';
import {
  buildWhatsAppUrl as buildFrontendWhatsAppUrl,
  isWhatsAppUsername,
  cleanContact,
  resolveContactInfo,
} from '../frontend/src/utils/whatsapp.js';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';

describe('WhatsApp URL Utility & Username Handling', () => {
  const adminToken = getAdminAuthToken();

  it('Backend buildWhatsAppUrl debe generar ?username= cuando recibe un @username o alias', () => {
    const url1 = buildBackendWhatsAppUrl('@lore_6020', '¡Hola Lore!');
    expect(url1).toBe('https://api.whatsapp.com/send/?username=lore_6020&text=%C2%A1Hola%20Lore!');

    const url2 = buildBackendWhatsAppUrl('TheChoma', 'Pedido recibido');
    expect(url2).toBe('https://api.whatsapp.com/send/?username=TheChoma&text=Pedido%20recibido');
  });

  it('Backend buildWhatsAppUrl debe generar ?phone= con 57 para números colombianos', () => {
    const url = buildBackendWhatsAppUrl('3001234567', 'Hola');
    expect(url).toBe('https://api.whatsapp.com/send/?phone=573001234567&text=Hola');
  });

  it('Frontend buildWhatsAppUrl debe generar URL compatible con ?username= y ?phone=', () => {
    const usernameUrl = buildFrontendWhatsAppUrl('@lore_6020', 'Hola mundo');
    expect(usernameUrl).toBe('https://api.whatsapp.com/send/?username=lore_6020&text=Hola%20mundo');

    const phoneUrl = buildFrontendWhatsAppUrl('3001234567', 'Hola mundo');
    expect(phoneUrl).toBe('https://api.whatsapp.com/send/?phone=573001234567&text=Hola%20mundo');

    const emptyUrl = buildFrontendWhatsAppUrl('', 'Mensaje solo');
    expect(emptyUrl).toBe('https://api.whatsapp.com/send/?text=Mensaje%20solo');
  });

  it('Frontend isWhatsAppUsername debe detectar correctamente usernames y teléfonos', () => {
    expect(isWhatsAppUsername('@lore_6020')).toBe(true);
    expect(isWhatsAppUsername('TheChoma')).toBe(true);
    expect(isWhatsAppUsername('@jose.garcia')).toBe(true);
    expect(isWhatsAppUsername('3001234567')).toBe(false);
    expect(isWhatsAppUsername('+57 300 123 4567')).toBe(false);
  });

  it('Frontend resolveContactInfo debe extraer adecuadamente el identificador y formato', () => {
    const infoUser = resolveContactInfo({ phoneNumber: '@thechoma' }, null);
    expect(infoUser.isUsername).toBe(true);
    expect(infoUser.displayLabel).toBe('@thechoma');

    const infoPhone = resolveContactInfo({ phoneNumber: '3001234567' }, null);
    expect(infoPhone.isUsername).toBe(false);
    expect(infoPhone.identifier).toBe('3001234567');
  });

  it('POST /api/crm/send debe arrojar un error descriptivo en español cuando es un username sin JID conocido', async () => {
    const res = await request(app)
      .post('/api/crm/send')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        recipient: '@usuario_desconocido_123',
        text: 'Hola desde CRM',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('nombre de usuario');
    expect(res.body.error).toContain('WhatsApp oficial');
  });

  it('whatsappService.getStatus debe auto-reconciliar el estado a CONNECTED si existe un usuario autenticado en el socket', async () => {
    const { default: whatsappService } = await import('../src/services/whatsapp.service.js');
    (whatsappService as any).sock = {
      user: { id: '573001234567:1@s.whatsapp.net', name: 'YogurArte' },
    };
    (whatsappService as any).status = 'CONNECTING';

    const status = whatsappService.getStatus();
    expect(status.status).toBe('CONNECTED');
    expect(status.phoneNumber).toBe('573001234567');
    expect(status.user).toEqual({ id: '573001234567:1@s.whatsapp.net', name: 'YogurArte' });

    // Restaurar estado
    (whatsappService as any).sock = null;
    (whatsappService as any).status = 'DISCONNECTED';
  });

  it('whatsappService.getStatus debe ser una consulta pura (sin efectos secundarios ni disparar auto-init en DISCONNECTED)', async () => {
    const { default: whatsappService } = await import('../src/services/whatsapp.service.js');
    (whatsappService as any).sock = null;
    (whatsappService as any).status = 'DISCONNECTED';
    (whatsappService as any).isInitializing = false;

    const status = whatsappService.getStatus();
    expect(status.status).toBe('DISCONNECTED');
    expect(status.user).toBeNull();
    expect(status.phoneNumber).toBeNull();
    // Debe permanecer en DISCONNECTED sin mutar a CONNECTING
    expect((whatsappService as any).isInitializing).toBe(false);
  });
});

