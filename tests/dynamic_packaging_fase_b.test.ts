import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/prisma.js';
import {
  packagingExtraItemSchema,
  batchPackagingSchema,
  updateBatchPackagingSchema,
} from '../src/modules/batches/batches.schema.js';
import {
  createBatchPackaging,
  updateBatchPackaging,
} from '../src/modules/batches/batches.service.js';

describe('Spec 011 — Envasado Dinámico en Fase B y Mono-Presentación', () => {
  describe('T1: Validación de Esquemas Zod', () => {
    it('debe aceptar gramsPerBottle opcional no negativo para insumos pesables', () => {
      const validItem = {
        rawMaterialId: 10,
        quantityUsed: 1.5,
        gramsPerBottle: 75,
        dosageUnit: 'g/und',
      };

      const result = packagingExtraItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gramsPerBottle).toBe(75);
      }
    });

    it('debe rechazar gramsPerBottle negativo', () => {
      const invalidItem = {
        rawMaterialId: 10,
        quantityUsed: 1.5,
        gramsPerBottle: -10,
      };

      const result = packagingExtraItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('debe seguir siendo compatible cuando gramsPerBottle no se provee', () => {
      const validLegacyItem = {
        rawMaterialId: 10,
        quantityUsed: 2.0,
        dosagePerLiter: 150,
      };

      const result = packagingExtraItemSchema.safeParse(validLegacyItem);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.gramsPerBottle).toBeUndefined();
        expect(result.data.quantityUsed).toBe(2.0);
      }
    });

    it('debe aceptar precio unitario en $0 COP para lotes de muestra o donación', () => {
      const payloadZeroPrice = {
        flavor: 'Mora',
        baseLitersUsed: 10,
        customContainers: [
          {
            containerName: '500ml',
            capacityLiters: 0.5,
            quantity: 20,
            price: 0,
            rawMaterialId: 15,
          },
        ],
        extraItems: [
          {
            rawMaterialId: 10,
            quantityUsed: 1.5,
            gramsPerBottle: 75,
          },
        ],
      };

      const result = batchPackagingSchema.safeParse(payloadZeroPrice);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customContainers?.[0].price).toBe(0);
        expect(result.data.extraItems?.[0].gramsPerBottle).toBe(75);
      }
    });

    it('debe aceptar fraccionamiento mono-presentación de 500ml sin obligar 1L o 2L', () => {
      const payload500ml = {
        flavor: 'Fresa',
        baseLitersUsed: 5,
        customContainers: [
          {
            containerName: '500ml',
            capacityLiters: 0.5,
            quantity: 10,
            price: 8000,
            rawMaterialId: 12,
          },
        ],
      };

      const result = batchPackagingSchema.safeParse(payload500ml);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bottles1L).toBe(0);
        expect(result.data.bottles2L).toBe(0);
        expect(result.data.customContainers).toHaveLength(1);
        expect(result.data.customContainers?.[0].capacityLiters).toBe(0.5);
      }
    });

    it('debe aceptar gramsPerBottle y precio 0 en actualización', () => {
      const updatePayload = {
        flavor: 'Fresa',
        baseLitersUsed: 6,
        extraItems: [
          {
            rawMaterialId: 10,
            quantityUsed: 1.8,
            gramsPerBottle: 90,
          },
        ],
      };

      const result = updateBatchPackagingSchema.safeParse(updatePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.extraItems?.[0].gramsPerBottle).toBe(90);
      }
    });
  });

  describe('T2: Servicio Backend de Creación Mono-Presentación (Fase B)', () => {
    let testBatchId: number;
    let bottle500MatId: number;
    let fruitMatId: number;
    let createdPackagingId: number;

    beforeAll(async () => {
      // Insumo de botella 500ml
      const bMat = await prisma.rawMaterial.create({
        data: {
          name: 'Envase 500ml Test Spec011',
          code: `ENV_500_TEST_${Date.now()}`,
          category: 'EMPAQUE',
          unit: 'und',
          currentStock: 40,
          avgCost: 500,
          isActive: true,
        },
      });
      bottle500MatId = bMat.id;

      // Insumo de fruta (pesable en kg)
      const fMat = await prisma.rawMaterial.create({
        data: {
          name: 'Pulpa Fresa Test Spec011',
          code: `PULPA_FRESA_${Date.now()}`,
          category: 'FRUTA',
          unit: 'kg',
          currentStock: 10.0,
          avgCost: 12000,
          isActive: true,
        },
      });
      fruitMatId = fMat.id;

      // Lote Madre Fase A
      const batch = await prisma.productionBatch.create({
        data: {
          batchCode: `LOTE-SPEC011-${Date.now()}`,
          milkUsedLiters: 30.0,
          totalLitersProduced: 30.0,
          packagedLiters: 0,
          bottles1LProduced: 0,
          bottles2LProduced: 0,
          yieldPercentage: 100,
          flavor: 'Base',
          status: 'DISPONIBLE',
          costPerLiter: 4000,
          totalCost: 120000,
          isActive: true,
        },
      });
      testBatchId = batch.id;
    });

    afterAll(async () => {
      if (createdPackagingId) {
        await prisma.batchPackagingItem.deleteMany({ where: { packagingId: createdPackagingId } });
        await prisma.batchPackaging.deleteMany({ where: { id: createdPackagingId } });
      }
      if (testBatchId) {
        await prisma.productionBatch.deleteMany({ where: { id: testBatchId } });
      }
      if (bottle500MatId) {
        await prisma.rawMaterial.deleteMany({ where: { id: bottle500MatId } });
      }
      if (fruitMatId) {
        await prisma.rawMaterial.deleteMany({ where: { id: fruitMatId } });
      }
    });

    it('T2.1: debe crear fracción mono-presentación de 500ml calculando kg desde gramsPerBottle con rendimiento > 100%', async () => {
      // 20 botellas de 500ml = 10.0 L comerciales
      // 75g por botella = 1500g = 1.5 kg de fruta
      // Base láctea extraída del tanque = 8.0 L -> Rendimiento = 125%
      const res = await createBatchPackaging(testBatchId, {
        flavor: 'Fresa Artesanal',
        baseLitersUsed: 8.0,
        customContainers: [
          {
            containerName: '500ml',
            capacityLiters: 0.5,
            quantity: 20,
            price: 8000,
            rawMaterialId: bottle500MatId,
          },
        ],
        extraItems: [
          {
            rawMaterialId: fruitMatId,
            quantityUsed: 0, // Se debe computar desde gramsPerBottle
            gramsPerBottle: 75,
          },
        ],
        useLabels: false,
      });

      expect(res.packaging).toBeDefined();
      createdPackagingId = res.packaging.id;

      // Verificar persistencia de containers
      expect(Array.isArray(res.packaging.containers)).toBe(true);
      const containers = res.packaging.containers as any[];
      expect(containers).toHaveLength(1);
      expect(containers[0].capacityLiters).toBe(0.5);
      expect(containers[0].quantity).toBe(20);

      // Verificar consumo de fruta: 20 botellas * 75g = 1.5 kg
      const itemsUsed = await prisma.batchPackagingItem.findMany({
        where: { packagingId: createdPackagingId, rawMaterialId: fruitMatId },
      });
      expect(itemsUsed).toHaveLength(1);
      expect(itemsUsed[0].quantityUsed).toBe(1.5);
      // dosagePerLiter = 75g / 0.5L = 150 g/L
      expect(itemsUsed[0].dosagePerLiter).toBe(150);

      // Verificar rendimiento volumétrico: 10L / 8L = 125%
      expect(res.packaging.yieldPercentage).toBe(125);
      expect(res.packaging.baseLitersUsed).toBe(8.0);
      expect(res.packaging.totalLiters).toBe(10.0);

      // Verificar descuento de stock en bodega
      const bMatPost = await prisma.rawMaterial.findUnique({ where: { id: bottle500MatId } });
      expect(bMatPost?.currentStock).toBe(20); // 40 - 20 = 20

      const fMatPost = await prisma.rawMaterial.findUnique({ where: { id: fruitMatId } });
      expect(fMatPost?.currentStock).toBe(8.5); // 10.0 - 1.5 = 8.5

      // Lote madre debe registrar 8.0L de base descontada
      const batchPost = await prisma.productionBatch.findUnique({ where: { id: testBatchId } });
      expect(batchPost?.packagedLiters).toBe(8.0);
    });

    it('T2.2: debe bloquear la creación si el stock de botellas es insuficiente', async () => {
      // Quedan 20 botellas en stock, solicitamos 30
      await expect(
        createBatchPackaging(testBatchId, {
          flavor: 'Mora',
          baseLitersUsed: 5.0,
          customContainers: [
            {
              containerName: '500ml',
              capacityLiters: 0.5,
              quantity: 30,
              price: 8000,
              rawMaterialId: bottle500MatId,
            },
          ],
          useLabels: false,
        })
      ).rejects.toThrow(/Stock insuficiente/i);
    });
  });
  describe('T3: Servicio Backend de Edición, Inmutabilidad y Ajuste Diferencial en Kardex (Fase B)', () => {
    let testBatchId: number;
    let bottle500MatId: number;
    let fruitMatId: number;
    let pkgId: number;
    let customerId: number;
    let orderId: number;

    beforeAll(async () => {
      const bMat = await prisma.rawMaterial.create({
        data: {
          name: 'Envase 500ml T3 Test',
          code: `ENV_500_T3_${Date.now()}`,
          category: 'EMPAQUE',
          unit: 'und',
          currentStock: 50,
          avgCost: 600,
          isActive: true,
        },
      });
      bottle500MatId = bMat.id;

      const fMat = await prisma.rawMaterial.create({
        data: {
          name: 'Mora T3 Test',
          code: `MORA_T3_${Date.now()}`,
          category: 'FRUTA',
          unit: 'kg',
          currentStock: 20.0,
          avgCost: 10000,
          isActive: true,
        },
      });
      fruitMatId = fMat.id;

      const batch = await prisma.productionBatch.create({
        data: {
          batchCode: `LOTE-T3-${Date.now()}`,
          milkUsedLiters: 40.0,
          totalLitersProduced: 40.0,
          packagedLiters: 0,
          bottles1LProduced: 0,
          bottles2LProduced: 0,
          yieldPercentage: 100,
          flavor: 'Base',
          status: 'DISPONIBLE',
          costPerLiter: 4000,
          totalCost: 160000,
          isActive: true,
        },
      });
      testBatchId = batch.id;

      // Crear fracción inicial: 20 botellas de 500ml (10L totales), 8L base usada, 75g/botella (1.5 kg)
      const res = await createBatchPackaging(testBatchId, {
        flavor: 'Mora',
        baseLitersUsed: 8.0,
        customContainers: [
          {
            containerName: '500ml',
            capacityLiters: 0.5,
            quantity: 20,
            price: 8000,
            rawMaterialId: bottle500MatId,
          },
        ],
        extraItems: [
          {
            rawMaterialId: fruitMatId,
            quantityUsed: 0,
            gramsPerBottle: 75,
          },
        ],
        useLabels: false,
      });
      pkgId = res.packaging.id;
    });

    afterAll(async () => {
      if (orderId) {
        await prisma.orderItem.deleteMany({ where: { orderId } });
        await prisma.order.deleteMany({ where: { id: orderId } });
      }
      if (customerId) {
        await prisma.customer.deleteMany({ where: { id: customerId } });
      }
      if (pkgId) {
        await prisma.batchPackagingItem.deleteMany({ where: { packagingId: pkgId } });
        await prisma.batchPackaging.deleteMany({ where: { id: pkgId } });
      }
      if (testBatchId) {
        await prisma.productionBatch.deleteMany({ where: { id: testBatchId } });
      }
      if (bottle500MatId) {
        await prisma.rawMaterial.deleteMany({ where: { id: bottle500MatId } });
      }
      if (fruitMatId) {
        await prisma.rawMaterial.deleteMany({ where: { id: fruitMatId } });
      }
    });

    it('T3.1: debe bloquear el intento de alterar la presentación en una fracción mono-presentación existente', async () => {
      // Intentar cambiar la fracción de 500ml a 1L
      await expect(
        updateBatchPackaging(pkgId, {
          flavor: 'Mora',
          bottles1L: 10,
          customContainers: [],
        })
      ).rejects.toThrow(/No se puede cambiar el tipo de presentación/i);
    });

    it('T3.2: debe permitir guardar actualización con delta = 0 sin exigir stock adicional aunque bodega esté en 0', async () => {
      // Forzar stock de envases en 0 en bodega
      await prisma.rawMaterial.update({
        where: { id: bottle500MatId },
        data: { currentStock: 0 },
      });

      // Actualizar notas o sabor manteniendo 20 botellas (delta = 0)
      const res = await updateBatchPackaging(pkgId, {
        flavor: 'Mora Especial',
        notes: 'Notas de ajuste delta cero',
        customContainers: [
          {
            containerName: '500ml',
            capacityLiters: 0.5,
            quantity: 20,
            price: 8500,
            rawMaterialId: bottle500MatId,
          },
        ],
        extraItems: [
          {
            rawMaterialId: fruitMatId,
            quantityUsed: 0,
            gramsPerBottle: 75,
          },
        ],
      });

      expect(res.packaging.flavor).toBe('Mora Especial');
      expect(res.packaging.notes).toBe('Notas de ajuste delta cero');
      const bMat = await prisma.rawMaterial.findUnique({ where: { id: bottle500MatId } });
      expect(bMat?.currentStock).toBe(0);
    });

    it('T3.3: debe aplicar ajuste diferencial neto en kardex para botellas de 500ml y fruta', async () => {
      // Reponer stock a 10 botellas
      await prisma.rawMaterial.update({
        where: { id: bottle500MatId },
        data: { currentStock: 10 },
      });

      // Incrementar de 20 a 24 botellas (+4 botellas, +0.3 kg fruta a 75g/botella)
      const res = await updateBatchPackaging(pkgId, {
        customContainers: [
          {
            containerName: '500ml',
            capacityLiters: 0.5,
            quantity: 24,
            price: 8500,
            rawMaterialId: bottle500MatId,
          },
        ],
        extraItems: [
          {
            rawMaterialId: fruitMatId,
            quantityUsed: 0,
            gramsPerBottle: 75,
          },
        ],
      });

      expect(res.packaging.totalLiters).toBe(12.0); // 24 * 0.5 = 12.0L
      // Stock de botellas debe descontar 4 (10 - 4 = 6)
      const bMat = await prisma.rawMaterial.findUnique({ where: { id: bottle500MatId } });
      expect(bMat?.currentStock).toBe(6);

      // 24 botellas * 75g = 1.8 kg de fruta
      const items = await prisma.batchPackagingItem.findMany({
        where: { packagingId: pkgId, rawMaterialId: fruitMatId },
      });
      expect(items).toHaveLength(1);
      expect(items[0].quantityUsed).toBe(1.8);
    });

    it('T3.4: debe bloquear la reducción de botellas si nuevasBotellas < botellas ya entregadas a clientes', async () => {
      // Crear cliente y orden entregada con 15 botellas de 500ml vinculada a esta fracción
      const cust = await prisma.customer.create({
        data: {
          
          fullName: 'Cliente Test T3 Spec011',
          address: 'Calle 10 # 5-20',
          phone: `300${Date.now().toString().slice(-7)}`,
        },
      });
      customerId = cust.id;

      const ord = await prisma.order.create({
        data: {
          orderNumber: `ORD-T3-${Date.now()}`,
          customerId,
          batchId: testBatchId,
          deliveryStatus: 'DELIVERED',
          totalAmount: 120000,
        },
      });
      orderId = ord.id;

      await prisma.orderItem.create({
        data: {
          orderId,
          batchId: testBatchId,
          packagingId: pkgId,
          bottleSize: '500ml',
          flavor: 'Mora',
          quantity: 15,
          litersPerUnit: 0.5,
          totalLiters: 7.5,
          unitPrice: 8000,
          totalPrice: 120000,
        },
      });

      // La fracción tiene 24 botellas y ya se entregaron 15. Intentar reducir a 10 botellas debe fallar.
      await expect(
        updateBatchPackaging(pkgId, {
          customContainers: [
            {
              containerName: '500ml',
              capacityLiters: 0.5,
              quantity: 10,
              price: 8500,
              rawMaterialId: bottle500MatId,
            },
          ],
        })
      ).rejects.toThrow(/No se puede reducir la cantidad a 10 botellas porque ya se han entregado 15/i);
    });
  });
});
