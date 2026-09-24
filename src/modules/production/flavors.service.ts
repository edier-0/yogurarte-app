import prisma from '../../prisma.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/appError.js';
import { CreateFlavorInput, FlavorsQueryInput } from './flavors.schema.js';

export const DEFAULT_FLAVORS = [
  'Natural',
  'Fresa',
  'Melocotón',
  'Mora',
  'Frutos Rojos',
  'Maracuyá',
  'Guanábana',
  'Arequipe',
  'Piña',
];

/**
 * Asegura que los sabores base existan en la base de datos si la tabla está vacía
 */
export async function ensureDefaultFlavors() {
  const count = await prisma.productFlavor.count();
  if (count === 0) {
    for (const name of DEFAULT_FLAVORS) {
      await prisma.productFlavor.upsert({
        where: { name },
        update: {},
        create: { name, isActive: true },
      }).catch(() => {});
    }
  }
}

/**
 * Obtener todos los sabores con soporte para filtro de activos
 */
export async function getFlavors(query?: FlavorsQueryInput) {
  await ensureDefaultFlavors();

  const where: any = {};
  if (query?.activeOnly) {
    where.isActive = true;
  }

  return await prisma.productFlavor.findMany({
    where,
    orderBy: { name: 'asc' },
  });
}

/**
 * Obtener sabor por ID
 */
export async function getFlavorById(id: number) {
  const flavor = await prisma.productFlavor.findUnique({
    where: { id },
  });

  if (!flavor) {
    throw new NotFoundError('Sabor no encontrado');
  }

  return flavor;
}

/**
 * Crear nuevo sabor validando unicidad case-insensitive
 */
export async function createFlavor(data: CreateFlavorInput) {
  const sanitizedName = data.name.trim().replace(/\s+/g, ' ');

  if (!sanitizedName) {
    throw new BadRequestError('El nombre del sabor no puede estar vacío');
  }

  // Verificar si ya existe un sabor con ese nombre (case-insensitive)
  const existing = await prisma.productFlavor.findFirst({
    where: {
      name: { equals: sanitizedName, mode: 'insensitive' },
    },
  });

  if (existing) {
    throw new BadRequestError(`Ya existe un sabor registrado con el nombre "${sanitizedName}"`);
  }

  return await prisma.productFlavor.create({
    data: {
      name: sanitizedName,
      isActive: true,
    },
  });
}

/**
 * Alternar estado activo/inactivo (toggle)
 */
export async function toggleFlavor(id: number) {
  const flavor = await getFlavorById(id);

  return await prisma.productFlavor.update({
    where: { id },
    data: {
      isActive: !flavor.isActive,
    },
  });
}

/**
 * Eliminación segura / baja lógica sin violar llaves foráneas o histórico
 */
export async function deleteFlavor(id: number) {
  const flavor = await getFlavorById(id);

  // Verificar si el sabor ha sido utilizado en lotes o pedidos
  const [batchesCount, orderItemsCount] = await Promise.all([
    prisma.productionBatch.count({
      where: {
        flavor: { contains: flavor.name, mode: 'insensitive' },
      },
    }),
    prisma.orderItem.count({
      where: {
        flavor: { contains: flavor.name, mode: 'insensitive' },
      },
    }),
  ]);

  if (batchesCount > 0 || orderItemsCount > 0) {
    // Baja lógica si tiene historial para preservar la trazabilidad
    const updated = await prisma.productFlavor.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      message: `El sabor "${flavor.name}" tiene registros vinculados en lotes o pedidos; fue desactivado para preservar el historial.`,
      flavor: updated,
      deactivated: true,
    };
  }

  // Borrado físico seguro si no tiene registros vinculados
  await prisma.productFlavor.delete({
    where: { id },
  });

  return {
    message: `Sabor "${flavor.name}" eliminado exitosamente.`,
    deleted: true,
  };
}
