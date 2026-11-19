import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Spec 015 — API REST de Recetas (/api/recipes)', () => {
  const adminToken = getAdminAuthToken();
  const operatorToken = getAdminAuthToken({ id: 98, role: 'PRODUCCION', username: 'planta_test' });

  let testRawMaterial: any;
  let testPresentation: any;
  let createdRecipeId: number;

  beforeAll(async () => {
    // Asegurar materia prima de prueba
    testRawMaterial = await prisma.rawMaterial.upsert({
      where: { code: 'TEST_MAT_RECIPE_01' },
      update: { avgCost: 5000, currentStock: 50 },
      create: {
        code: 'TEST_MAT_RECIPE_01',
        name: 'Insumo Test Receta',
        category: 'MATERIA_PRIMA',
        unit: 'Kilogramos',
        avgCost: 5000,
        currentStock: 50,
      },
    });

    // Asegurar presentación de prueba
    testPresentation = await prisma.productPresentation.findFirst({
      where: { isActive: true },
    });
  });

  afterAll(async () => {
    if (createdRecipeId) {
      await prisma.recipeStep.deleteMany({ where: { recipeId: createdRecipeId } });
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: createdRecipeId } });
      await prisma.recipe.deleteMany({ where: { id: createdRecipeId } });
    }
  });

  describe('GET /api/recipes (Listado y Censura RBAC)', () => {
    it('debe listar recetas para un usuario ADMIN con campos de costo', async () => {
      const res = await request(app)
        .get('/api/recipes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      // Al ser admin, el objeto puede incluir campos monetarios calculados
      const first = res.body[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('code');
      expect(first).toHaveProperty('category');
    });

    it('debe listar recetas para un usuario PRODUCCION censurando costos', async () => {
      const res = await request(app)
        .get('/api/recipes')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const recipe of res.body) {
        expect(recipe.totalCost).toBeUndefined();
        expect(recipe.theoreticalUnitCost).toBeUndefined();
        expect(recipe.baseLitersCost).toBeUndefined();
      }
    });

    it('debe filtrar correctamente por categoría', async () => {
      const res = await request(app)
        .get('/api/recipes?category=FASE_B')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.every((r: any) => r.category === 'FASE_B')).toBe(true);
    });
  });

  describe('POST /api/recipes (Creación y RBAC)', () => {
    it('debe denegar con 403 la creación a un usuario con rol PRODUCCION', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          name: 'Intento Ilegal de Receta',
          code: 'REC-FORBIDDEN-01',
          category: 'FASE_A',
          baseYield: 10,
          yieldUnit: 'Litros',
          ingredients: [{ rawMaterialId: testRawMaterial.id, quantity: 2, unit: 'Kg' }],
        });

      expect(res.status).toBe(403);
    });

    it('debe permitir a un ADMIN crear una receta con ingredientes y pasos atómicamente', async () => {
      const payload = {
        name: 'Receta API Test Fresa',
        code: `REC-API-TEST-${Date.now()}`,
        category: 'FASE_B',
        flavor: 'Fresa',
        description: 'Receta creada desde test de integración',
        baseLiters: 10.0,
        baseYield: 11.0,
        yieldUnit: 'Litros',
        ingredients: [
          { rawMaterialId: testRawMaterial.id, quantity: 1.5, unit: 'Kilogramos', notes: 'Fruta base' },
        ],
        steps: [
          {
            stepNumber: 1,
            title: 'Inoculación inicial',
            description: 'Atemperar mezcla a 10 °C',
            estimatedMinutes: 10,
            temperatureTarget: 10,
            qualityCheck: 'Verificar temperatura',
          },
        ],
      };

      const res = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.code).toBe(payload.code);
      expect(res.body.ingredients.length).toBe(1);
      expect(res.body.steps.length).toBe(1);

      createdRecipeId = res.body.id;
    });
  });

  describe('GET /api/recipes/:id (Detalle de Receta)', () => {
    it('debe devolver 404 para una receta inexistente', async () => {
      const res = await request(app)
        .get('/api/recipes/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('debe devolver el detalle con cálculo teórico para ADMIN', async () => {
      const res = await request(app)
        .get(`/api/recipes/${createdRecipeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdRecipeId);
      expect(res.body.totalCost).toBeDefined();
      expect(res.body.theoreticalUnitCost).toBeDefined();
      expect(res.body.steps[0].title).toBe('Inoculación inicial');
    });

    it('debe devolver el detalle sin costos para PRODUCCION', async () => {
      const res = await request(app)
        .get(`/api/recipes/${createdRecipeId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdRecipeId);
      expect(res.body.totalCost).toBeUndefined();
      expect(res.body.theoreticalUnitCost).toBeUndefined();
      expect(res.body.ingredients[0].avgCost).toBeUndefined();
      expect(res.body.steps[0].title).toBe('Inoculación inicial');
    });
  });

  describe('PUT /api/recipes/:id y PATCH /api/recipes/:id/archive', () => {
    it('debe permitir a ADMIN actualizar nombre y rendimiento base', async () => {
      const res = await request(app)
        .put(`/api/recipes/${createdRecipeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Receta API Test Modificada',
          baseYield: 11.5,
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Receta API Test Modificada');
      expect(res.body.baseYield).toBe(11.5);
    });

    it('debe conmutar el archivado lógico de la receta', async () => {
      const res = await request(app)
        .patch(`/api/recipes/${createdRecipeId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ARCHIVADA');

      // Conmutar de vuelta a ACTIVA
      const res2 = await request(app)
        .patch(`/api/recipes/${createdRecipeId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('ACTIVA');
    });
  });

  describe('GET /api/recipes/:id/simulate/:presentationId (Simulador de Presentación)', () => {
    it('debe calcular la rentabilidad proyectada para una presentación comercial en ADMIN', async () => {
      if (!testPresentation) return;

      const res = await request(app)
        .get(`/api/recipes/${createdRecipeId}/simulate/${testPresentation.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.presentation).toBeDefined();
      expect(res.body.liquidCost).toBeDefined();
      expect(res.body.totalUnitCost).toBeDefined();
      expect(res.body.marginPercentage).toBeDefined();
      expect(['GREEN', 'YELLOW', 'RED']).toContain(res.body.marginStatus);
    });
  });
});
