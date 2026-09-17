import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken, getDriverAuthToken } from './setup.js';

describe('Auth and Users Endpoints', () => {
  const adminToken = getAdminAuthToken();
  const driverToken = getDriverAuthToken();

  it('GET /api/users/public-list debe retornar la lista pública de usuarios activos sin passwords', async () => {
    const res = await request(app).get('/api/users/public-list');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const u = res.body[0];
      expect(u).toHaveProperty('id');
      expect(u).toHaveProperty('name');
      expect(u).toHaveProperty('username');
      expect(u).toHaveProperty('role');
      expect(u).not.toHaveProperty('password');
    }
  });

  it('POST /api/users/login con credenciales inválidas debe responder 401', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        username: 'nonexistent_user_9999',
        password: 'wrong_password',
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/users/login con payload vacío debe fallar la validación Zod con 400', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('details');
  });

  it('GET /api/users/me sin token debe responder 401 AUTH_REQUIRED', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('code', 'AUTH_REQUIRED');
  });

  it('GET /api/users/me con token corrupto/inválido debe responder 401 INVALID_TOKEN', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer token_invalido_12345');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('code', 'INVALID_TOKEN');
  });

  it('GET /api/users/me con token de admin válido debe retornar perfil del usuario', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('username', 'edier');
    expect(res.body.user).toHaveProperty('role', 'ADMIN');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('GET /api/users con rol no autorizado (DOMICILIARIO) debe responder 403 FORBIDDEN_ROLE', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('code', 'FORBIDDEN_ROLE');
  });

  it('GET /api/users con rol ADMIN debe retornar la lista de usuarios administrable', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
