import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken, getDriverAuthToken } from './setup.js';

describe('System Settings Endpoints', () => {
  const adminToken = getAdminAuthToken();
  const driverToken = getDriverAuthToken();

  it('GET /api/settings sin autenticación debe responder 401', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
  });

  it('GET /api/settings con autenticación debe retornar el mapa de configuración', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('nequiNumber');
    expect(res.body).toHaveProperty('bankName');
    expect(res.body).toHaveProperty('bankHolder');
  });

  it('PUT /api/settings con rol no ADMIN (DOMICILIARIO) debe responder 403', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        nequiNumber: '3001234567',
      });

    expect(res.status).toBe(403);
  });

  it('PUT /api/settings con datos inválidos debe fallar validación con 400', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nequiNumber: '123', // Menos de 7 caracteres
      });

    expect(res.status).toBe(400);
  });

  it('PUT /api/settings con rol ADMIN debe actualizar los parámetros correctamente', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nequiNumber: '3024581882',
        bankName: 'Nequi / Bancolombia',
        bankHolder: 'Edier / YogurArte',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('settings');
    expect(res.body.settings.nequiNumber).toBe('3024581882');
  });
});
