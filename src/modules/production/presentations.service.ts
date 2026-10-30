import prisma from '../../prisma.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/appError.js';
import {
  CreatePresentationInput,
  PresentationsQueryInput,
  UpdatePresentationInput,
} from './presentations.schema.js';

export const DEFAULT_PRESENTATIONS = [
  { name: '500ml', label: '500 ml (Medio Litro)', capacityLiters: 0.5, defaultPrice: 8000 },
  { name: '1L', label: '1 Litro (1L)', capacityLiters: 1.0, defaultPrice: 12000 },
  { name: '2L', label: '2 Litros (2L)', capacityLiters: 2.0, defaultPrice: 24000 },
];

/**
 * Asegura que las presentaciones estándar existan en la base de datos si la tabla está vacía
 */
export async function ensureDefaultPresentations() {
  const count = await prisma.productPresentation.count();
  if (count === 0) {
    for (const pres of DEFAULT_PRESENTATIONS) {
      await prisma.productPresentation.upsert({
        where: { name: pres.name },
        update: {},
        create: {
          name: pres.name,
          label: pres.label,
          capacityLiters: pres.capacityLiters,
          defaultPrice: pres.defaultPrice,
          isActive: true,
        },
      }).catch(() => {});
    }
  }
}

/**
 * Obtener todas las presentaciones de producto con soporte para filtro de activos
 */
export async function getPresentations(query?: PresentationsQueryInput) {
  await ensureDefaultPresentations();

  const where: any = {};
  if (query?.activeOnly) {
    where.isActive = true;
  }

  return await prisma.productPresentation.findMany({
    where,
    include: {
      rawMaterial: {
        select: {
          id: true,
          name: true,
          code: true,
          currentStock: true,
          avgCost: true,
          unit: true,
        },
      },
    },
    orderBy: { capacityLiters: 'asc' },
  });
}

/**
 * Obtener presentación por ID
 */
export async function getPresentationById(id: number) {
  const presentation = await prisma.productPresentation.findUnique({
    where: { id },
    include: {
      rawMaterial: true,
    },
  });

  if (!presentation) {
    throw new NotFoundError('Presentación no encontrada');
  }

  return presentation;
}

/**
 * Crear nueva presentación validando identificador único
 */
export async function createPresentation(data: CreatePresentationInput) {
  const sanitizedName = data.name.trim().replace(/\s+/g, '');
  const sanitizedLabel = data.label.trim().replace(/\s+/g, ' ');

  if (!sanitizedName) {
    throw new BadRequestError('El identificador de la presentación no puede estar vacío');
  }

  if (data.capacityLiters <= 0) {
    throw new BadRequestError('La capacidad en litros debe ser estrictamente mayor a cero');
  }

  // Verificar si ya existe una presentación con ese identificador (case-insensitive)
  const existing = await prisma.productPresentation.findFirst({
    where: {
      name: { equals: sanitizedName, mode: 'insensitive' },
    },
  });

  if (existing) {
    throw new BadRequestError(`Ya existe una presentación registrada con el identificador "${sanitizedName}"`);
  }

  if (data.rawMaterialId) {
    const mat = await prisma.rawMaterial.findUnique({
      where: { id: data.rawMaterialId },
    });
    if (!mat) {
      throw new BadRequestError('El insumo de empaque seleccionado no existe en el inventario');
    }
  }

  return await prisma.productPresentation.create({
    data: {
      name: sanitizedName,
      label: sanitizedLabel,
      capacityLiters: data.capacityLiters,
      defaultPrice: data.defaultPrice,
      rawMaterialId: data.rawMaterialId || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
    include: {
      rawMaterial: {
        select: {
          id: true,
          name: true,
          code: true,
          currentStock: true,
          avgCost: true,
          unit: true,
        },
      },
    },
  });
}

/**
 * Actualizar presentación existente
 */
export async function updatePresentation(id: number, data: UpdatePresentationInput) {
  const presentation = await getPresentationById(id);

  const updateData: any = {};

  if (data.name !== undefined) {
    const cleanName = data.name.trim().replace(/\s+/g, '');
    if (!cleanName) {
      throw new BadRequestError('El identificador no puede estar vacío');
    }
    if (cleanName.toLowerCase() !== presentation.name.toLowerCase()) {
      const existing = await prisma.productPresentation.findFirst({
        where: {
          name: { equals: cleanName, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new BadRequestError(`Ya existe otra presentación con el identificador "${cleanName}"`);
      }
    }
    updateData.name = cleanName;
  }

  if (data.label !== undefined) {
    const cleanLabel = data.label.trim().replace(/\s+/g, ' ');
    if (!cleanLabel) {
      throw new BadRequestError('La etiqueta no puede estar vacía');
    }
    updateData.label = cleanLabel;
  }

  if (data.capacityLiters !== undefined) {
    if (data.capacityLiters <= 0) {
      throw new BadRequestError('La capacidad en litros debe ser estrictamente mayor a cero');
    }
    updateData.capacityLiters = data.capacityLiters;
  }

  if (data.defaultPrice !== undefined) {
    if (data.defaultPrice < 0) {
      throw new BadRequestError('El precio predeterminado no puede ser negativo');
    }
    updateData.defaultPrice = data.defaultPrice;
  }

  if (data.rawMaterialId !== undefined) {
    if (data.rawMaterialId) {
      const mat = await prisma.rawMaterial.findUnique({
        where: { id: data.rawMaterialId },
      });
      if (!mat) {
        throw new BadRequestError('El insumo de empaque seleccionado no existe en el inventario');
      }
    }
    updateData.rawMaterialId = data.rawMaterialId;
  }

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  return await prisma.productPresentation.update({
    where: { id },
    data: updateData,
    include: {
      rawMaterial: {
        select: {
          id: true,
          name: true,
          code: true,
          currentStock: true,
          avgCost: true,
          unit: true,
        },
      },
    },
  });
}

/**
 * Alternar estado activo/inactivo (toggle)
 */
export async function togglePresentation(id: number) {
  const presentation = await getPresentationById(id);

  return await prisma.productPresentation.update({
    where: { id },
    data: {
      isActive: !presentation.isActive,
    },
    include: {
      rawMaterial: {
        select: {
          id: true,
          name: true,
          code: true,
          currentStock: true,
          avgCost: true,
          unit: true,
        },
      },
    },
  });
}

/**
 * Eliminación segura / baja lógica para preservar historial
 */
export async function deletePresentation(id: number) {
  const presentation = await getPresentationById(id);

  // Verificar si la presentación ha sido referenciada en pedidos
  const orderItemsCount = await prisma.orderItem.count({
    where: {
      OR: [
        { bottleSize: { equals: presentation.name, mode: 'insensitive' } },
        { litersPerUnit: presentation.capacityLiters },
      ],
    },
  });

  if (orderItemsCount > 0) {
    // Baja lógica si tiene historial para salvaguardar trazabilidad
    const updated = await prisma.productPresentation.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      message: `La presentación "${presentation.label}" tiene pedidos registrados en el historial; fue desactivada en lugar de eliminarse para preservar la trazabilidad.`,
      presentation: updated,
      deactivated: true,
    };
  }

  // Borrado físico si no tiene registros vinculados
  await prisma.productPresentation.delete({
    where: { id },
  });

  return {
    message: `Presentación "${presentation.label}" eliminada exitosamente del catálogo.`,
    deleted: true,
  };
}
