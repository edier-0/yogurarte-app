import dotenv from 'dotenv';
import { generateToken, AuthUserPayload } from '../src/utils/jwt.utils.js';

dotenv.config();

process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-vitest-suite-32chars-min';
}

import { beforeAll } from 'vitest';
import prisma from '../src/prisma.js';

beforeAll(async () => {
  try {
    const initialPresentations = [
      { name: '1L', label: '1 Litro (1L)', capacityLiters: 1.0, defaultPrice: 12000, isActive: true },
      { name: '2L', label: '2 Litros (2L)', capacityLiters: 2.0, defaultPrice: 24000, isActive: true },
      { name: '500ml', label: '500 ml (Medio Litro)', capacityLiters: 0.5, defaultPrice: 8000, isActive: true },
    ];
    for (const pres of initialPresentations) {
      await prisma.productPresentation.upsert({
        where: { name: pres.name },
        update: { label: pres.label, capacityLiters: pres.capacityLiters, defaultPrice: pres.defaultPrice, isActive: pres.isActive },
        create: pres,
      });
    }
  } catch (err) {
    // Continuar si no se pudo sembrar
  }
  try {
    await prisma.user.upsert({
      where: { id: 3 },
      update: { isActive: true },
      create: {
        id: 3,
        username: 'edier',
        password: '$2b$10$testHashedPassword12345678901234567890',
        name: 'Edier Administrador',
        role: 'ADMIN',
        isActive: true,
      },
    });
  } catch (err) {
    // Continuar si ya está gestionado
  }
});

/**
 * Genera un token JWT de prueba con rol de Administrador
 */
export const getAdminAuthToken = (overrides?: Partial<AuthUserPayload>): string => {
  return generateToken({
    id: 3,
    name: 'Edier Administrador',
    username: 'edier',
    role: 'ADMIN',
    ...overrides,
  });
};

/**
 * Genera un token JWT de prueba con rol de Repartidor / Domiciliario
 */
export const getDriverAuthToken = (overrides?: Partial<AuthUserPayload>): string => {
  return generateToken({
    id: 99,
    name: 'Repartidor Test',
    username: 'driver_test',
    role: 'DOMICILIARIO',
    ...overrides,
  });
};
