import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Health and System Endpoints', () => {
  it('GET /api/health debe responder con estado 200 y status "ok"', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('app', 'YogurArte API');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('Ruta inexistente /api/ruta-que-no-existe debe responder 404 con JSON estructurado', async () => {
    const res = await request(app).get('/api/ruta-que-no-existe');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('no encontrada');
  });
});
