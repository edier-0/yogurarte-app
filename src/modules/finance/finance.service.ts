import prisma from '../../prisma.js';
import {
  parseColombiaDate,
  getColombiaDateStr,
  getColombiaStartOfDay,
  getColombiaEndOfDay,
} from '../../utils/date.utils.js';
import { formatLitersVolume, cleanPresentationLabel, formatPresentationChip } from '../../utils/volume.utils.js';
import { computePackagingPresentations } from '../batches/batches.service.js';
import { resolvePresentationLiters } from '../orders/orders.service.js';
import {
  BadRequestError,
  NotFoundError,
} from '../../shared/errors/appError.js';
import {
  CashMovementsQueryInput,
  CreateCashMovementInput,
  CreateCreditInput,
  CreateExpenseInput,
  DashboardSummaryQueryInput,
  ExpensesQueryInput,
  PayCreditInstallmentInput,
  SkipCreditInstallmentInput,
  UpdateCashMovementInput,
  UpdateExpenseInput,
} from './finance.schema.js';

// ============================================================================
// 1. MOVIMIENTOS DE CAJA Y CUADRE NETO (CASH MOVEMENTS)
// ============================================================================

/**
 * Obtener movimientos de caja con filtros y conciliación de saldo neto
 */
export const getCashMovements = async (query: CashMovementsQueryInput) => {
  const { type, startDate, endDate, page, limit, paginate, search } = query as any;

  const whereClause: any = {};

  if (type && typeof type === 'string' && type !== 'ALL') {
    whereClause.type = type;
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.trim();
    whereClause.OR = [
      { concept: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
      { registeredBy: { contains: q, mode: 'insensitive' } },
      { paymentMethod: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (startDate || endDate) {
    whereClause.movementDate = {};
    if (startDate && typeof startDate === 'string') {
      whereClause.movementDate.gte = getColombiaStartOfDay(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      whereClause.movementDate.lte = getColombiaEndOfDay(endDate);
    }
  }

  const allMatchingMovements = await prisma.cashMovement.findMany({
    where: whereClause,
    include: {
      staffMember: {
        select: {
          id: true,
          fullName: true,
          role: true,
          type: true,
        },
      },
    },
    orderBy: { movementDate: 'desc' },
  });

  const totalInjections = allMatchingMovements
    .filter(
      (m) =>
        m.type === 'BASE_INICIAL' ||
        m.type === 'APORTE_SOCIO' ||
        m.type === 'AJUSTE_CAJA' ||
        m.type === 'AJUSTE_SOBRANTE' ||
        m.type === 'INGRESO'
    )
    .reduce((sum, m) => sum + m.amount, 0);

  const totalWithdrawals = allMatchingMovements
    .filter(
      (m) =>
        m.type === 'RETIRO_BASE' ||
        m.type === 'DEVOLUCION_APORTE' ||
        m.type === 'AJUSTE_FALTANTE' ||
        m.type === 'EGRESO'
    )
    .reduce((sum, m) => sum + m.amount, 0);

  const netCashMovement = totalInjections - totalWithdrawals;
  const total = allMatchingMovements.length;

  const isPaginated = page !== undefined || limit !== undefined || paginate === 'true';
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);
  const totalPages = Math.ceil(total / limitNum) || 1;

  let movements = allMatchingMovements;
  if (isPaginated) {
    const skip = (pageNum - 1) * limitNum;
    movements = allMatchingMovements.slice(skip, skip + limitNum);
  }

  return {
    count: movements.length,
    totalInjections,
    totalWithdrawals,
    netCashMovement,
    movements,
    data: movements,
    pagination: {
      total,
      page: isPaginated ? pageNum : 1,
      limit: isPaginated ? limitNum : total,
      totalPages: isPaginated ? totalPages : 1,
    },
  };
};

/**
 * Obtener balances de capital acumulado: base de caja y aportes por cada socio
 */
export const getCapitalBalances = async () => {
  // 1. Balance de Base de Caja (inyecciones vs retiros)
  const baseMovements = await prisma.cashMovement.findMany({
    where: {
      type: { in: ['BASE_INICIAL', 'RETIRO_BASE'] },
    },
    select: {
      type: true,
      amount: true,
    },
  });

  const baseTotalInjected = baseMovements
    .filter((m) => m.type === 'BASE_INICIAL')
    .reduce((sum, m) => sum + m.amount, 0);

  const baseTotalWithdrawn = baseMovements
    .filter((m) => m.type === 'RETIRO_BASE')
    .reduce((sum, m) => sum + m.amount, 0);

  const baseAvailable = Math.max(0, baseTotalInjected - baseTotalWithdrawn);

  // 2. Balance de Aportes de Socios (aportes vs devoluciones)
  const partnerMovements = await prisma.cashMovement.findMany({
    where: {
      type: { in: ['APORTE_SOCIO', 'DEVOLUCION_APORTE'] },
      staffMemberId: { not: null },
    },
    select: {
      type: true,
      amount: true,
      staffMemberId: true,
    },
  });

  const partners = await prisma.staffMember.findMany({
    where: {
      OR: [{ type: 'SOCIO' }, { role: { contains: 'SOCIO', mode: 'insensitive' } }],
    },
    select: {
      id: true,
      fullName: true,
      role: true,
      type: true,
      isActive: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const partnerBalances = partners.map((partner) => {
    const movs = partnerMovements.filter((m) => m.staffMemberId === partner.id);
    const totalContributed = movs
      .filter((m) => m.type === 'APORTE_SOCIO')
      .reduce((sum, m) => sum + m.amount, 0);
    const totalReturned = movs
      .filter((m) => m.type === 'DEVOLUCION_APORTE')
      .reduce((sum, m) => sum + m.amount, 0);
    const available = Math.max(0, totalContributed - totalReturned);

    return {
      partnerId: partner.id,
      fullName: partner.fullName,
      role: partner.role,
      type: partner.type,
      isActive: partner.isActive,
      totalContributed,
      totalReturned,
      available,
    };
  });

  return {
    base: {
      totalInjected: baseTotalInjected,
      totalWithdrawn: baseTotalWithdrawn,
      available: baseAvailable,
    },
    partners: partnerBalances,
  };
};

/**
 * Registrar un movimiento de caja (Base inicial, aportes, retiros, traslados, ingresos/egresos)
 */
export const createCashMovement = async (data: CreateCashMovementInput) => {
  const { type, amount, movementDate, date, concept, description, paymentMethod, notes, registeredBy, staffMemberId } = data as any;

  const parsedAmount = Number(amount);
  const textConcept = (concept || description || '').trim();
  if (!textConcept || isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new BadRequestError('Concepto o descripción y monto válido son requeridos');
  }

  const validTypes = [
    'BASE_INICIAL',
    'APORTE_SOCIO',
    'RETIRO_BASE',
    'DEVOLUCION_APORTE',
    'AJUSTE_CAJA',
    'AJUSTE_SOBRANTE',
    'AJUSTE_FALTANTE',
    'TRASLADO_EFECTIVO_A_BANCO',
    'TRASLADO_BANCO_A_EFECTIVO',
    'INGRESO',
    'EGRESO',
  ];
  const movementType = validTypes.includes(type) ? type : 'BASE_INICIAL';
  const rawDate = date || movementDate;
  const parsedMovementDate = parseColombiaDate(rawDate);
  const parsedStaffMemberId = staffMemberId ? Number(staffMemberId) : null;

  // Validación de tope en Devolución de Aporte a Socio
  if (movementType === 'DEVOLUCION_APORTE') {
    if (!parsedStaffMemberId) {
      throw new BadRequestError('Debes seleccionar el socio al que se le reintegra el aporte');
    }

    const partnerMovs = await prisma.cashMovement.findMany({
      where: {
        staffMemberId: parsedStaffMemberId,
        type: { in: ['APORTE_SOCIO', 'DEVOLUCION_APORTE'] },
      },
      select: { type: true, amount: true },
    });

    const totalContributed = partnerMovs
      .filter((m) => m.type === 'APORTE_SOCIO')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalReturned = partnerMovs
      .filter((m) => m.type === 'DEVOLUCION_APORTE')
      .reduce((sum, m) => sum + m.amount, 0);

    const availableContributed = Math.max(0, totalContributed - totalReturned);

    if (parsedAmount > availableContributed) {
      throw new BadRequestError(
        `El monto a devolver ($${parsedAmount.toLocaleString('es-CO')}) no puede ser mayor al aporte disponible del socio ($${availableContributed.toLocaleString('es-CO')})`
      );
    }
  }

  // Validación de tope en Retiro de Base de Caja
  if (movementType === 'RETIRO_BASE') {
    const baseMovs = await prisma.cashMovement.findMany({
      where: {
        type: { in: ['BASE_INICIAL', 'RETIRO_BASE'] },
      },
      select: { type: true, amount: true },
    });

    const totalInjected = baseMovs
      .filter((m) => m.type === 'BASE_INICIAL')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalWithdrawn = baseMovs
      .filter((m) => m.type === 'RETIRO_BASE')
      .reduce((sum, m) => sum + m.amount, 0);

    const availableBase = Math.max(0, totalInjected - totalWithdrawn);

    if (parsedAmount > availableBase) {
      throw new BadRequestError(
        `El monto a retirar ($${parsedAmount.toLocaleString('es-CO')}) no puede ser mayor a la base disponible en caja ($${availableBase.toLocaleString('es-CO')})`
      );
    }
  }

  return prisma.cashMovement.create({
    data: {
      type: movementType,
      amount: parsedAmount,
      concept: textConcept,
      paymentMethod: paymentMethod ? paymentMethod.trim() : 'EFECTIVO',
      movementDate: parsedMovementDate,
      notes: notes ? notes.trim() : null,
      registeredBy: registeredBy || 'Edier',
      staffMemberId: parsedStaffMemberId,
    },
    include: {
      staffMember: {
        select: {
          id: true,
          fullName: true,
          role: true,
          type: true,
        },
      },
    },
  });
};

/**
 * Actualizar un movimiento de caja existente (Edición integral de monto, tipo, concepto, fecha, medio de pago, notas)
 */
export const updateCashMovement = async (id: number, data: UpdateCashMovementInput) => {
  const existing = await prisma.cashMovement.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Movimiento de caja no encontrado');
  }

  const { type, amount, movementDate, date, concept, description, paymentMethod, notes, registeredBy, staffMemberId } = data as any;

  let parsedAmount = existing.amount;
  if (amount !== undefined) {
    parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestError('Monto válido es requerido');
    }
  }

  const validTypes = [
    'BASE_INICIAL',
    'APORTE_SOCIO',
    'RETIRO_BASE',
    'DEVOLUCION_APORTE',
    'AJUSTE_CAJA',
    'AJUSTE_SOBRANTE',
    'AJUSTE_FALTANTE',
    'TRASLADO_EFECTIVO_A_BANCO',
    'TRASLADO_BANCO_A_EFECTIVO',
    'INGRESO',
    'EGRESO',
  ];
  const movementType = type && validTypes.includes(type) ? type : (type ? type : existing.type);

  const conceptToUse = description !== undefined ? description.trim() : concept !== undefined ? concept.trim() : existing.concept;
  const rawDate = date || movementDate;
  const parsedDate = rawDate ? parseColombiaDate(rawDate) : existing.movementDate;
  const parsedStaffMemberId = staffMemberId !== undefined ? (staffMemberId ? Number(staffMemberId) : null) : existing.staffMemberId;

  // Validación de tope en Devolución de Aporte a Socio (excluyendo el movimiento actual)
  if (movementType === 'DEVOLUCION_APORTE') {
    if (!parsedStaffMemberId) {
      throw new BadRequestError('Debes seleccionar el socio al que se le reintegra el aporte');
    }

    const partnerMovs = await prisma.cashMovement.findMany({
      where: {
        staffMemberId: parsedStaffMemberId,
        type: { in: ['APORTE_SOCIO', 'DEVOLUCION_APORTE'] },
        id: { not: id },
      },
      select: { type: true, amount: true },
    });

    const totalContributed = partnerMovs
      .filter((m) => m.type === 'APORTE_SOCIO')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalReturned = partnerMovs
      .filter((m) => m.type === 'DEVOLUCION_APORTE')
      .reduce((sum, m) => sum + m.amount, 0);

    const availableContributed = Math.max(0, totalContributed - totalReturned);

    if (parsedAmount > availableContributed) {
      throw new BadRequestError(
        `El monto a devolver ($${parsedAmount.toLocaleString('es-CO')}) no puede ser mayor al aporte disponible del socio ($${availableContributed.toLocaleString('es-CO')})`
      );
    }
  }

  // Validación de tope en Retiro de Base de Caja (excluyendo el movimiento actual)
  if (movementType === 'RETIRO_BASE') {
    const baseMovs = await prisma.cashMovement.findMany({
      where: {
        type: { in: ['BASE_INICIAL', 'RETIRO_BASE'] },
        id: { not: id },
      },
      select: { type: true, amount: true },
    });

    const totalInjected = baseMovs
      .filter((m) => m.type === 'BASE_INICIAL')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalWithdrawn = baseMovs
      .filter((m) => m.type === 'RETIRO_BASE')
      .reduce((sum, m) => sum + m.amount, 0);

    const availableBase = Math.max(0, totalInjected - totalWithdrawn);

    if (parsedAmount > availableBase) {
      throw new BadRequestError(
        `El monto a retirar ($${parsedAmount.toLocaleString('es-CO')}) no puede ser mayor a la base disponible en caja ($${availableBase.toLocaleString('es-CO')})`
      );
    }
  }

  return prisma.cashMovement.update({
    where: { id },
    data: {
      type: movementType,
      amount: parsedAmount,
      concept: conceptToUse,
      paymentMethod: paymentMethod !== undefined ? paymentMethod.trim() : existing.paymentMethod,
      movementDate: parsedDate,
      notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      registeredBy: registeredBy !== undefined ? (registeredBy ? registeredBy.trim() : null) : existing.registeredBy,
      staffMemberId: parsedStaffMemberId,
    },
    include: {
      staffMember: {
        select: {
          id: true,
          fullName: true,
          role: true,
          type: true,
        },
      },
    },
  });
};

/**
 * Eliminar movimiento de caja
 */
export const deleteCashMovement = async (id: number) => {
  const existing = await prisma.cashMovement.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Movimiento de caja no encontrado');
  }

  await prisma.cashMovement.delete({
    where: { id },
  });

  return { message: 'Movimiento de caja eliminado exitosamente' };
};

// ============================================================================
// 2. GASTOS GENERALES Y OPERATIVOS (EXPENSES)
// ============================================================================

/**
 * Obtener listado de gastos con filtros y monto total
 */
export const getExpenses = async (query: ExpensesQueryInput) => {
  const { category, startDate, endDate, page, limit, paginate, search } = query as any;

  const whereClause: any = {};

  if (category && typeof category === 'string' && category !== 'ALL') {
    const catUpper = category.toUpperCase().trim();
    if (catUpper === 'SERVICIOS_PUBLICOS' || catUpper === 'SERVICES' || catUpper === 'SERVICIOS') {
      whereClause.category = {
        in: ['SERVICIOS_PUBLICOS', 'SERVICIOS', 'MANTENIMIENTO', 'INFRAESTRUCTURA', 'LUZ', 'AGUA', 'PLANTA'],
      };
    } else if (catUpper === 'INSUMOS_EXTRA' || catUpper === 'RAW_MATERIALS' || catUpper === 'MATERIA_PRIMA') {
      whereClause.category = {
        in: ['INSUMOS_EXTRA', 'MATERIA_PRIMA', 'MATERIAS_PRIMAS', 'INSUMO', 'COMPRA_INSUMO'],
      };
    } else if (catUpper === 'COMBUSTIBLE' || catUpper === 'FUEL' || catUpper === 'GASOLINA') {
      whereClause.category = {
        in: ['COMBUSTIBLE', 'GASOLINA', 'FLETE', 'DOMICILIO', 'LOGISTICA_Y_TRANSPORTE'],
      };
    } else if (catUpper === 'OPERATIVO' || catUpper === 'OPERATIVE') {
      whereClause.category = {
        in: ['OPERATIVO', 'OPERATIVOS', 'OTRO', 'VARIOS', 'EMPAQUES'],
      };
    } else {
      whereClause.category = category;
    }
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.trim();
    whereClause.OR = [
      { description: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
      { registeredBy: { contains: q, mode: 'insensitive' } },
      { supplier: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (startDate || endDate) {
    whereClause.expenseDate = {};
    if (startDate && typeof startDate === 'string') {
      whereClause.expenseDate.gte = getColombiaStartOfDay(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      whereClause.expenseDate.lte = getColombiaEndOfDay(endDate);
    }
  }

  const isPaginated = page !== undefined || limit !== undefined || paginate === 'true';

  if (isPaginated) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, expenses, aggregate] = await Promise.all([
      prisma.expense.count({ where: whereClause }),
      prisma.expense.findMany({
        where: whereClause,
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.expense.aggregate({
        where: whereClause,
        _sum: { amount: true },
      }),
    ]);

    const totalAmount = aggregate._sum.amount || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      totalAmount,
      count: expenses.length,
      expenses,
      data: expenses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    };
  }

  const expenses = await prisma.expense.findMany({
    where: whereClause,
    orderBy: { expenseDate: 'desc' },
  });

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    totalAmount,
    count: expenses.length,
    expenses,
    data: expenses,
    pagination: {
      total: expenses.length,
      page: 1,
      limit: expenses.length,
      totalPages: 1,
    },
  };
};

/**
 * Normalizar canónicamente la categoría del gasto para erradicar alias visuales y mantener un único identificador (Spec 006)
 */
export const normalizeExpenseCategory = (category?: string | null): string => {
  if (!category) return 'OTRO';
  const trimmed = category.trim();
  const upper = trimmed.toUpperCase();
  if (
    upper === 'COMPRA_INSUMO' ||
    upper === 'COMPRA_INSUMOS' ||
    upper === 'INSUMO' ||
    upper === 'INSUMOS' ||
    upper.includes('COMPRA INSUMO') ||
    upper.includes('COMPRA DE INSUMO') ||
    upper === 'INSUMOS_EXTRA'
  ) {
    return 'INSUMOS_EXTRA';
  }
  return trimmed;
};

/**
 * Registrar un gasto operativo
 */
export const createExpense = async (data: CreateExpenseInput) => {
  const { category, description, amount, expenseDate, paymentMethod, supplier, notes, registeredBy } = data;

  const parsedAmount = Number(amount);
  if (!description || isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new BadRequestError('Descripción y monto válido son requeridos');
  }

  const parsedExpenseDate = parseColombiaDate(expenseDate);
  const normalizedCategory = normalizeExpenseCategory(category);

  return prisma.expense.create({
    data: {
      category: normalizedCategory,
      description: description.trim(),
      amount: parsedAmount,
      expenseDate: parsedExpenseDate,
      paymentMethod: paymentMethod ? paymentMethod.trim() : 'EFECTIVO',
      supplier: supplier ? supplier.trim() : null,
      notes: notes ? notes.trim() : null,
      registeredBy: registeredBy || 'Edier',
    },
  });
};

/**
 * Actualizar un gasto existente (Edición integral de monto, categoría, descripción, método de pago, fecha, proveedor y notas)
 */
export const updateExpense = async (id: number, data: UpdateExpenseInput) => {
  const {
    isStaffPayment,
    category,
    description,
    amount,
    expenseDate,
    date,
    paymentMethod,
    supplier,
    notes,
    registeredBy,
  } = data as any;

  const isTargetingStaff =
    isStaffPayment === true ||
    category === 'NOMINA' ||
    category === 'RETIRO_SOCIO' ||
    (typeof category === 'string' && (category.includes('Nómina') || category.includes('Retiro')));

  const existing = isTargetingStaff
    ? null
    : await prisma.expense.findUnique({
        where: { id },
      });

  if (!existing) {
    // Si no se encuentra en Expense, verificar si el ID corresponde a un pago de nómina o retiro (StaffPayment)
    const existingStaffPayment = await prisma.staffPayment.findUnique({
      where: { id },
      include: { staff: true },
    });

    if (existingStaffPayment) {
      const rawDate = date || expenseDate;
      const parsedExpenseDate = rawDate ? parseColombiaDate(rawDate) : existingStaffPayment.paymentDate;

      let parsedAmount = existingStaffPayment.netAmount;
      if (amount !== undefined) {
        parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new BadRequestError('Monto válido es requerido');
        }
      }

      const currentDeductions = existingStaffPayment.deductions || 0;
      const newGrossAmount = parsedAmount + currentDeductions;

      const updatedPayment = await prisma.staffPayment.update({
        where: { id },
        data: {
          netAmount: parsedAmount,
          amount: newGrossAmount,
          paymentDate: parsedExpenseDate,
          paymentMethod: paymentMethod !== undefined ? paymentMethod.trim() : existingStaffPayment.paymentMethod,
          notes: notes !== undefined ? (notes ? notes.trim() : null) : existingStaffPayment.notes,
          calculationDetails: description !== undefined ? description.trim() : existingStaffPayment.calculationDetails,
        },
        include: { staff: true },
      });

      return {
        id: updatedPayment.id,
        category: updatedPayment.paymentType,
        description: `${updatedPayment.staff?.fullName || 'Personal'} - ${updatedPayment.calculationDetails || 'Pago'}`,
        amount: updatedPayment.netAmount,
        expenseDate: updatedPayment.paymentDate,
        paymentMethod: updatedPayment.paymentMethod,
        notes: updatedPayment.notes,
        registeredBy: updatedPayment.registeredBy,
        isStaffPayment: true,
      };
    }

    throw new NotFoundError('Gasto no encontrado');
  }

  let parsedAmount = existing.amount;
  if (amount !== undefined) {
    parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new BadRequestError('Monto válido es requerido');
    }
  }

  const rawDate = date || expenseDate;
  const parsedExpenseDate = rawDate ? parseColombiaDate(rawDate) : existing.expenseDate;
  const normalizedCategory = category !== undefined ? normalizeExpenseCategory(category) : existing.category;

  const updatedExpense = await prisma.expense.update({
    where: { id },
    data: {
      category: normalizedCategory,
      description: description !== undefined ? description.trim() : existing.description,
      amount: parsedAmount,
      expenseDate: parsedExpenseDate,
      paymentMethod: paymentMethod !== undefined ? paymentMethod.trim() : existing.paymentMethod,
      supplier: supplier !== undefined ? (supplier ? supplier.trim() : null) : (existing as any).supplier,
      notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      registeredBy: registeredBy !== undefined ? (registeredBy ? registeredBy.trim() : null) : existing.registeredBy,
    },
  });

  // Si es un gasto de compra de insumos, sincronizar también el método de pago, proveedor y monto en la tabla Purchase si coincide
  if (
    existing.category === 'INSUMOS_EXTRA' ||
    normalizedCategory === 'INSUMOS_EXTRA' ||
    existing.category === 'MATERIA_PRIMA'
  ) {
    try {
      const cleanSupplier = supplier !== undefined ? (supplier ? String(supplier).trim() : null) : undefined;
      const cleanPaymentMethod = paymentMethod !== undefined ? String(paymentMethod).trim() : undefined;
      const cleanAmount = amount !== undefined ? parsedAmount : undefined;

      const expenseDateStr = getColombiaDateStr(parsedExpenseDate);
      const expenseDayStart = getColombiaStartOfDay(expenseDateStr);
      const expenseDayEnd = getColombiaEndOfDay(expenseDateStr);

      const matchingPurchase = await prisma.purchase.findFirst({
        where: {
          purchaseDate: {
            gte: expenseDayStart,
            lte: expenseDayEnd,
          },
          OR: [
            { totalCost: existing.amount },
            ...(amount !== undefined ? [{ totalCost: parsedAmount }] : []),
          ],
        },
        orderBy: { id: 'desc' },
      });

      if (matchingPurchase) {
        await prisma.purchase.update({
          where: { id: matchingPurchase.id },
          data: {
            ...(cleanSupplier !== undefined ? { supplier: cleanSupplier } : {}),
            ...(cleanPaymentMethod !== undefined ? { paymentMethod: cleanPaymentMethod } : {}),
            ...(cleanAmount !== undefined ? { totalCost: cleanAmount } : {}),
          },
        });
      }
    } catch (syncErr) {
      console.warn('Advertencia al sincronizar en Purchase:', syncErr);
    }
  }

  return updatedExpense;
};

/**
 * Eliminar un gasto (y sincronizar con compra e inventario si corresponde)
 */
export const deleteExpense = async (id: number) => {
  const existing = await prisma.expense.findUnique({
    where: { id },
  });

  if (!existing) {
    // Si no se encuentra en Expense, verificar si el ID corresponde a una Purchase (ej. eliminado desde Control de Caja purch_X)
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id },
      include: { rawMaterial: true },
    });

    if (existingPurchase) {
      await prisma.$transaction(async (tx) => {
        // 1. Revertir el stock en inventario
        await tx.rawMaterial.update({
          where: { id: existingPurchase.rawMaterialId },
          data: {
            currentStock: Math.max(0, existingPurchase.rawMaterial.currentStock - existingPurchase.quantity),
          },
        });

        // 2. Eliminar cualquier gasto vinculado residual
        const pDate = existingPurchase.purchaseDate
          ? getColombiaDateStr(existingPurchase.purchaseDate)
          : '';
        const linkedExpense = await tx.expense.findFirst({
          where: {
            amount: existingPurchase.totalCost,
            category: { in: ['INSUMOS_EXTRA', 'MATERIA_PRIMA', 'COMPRA_INSUMO'] },
            ...(pDate
              ? {
                  expenseDate: {
                    gte: getColombiaStartOfDay(pDate),
                    lte: getColombiaEndOfDay(pDate),
                  },
                }
              : {}),
          },
          orderBy: { id: 'desc' },
        });

        if (linkedExpense) {
          await tx.expense.delete({
            where: { id: linkedExpense.id },
          });
        }

        // 3. Eliminar la compra
        await tx.purchase.delete({
          where: { id },
        });
      });

      return { message: 'Compra de insumo eliminada, stock revertido y caja actualizada correctamente' };
    }

    // 2. Si no se encuentra en Purchase, verificar si corresponde a un pago de nómina o retiro (StaffPayment)
    const existingStaffPayment = await prisma.staffPayment.findUnique({
      where: { id },
    });

    if (existingStaffPayment) {
      await prisma.staffPayment.delete({
        where: { id },
      });
      return { message: 'Pago de nómina eliminado correctamente y caja actualizada' };
    }

    throw new NotFoundError('Gasto no encontrado');
  }

  // Si existe en Expense y es una compra de materia prima/insumos, sincronizar con Purchase e inventario
  const isRawMaterialExpense =
    existing.category === 'INSUMOS_EXTRA' ||
    existing.category === 'MATERIA_PRIMA' ||
    existing.category === 'COMPRA_INSUMO' ||
    existing.category.includes('Compra');

  if (isRawMaterialExpense) {
    const eDate = existing.expenseDate
      ? getColombiaDateStr(existing.expenseDate)
      : '';
    const matchingPurchase = await prisma.purchase.findFirst({
      where: {
        totalCost: existing.amount,
        ...(eDate
          ? {
              purchaseDate: {
                gte: getColombiaStartOfDay(eDate),
                lte: getColombiaEndOfDay(eDate),
              },
            }
          : {}),
      },
      include: { rawMaterial: true },
      orderBy: { id: 'desc' },
    });

    await prisma.$transaction(async (tx) => {
      if (matchingPurchase) {
        // Revertir stock de materia prima
        await tx.rawMaterial.update({
          where: { id: matchingPurchase.rawMaterialId },
          data: {
            currentStock: Math.max(0, matchingPurchase.rawMaterial.currentStock - matchingPurchase.quantity),
          },
        });

        // Eliminar compra
        await tx.purchase.delete({
          where: { id: matchingPurchase.id },
        });
      }

      // Eliminar gasto
      await tx.expense.delete({
        where: { id },
      });
    });

    return { message: 'Gasto y compra de insumo eliminados, stock revertido correctamente' };
  }

  // Gasto operativo común (servicios, combustible, etc.)
  await prisma.expense.delete({
    where: { id },
  });

  return { message: 'Gasto eliminado correctamente' };
};

// ============================================================================
// 3. CRÉDITOS Y OBLIGACIONES FINANCIERAS (CREDITS)
// ============================================================================

/**
 * Obtener créditos y compras a cuotas con balances y amortización
 */
export const getCredits = async () => {
  const credits = await prisma.creditObligation.findMany({
    include: {
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
    },
    orderBy: [
      { status: 'asc' }, // ACTIVO primero
      { nextDueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  const activeCredits = credits.filter((c) => c.status === 'ACTIVO');
  const totalRemainingBalance = activeCredits.reduce((sum, c) => sum + c.remainingBalance, 0);
  const totalDebtFinanced = credits.reduce((sum, c) => sum + c.totalAmount, 0);
  const totalPaidSoFar = credits.reduce((sum, c) => sum + (c.totalAmount - c.remainingBalance), 0);

  return {
    totalRemainingBalance,
    totalDebtFinanced,
    totalPaidSoFar,
    activeCount: activeCredits.length,
    totalCount: credits.length,
    credits,
  };
};

/**
 * Registrar compra o crédito financiero con cuota inicial transaccional ($transaction)
 */
export const createCredit = async (data: CreateCreditInput) => {
  const {
    title,
    category,
    creditor,
    principalAmount,
    interestRate,
    initialPayment,
    initialPaymentMethod,
    paymentType,
    frequency,
    installmentAmount,
    totalInstallments,
    startDate,
    nextDueDate,
    notes,
    registeredBy,
  } = data;

  const parsedPrincipal = Number(principalAmount);
  if (!title || !creditor || isNaN(parsedPrincipal) || parsedPrincipal <= 0) {
    throw new BadRequestError('El nombre del bien, acreedor y valor base son requeridos');
  }

  const parsedInterestRate = Number(interestRate) || 0;
  const interestAmount = parsedPrincipal * (parsedInterestRate / 100);
  const totalAmount = parsedPrincipal + interestAmount;

  const parsedInitial = Number(initialPayment) || 0;
  const remainingBalance = Math.max(0, totalAmount - parsedInitial);

  const parsedTotalInstallments = totalInstallments ? Number(totalInstallments) : null;
  let parsedInstallmentAmount = Number(installmentAmount) || 0;

  if (parsedTotalInstallments && parsedTotalInstallments > 0 && parsedInstallmentAmount <= 0) {
    parsedInstallmentAmount = Math.round(remainingBalance / parsedTotalInstallments);
  }

  const status = remainingBalance <= 0 ? 'PAGADO_TOTAL' : 'ACTIVO';
  const parsedStartDate = startDate ? new Date(startDate) : new Date();
  const parsedNextDueDate = nextDueDate ? new Date(nextDueDate) : null;

  return await prisma.$transaction(async (tx) => {
    const credit = await tx.creditObligation.create({
      data: {
        title: title.trim(),
        category: category || 'EQUIPO_MAQUINARIA',
        creditor: creditor.trim(),
        principalAmount: parsedPrincipal,
        interestRate: parsedInterestRate,
        totalAmount,
        initialPayment: parsedInitial,
        remainingBalance,
        paymentType: paymentType || 'CUOTAS_FIJAS',
        frequency: frequency || 'MENSUAL',
        installmentAmount: parsedInstallmentAmount,
        totalInstallments: parsedTotalInstallments,
        paidInstallments: parsedInitial > 0 ? 1 : 0,
        startDate: parsedStartDate,
        nextDueDate: parsedNextDueDate,
        status,
        notes: notes ? notes.trim() : null,
        registeredBy: registeredBy || 'Edier',
      },
    });

    if (parsedInitial > 0) {
      const payMethod = initialPaymentMethod ? initialPaymentMethod.trim() : 'EFECTIVO';

      await tx.creditPayment.create({
        data: {
          creditId: credit.id,
          actionType: 'CUOTA_INICIAL',
          amount: parsedInitial,
          paymentDate: parsedStartDate,
          paymentMethod: payMethod,
          installmentNumber: 0,
          justification: 'Pago de cuota inicial de contado',
          registeredBy: registeredBy || 'Edier',
        },
      });

      await tx.expense.create({
        data: {
          category: 'INFRAESTRUCTURA',
          description: `Cuota Inicial: ${credit.title} (${credit.creditor})`,
          amount: parsedInitial,
          expenseDate: parsedStartDate,
          paymentMethod: payMethod,
          notes: `Compra a crédito #${credit.id}`,
          registeredBy: registeredBy || 'Edier',
        },
      });
    }

    return tx.creditObligation.findUnique({
      where: { id: credit.id },
      include: { payments: true },
    });
  });
};

/**
 * Pagar cuota o abono extraordinario a crédito con atomicidad interactiva ($transaction)
 */
export const payCreditInstallment = async (id: number, data: PayCreditInstallmentInput) => {
  const credit = await prisma.creditObligation.findUnique({
    where: { id },
  });

  if (!credit) {
    throw new NotFoundError('Crédito no encontrado');
  }

  const {
    amount,
    paymentDate,
    paymentMethod,
    installmentNumber,
    receiptNumber,
    justification,
    nextDueDate,
    registeredBy,
  } = data;

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new BadRequestError('Ingresa un monto de pago válido');
  }

  const payDate = paymentDate ? new Date(paymentDate) : new Date();
  const payMethod = paymentMethod ? paymentMethod.trim() : 'EFECTIVO';
  const newRemaining = Math.max(0, credit.remainingBalance - parsedAmount);
  const newPaidCount = credit.paidInstallments + 1;
  const newStatus = newRemaining <= 0 ? 'PAGADO_TOTAL' : 'ACTIVO';
  const newNextDue = nextDueDate ? new Date(nextDueDate) : credit.nextDueDate;

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.creditPayment.create({
      data: {
        creditId: id,
        actionType: credit.paymentType === 'ABONOS_LIBRES' ? 'ABONO_EXTRAORDINARIO' : 'PAGO_CUOTA',
        amount: parsedAmount,
        paymentDate: payDate,
        paymentMethod: payMethod,
        installmentNumber: installmentNumber ? Number(installmentNumber) : newPaidCount,
        receiptNumber: receiptNumber ? receiptNumber.trim() : null,
        justification: justification ? justification.trim() : `Abono de cuota a ${credit.title}`,
        registeredBy: registeredBy || 'Edier',
      },
    });

    const updatedCredit = await tx.creditObligation.update({
      where: { id },
      data: {
        remainingBalance: newRemaining,
        paidInstallments: newPaidCount,
        status: newStatus,
        nextDueDate: newStatus === 'PAGADO_TOTAL' ? null : newNextDue,
      },
      include: { payments: { orderBy: { paymentDate: 'desc' } } },
    });

    // Registrar egreso operativo en caja por el pago de la cuota
    await tx.expense.create({
      data: {
        category: 'INFRAESTRUCTURA',
        description: `Cuota ${newPaidCount}: ${credit.title} (${credit.creditor})`,
        amount: parsedAmount,
        expenseDate: payDate,
        paymentMethod: payMethod,
        notes: receiptNumber ? `Comprobante: ${receiptNumber}` : `Abono a crédito #${credit.id}`,
        registeredBy: registeredBy || 'Edier',
      },
    });

    return {
      message:
        newStatus === 'PAGADO_TOTAL'
          ? '¡Felicitaciones! Crédito pagado en su totalidad 🎉'
          : 'Abono registrado con éxito',
      payment,
      credit: updatedCredit,
    };
  });
};

/**
 * Aplazar y reprogramar cuota de crédito ($transaction)
 */
export const skipCreditInstallment = async (id: number, data: SkipCreditInstallmentInput) => {
  const credit = await prisma.creditObligation.findUnique({
    where: { id },
  });

  if (!credit) {
    throw new NotFoundError('Crédito no encontrado');
  }

  const { justification, newNextDueDate, registeredBy } = data;

  if (!justification || !justification.trim()) {
    throw new BadRequestError('Debes ingresar el motivo o justificación del aplazamiento');
  }

  if (!newNextDueDate) {
    throw new BadRequestError('Debes seleccionar la nueva fecha reprogramada para la cuota');
  }

  const payDate = new Date();
  const parsedNewNextDue = new Date(newNextDueDate);

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.creditPayment.create({
      data: {
        creditId: id,
        actionType: 'CUOTA_OMITIDA_APLAZADA',
        amount: 0,
        paymentDate: payDate,
        paymentMethod: 'NO_APLICA',
        justification: justification.trim(),
        registeredBy: registeredBy || 'Edier',
      },
    });

    const updatedCredit = await tx.creditObligation.update({
      where: { id },
      data: {
        nextDueDate: parsedNewNextDue,
      },
      include: { payments: { orderBy: { paymentDate: 'desc' } } },
    });

    return {
      message: 'Cuota aplazada y reprogramada con éxito ⏭️',
      payment,
      credit: updatedCredit,
    };
  });
};

/**
 * Eliminar obligación crediticia
 */
export const deleteCredit = async (id: number) => {
  const existing = await prisma.creditObligation.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Crédito no encontrado');
  }

  await prisma.creditObligation.delete({
    where: { id },
  });

  return { message: 'Crédito eliminado correctamente' };
};

// ============================================================================
// 4. CONCILIACIÓN FINANCIERA Y DASHBOARD ANALÍTICO
// ============================================================================

/**
 * Obtener resumen consolidado del dashboard con balance en mano vs digital y flujo de caja
 */
export const getDashboardSummary = async (query: DashboardSummaryQueryInput) => {
  const { period, date, startDate, endDate, month, includeOrders } = query;
  const now = new Date();
  const todayStr = getColombiaDateStr(now);

  const orderWhere: any = {};
  const expenseWhere: any = {};
  const purchaseWhere: any = {};
  const staffPaymentWhere: any = {};
  const cashMovementWhere: any = {};
  const dischargeWhere: any = {};
  const batchWhere: any = {};

  let activeFilterDate = '';
  let customDateRange: { gte: Date; lte: Date } | null = null;

  if (date && typeof date === 'string') {
    activeFilterDate = date.split('T')[0];
  } else if (startDate || endDate) {
    const s = startDate ? String(startDate).split('T')[0] : '2020-01-01';
    const e = endDate ? String(endDate).split('T')[0] : '2099-12-31';
    customDateRange = {
      gte: getColombiaStartOfDay(s),
      lte: getColombiaEndOfDay(e),
    };
  } else if (period === 'today') {
    activeFilterDate = todayStr;
  } else if (period === 'yesterday') {
    const [y, m, d] = todayStr.split('-').map(Number);
    const yestDate = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
    activeFilterDate = getColombiaDateStr(yestDate);
  } else if (period === 'tomorrow') {
    const [y, m, d] = todayStr.split('-').map(Number);
    const tmrwDate = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
    activeFilterDate = getColombiaDateStr(tmrwDate);
  }

  if (activeFilterDate) {
    const dayStart = getColombiaStartOfDay(activeFilterDate);
    const dayEnd = getColombiaEndOfDay(activeFilterDate);
    const dayRange = { gte: dayStart, lte: dayEnd };

    orderWhere.OR = [{ orderDate: dayRange }, { deliveryDate: dayRange }];
    expenseWhere.expenseDate = dayRange;
    purchaseWhere.purchaseDate = dayRange;
    staffPaymentWhere.paymentDate = dayRange;
    cashMovementWhere.movementDate = dayRange;
    dischargeWhere.dischargeDate = dayRange;
    batchWhere.preparationDate = dayRange;
  } else if (customDateRange) {
    orderWhere.OR = [{ orderDate: customDateRange }, { deliveryDate: customDateRange }];
    expenseWhere.expenseDate = customDateRange;
    purchaseWhere.purchaseDate = customDateRange;
    staffPaymentWhere.paymentDate = customDateRange;
    cashMovementWhere.movementDate = customDateRange;
    dischargeWhere.dischargeDate = customDateRange;
    batchWhere.preparationDate = customDateRange;
  } else if (month && typeof month === 'string') {
    const [year, m] = month.split('-').map(Number);
    if (year && m) {
      const startOfMonth = getColombiaStartOfDay(`${year}-${String(m).padStart(2, '0')}-01`);
      const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
      const endOfMonth = getColombiaEndOfDay(`${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
      const monthRange = { gte: startOfMonth, lte: endOfMonth };
      orderWhere.OR = [{ orderDate: monthRange }, { deliveryDate: monthRange }];
      expenseWhere.expenseDate = monthRange;
      purchaseWhere.purchaseDate = monthRange;
      staffPaymentWhere.paymentDate = monthRange;
      cashMovementWhere.movementDate = monthRange;
      dischargeWhere.dischargeDate = monthRange;
      batchWhere.preparationDate = monthRange;
    }
  } else if (period === 'month') {
    const [year, m] = todayStr.split('-').map(Number);
    const startOfMonth = getColombiaStartOfDay(`${year}-${String(m).padStart(2, '0')}-01`);
    const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const endOfMonth = getColombiaEndOfDay(`${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    const monthRange = { gte: startOfMonth, lte: endOfMonth };
    orderWhere.OR = [{ orderDate: monthRange }, { deliveryDate: monthRange }];
    expenseWhere.expenseDate = monthRange;
    purchaseWhere.purchaseDate = monthRange;
    staffPaymentWhere.paymentDate = monthRange;
    cashMovementWhere.movementDate = monthRange;
    dischargeWhere.dischargeDate = monthRange;
    batchWhere.preparationDate = monthRange;
  } else if (period === 'week') {
    const [curY, curM, curD] = todayStr.split('-').map(Number);
    const refDay = new Date(Date.UTC(curY, curM - 1, curD, 12, 0, 0));
    const dayOfWeek = refDay.getUTCDay();
    const diffToMonday = curD - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(Date.UTC(curY, curM - 1, diffToMonday, 12, 0, 0));
    const mondayStr = getColombiaDateStr(monday);
    const startOfWeek = getColombiaStartOfDay(mondayStr);

    orderWhere.OR = [{ orderDate: { gte: startOfWeek } }, { deliveryDate: { gte: startOfWeek } }];
    expenseWhere.expenseDate = { gte: startOfWeek };
    purchaseWhere.purchaseDate = { gte: startOfWeek };
    staffPaymentWhere.paymentDate = { gte: startOfWeek };
    cashMovementWhere.movementDate = { gte: startOfWeek };
    dischargeWhere.dischargeDate = { gte: startOfWeek };
    batchWhere.preparationDate = { gte: startOfWeek };
  }

  const [curYear, curMonthNum] = todayStr.split('-').map(Number);
  const startOfCurrentMonth = new Date(Date.UTC(curYear, curMonthNum - 1, 1, 0, 0, 0));
  const endOfCurrentMonth = new Date(Date.UTC(curYear, curMonthNum, 0, 23, 59, 59, 999));

  const isPeriodFiltered = !!(
    activeFilterDate ||
    customDateRange ||
    month ||
    (period && period !== 'all')
  );

  // Consultar entidades en paralelo para alto rendimiento con proyecciones select
  const [
    orders,
    purchases,
    expenses,
    staffPayments,
    cashMovements,
    activeCreditObligations,
    rawMaterials,
    periodBatches,
    allActiveBatches,
    batchDischarges,
    activePackagings,
    allTimeCashMovements,
    allTimeOrders,
    allTimeExpenses,
    allTimePurchases,
    allTimeStaffPayments,
  ] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      select: {
        id: true,
        orderNumber: true,
        totalLiters: true,
        quantityBottles: true,
        bottleSize: true,
        totalAmount: true,
        paidAmount: true,
        pendingAmount: true,
        deliveryStatus: true,
        deliveryType: true,
        deliveryFee: true,
        deliveryAddress: true,
        paymentStatus: true,
        paymentMethod: true,
        orderDate: true,
        deliveryDate: true,
        createdAt: true,
        flavor: true,
        notes: true,
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            address: true,
          },
        },
        items: {
          select: {
            bottleSize: true,
            quantity: true,
            flavor: true,
            litersPerUnit: true,
            totalLiters: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            paymentDate: true,
            createdAt: true,
            notes: true,
          },
          orderBy: { paymentDate: 'asc' },
        },
        batch: {
          select: {
            id: true,
            batchCode: true,
            flavor: true,
            price1L: true,
            price2L: true,
          },
        },
      },
      orderBy: { orderDate: 'desc' },
    }),
    prisma.purchase.findMany({
      where: purchaseWhere,
      select: {
        id: true,
        purchaseDate: true,
        createdAt: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
        supplier: true,
        paymentMethod: true,
        notes: true,
        rawMaterial: {
          select: {
            name: true,
            category: true,
            unit: true,
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      select: {
        id: true,
        expenseDate: true,
        createdAt: true,
        category: true,
        description: true,
        amount: true,
        paymentMethod: true,
        supplier: true,
        notes: true,
        registeredBy: true,
      },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.staffPayment.findMany({
      where: staffPaymentWhere,
      select: {
        id: true,
        paymentDate: true,
        createdAt: true,
        paymentType: true,
        calculationDetails: true,
        netAmount: true,
        paymentMethod: true,
        periodStart: true,
        periodEnd: true,
        notes: true,
        staff: {
          select: {
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    }),
    prisma.cashMovement.findMany({
      where: cashMovementWhere,
      select: {
        id: true,
        movementDate: true,
        createdAt: true,
        type: true,
        concept: true,
        amount: true,
        paymentMethod: true,
        notes: true,
        registeredBy: true,
        staffMember: {
          select: {
            id: true,
            fullName: true,
            role: true,
            type: true,
          },
        },
      },
      orderBy: { movementDate: 'desc' },
    }),
    prisma.creditObligation.findMany({
      where: { status: 'ACTIVO' },
      select: {
        id: true,
        title: true,
        creditor: true,
        totalAmount: true,
        remainingBalance: true,
        installmentAmount: true,
        frequency: true,
        status: true,
        nextDueDate: true,
      },
      orderBy: { nextDueDate: 'asc' },
    }),
    prisma.rawMaterial.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        currentStock: true,
        minStockAlert: true,
        unit: true,
        category: true,
      },
    }),
    prisma.productionBatch.findMany({
      where: { isActive: true, ...batchWhere },
      select: {
        id: true,
        totalLitersProduced: true,
        yieldPercentage: true,
        totalCost: true,
        preparationDate: true,
        batchCode: true,
        flavor: true,
      },
    }),
    prisma.productionBatch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        batchCode: true,
        flavor: true,
        status: true,
        totalLitersProduced: true,
        packagedLiters: true,
        preparationDate: true,
        orderItems: { select: { id: true, orderId: true, totalLiters: true, packagingId: true } },
        orders: { select: { id: true, totalLiters: true } },
        discharges: { select: { id: true, totalLiters: true, packagingId: true } },
        packagings: { select: { id: true } },
      },
    }),
    prisma.batchDischarge.findMany({
      where: dischargeWhere,
      select: {
        id: true,
        batchId: true,
        bottleSize: true,
        quantityBottles: true,
        totalLiters: true,
        unitPrice: true,
        totalAmount: true,
        reasonType: true,
        notes: true,
        registeredBy: true,
        dischargeDate: true,
        batch: {
          select: {
            id: true,
            batchCode: true,
            flavor: true,
          },
        },
        staffMember: {
          select: {
            id: true,
            fullName: true,
            role: true,
            type: true,
          },
        },
      },
      orderBy: { dischargeDate: 'desc' },
    }),
    prisma.batchPackaging.findMany({
      where: {
        batch: {
          isActive: true,
          status: { not: 'ARCHIVADO' },
        },
      },
      include: {
        orderItems: {
          include: {
            order: {
              select: {
                id: true,
                deliveryStatus: true,
                discount: true,
                totalAmount: true,
                paidAmount: true,
                paymentStatus: true,
                items: true,
              },
            },
          },
        },
        discharges: true,
      },
    }),
    isPeriodFiltered
      ? prisma.cashMovement.findMany({
          select: { type: true, amount: true, paymentMethod: true },
        })
      : Promise.resolve(null),
    isPeriodFiltered
      ? prisma.order.findMany({
          where: { deliveryStatus: { not: 'CANCELLED' } },
          select: {
            paidAmount: true,
            paymentMethod: true,
            payments: {
              select: { amount: true, paymentMethod: true },
            },
          },
        })
      : Promise.resolve(null),
    isPeriodFiltered
      ? prisma.expense.findMany({
          select: { amount: true, paymentMethod: true, category: true, expenseDate: true },
        })
      : Promise.resolve(null),
    isPeriodFiltered
      ? prisma.purchase.findMany({
          select: { totalCost: true, paymentMethod: true, purchaseDate: true },
        })
      : Promise.resolve(null),
    isPeriodFiltered
      ? prisma.staffPayment.findMany({
          select: { netAmount: true, paymentMethod: true, paymentType: true },
        })
      : Promise.resolve(null),
  ]);

  const lowStockMaterials = rawMaterials.filter((m) => m.currentStock <= m.minStockAlert);

  const partnerDischarges = (batchDischarges || []).map((d) => {
    const batchCode = d.batch?.batchCode || 'Lote';
    const flavor = d.batch?.flavor || 'Natural';
    const partnerName =
      d.staffMember?.fullName || (d.reasonType === 'CONSUMO_SOCIO' ? 'Socio' : d.reasonType);
    const bottlesSummary = `${d.quantityBottles}x ${d.bottleSize} (${flavor})`;
    return {
      id: d.id,
      batchId: d.batchId,
      batchCode,
      flavor,
      partnerName,
      role: d.staffMember?.role || 'Socio',
      staffType: d.staffMember?.type || 'SOCIO',
      bottleSize: d.bottleSize,
      quantityBottles: d.quantityBottles,
      totalLiters: d.totalLiters,
      unitPrice: d.unitPrice,
      totalAmount: d.totalAmount,
      reasonType: d.reasonType,
      notes: d.notes,
      registeredBy: d.registeredBy,
      dischargeDate: d.dischargeDate,
      bottlesSummary,
    };
  });

  const totalPartnerDischargedLiters = partnerDischarges
    .filter((d) => d.reasonType === 'CONSUMO_SOCIO' || d.staffType === 'SOCIO' || d.partnerName)
    .reduce((sum, d) => sum + d.totalLiters, 0);

  const totalPartnerDischargedAmount = partnerDischarges
    .filter((d) => d.reasonType === 'CONSUMO_SOCIO' || d.staffType === 'SOCIO' || d.partnerName)
    .reduce((sum, d) => sum + d.totalAmount, 0);

  const totalAllDischargedLiters = partnerDischarges.reduce((sum, d) => sum + d.totalLiters, 0);

  const payrollPayments = staffPayments.filter((p) => p.paymentType !== 'RETIRO_SOCIO');
  const ownerDrawPayments = staffPayments.filter((p) => p.paymentType === 'RETIRO_SOCIO');
  const totalPayrollExpenses = payrollPayments.reduce((sum, p) => sum + p.netAmount, 0);
  const totalOwnerDraws = ownerDrawPayments.reduce((sum, p) => sum + p.netAmount, 0);

  const totalInjections = cashMovements
    .filter(
      (m) =>
        m.type === 'BASE_INICIAL' ||
        m.type === 'APORTE_SOCIO' ||
        m.type === 'AJUSTE_CAJA' ||
        m.type === 'AJUSTE_SOBRANTE' ||
        m.type === 'INGRESO'
    )
    .reduce((sum, m) => sum + m.amount, 0);

  const totalWithdrawals = cashMovements
    .filter(
      (m) =>
        m.type === 'RETIRO_BASE' ||
        m.type === 'DEVOLUCION_APORTE' ||
        m.type === 'AJUSTE_FALTANTE' ||
        m.type === 'EGRESO'
    )
    .reduce((sum, m) => sum + m.amount, 0);

  const netCashInjections = totalInjections - totalWithdrawals;

  const totalOrdersCount = orders.length;
  const totalLitersSold = orders.reduce((sum, o) => sum + o.totalLiters, 0);
  const totalSalesAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCashCollected = orders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalPendingToCollect = orders.reduce((sum, o) => sum + o.pendingAmount, 0);

  const deliveredOrders = orders.filter((o) => o.deliveryStatus === 'DELIVERED');
  const deliveredUnpaidOrders = deliveredOrders.filter((o) => o.pendingAmount > 0);
  const deliveredPendingToCollect = deliveredUnpaidOrders.reduce((sum, o) => sum + o.pendingAmount, 0);
  const deliveredPaidAmount = deliveredOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  const deliveredTotalSales = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const inProcessOrders = orders.filter((o) => o.deliveryStatus !== 'DELIVERED');
  const inProcessPendingToCollect = inProcessOrders.reduce((sum, o) => sum + o.pendingAmount, 0);
  const inProcessPaidAmount = inProcessOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  const inProcessTotalSales = inProcessOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const totalLitersAll = orders.reduce((sum, o) => sum + o.totalLiters, 0);
  const deliveredLiters = deliveredOrders.reduce((sum, o) => sum + o.totalLiters, 0);
  const inProcessLiters = inProcessOrders.reduce((sum, o) => sum + o.totalLiters, 0);
  const totalDispatchedLiters = deliveredLiters + totalPartnerDischargedLiters;

  const rawMaterialExpenses = expenses.filter(
    (e) => e.category === 'INSUMOS_EXTRA' || e.category === 'MATERIA_PRIMA'
  );
  const generalExpenses = expenses.filter(
    (e) => e.category !== 'INSUMOS_EXTRA' && e.category !== 'MATERIA_PRIMA'
  );

  const totalRawMaterialPurchases = purchases.length > 0
    ? purchases.reduce((sum, p) => sum + p.totalCost, 0)
    : rawMaterialExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalGeneralExpenses = generalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = totalRawMaterialPurchases + totalGeneralExpenses + totalPayrollExpenses;
  const totalOutflow =
    totalRawMaterialPurchases +
    totalGeneralExpenses +
    totalPayrollExpenses +
    totalOwnerDraws +
    totalWithdrawals;

  const netProfit = totalCashCollected - totalExpenses;

  const isCash = (m?: string | null) => !m || m.toUpperCase().trim() === 'EFECTIVO';

  // 1. Flujos de caja por canal DEL PERÍODO SELECCIONADO
  let totalInflowCash = 0;
  let totalInflowBank = 0;
  let totalOutflowCash = 0;
  let totalOutflowBank = 0;

  for (const m of cashMovements) {
    if (
      m.type === 'BASE_INICIAL' ||
      m.type === 'APORTE_SOCIO' ||
      m.type === 'AJUSTE_CAJA' ||
      m.type === 'AJUSTE_SOBRANTE' ||
      m.type === 'INGRESO'
    ) {
      if (isCash(m.paymentMethod)) {
        totalInflowCash += m.amount;
      } else {
        totalInflowBank += m.amount;
      }
    } else if (
      m.type === 'RETIRO_BASE' ||
      m.type === 'DEVOLUCION_APORTE' ||
      m.type === 'AJUSTE_FALTANTE' ||
      m.type === 'EGRESO'
    ) {
      if (isCash(m.paymentMethod)) {
        totalOutflowCash += m.amount;
      } else {
        totalOutflowBank += m.amount;
      }
    }
  }

  for (const o of orders) {
    if (o.payments && o.payments.length > 0) {
      for (const p of o.payments) {
        if (p.amount > 0) {
          if (isCash(p.paymentMethod)) {
            totalInflowCash += p.amount;
          } else {
            totalInflowBank += p.amount;
          }
        }
      }
    } else if (o.paidAmount > 0) {
      if (isCash(o.paymentMethod)) {
        totalInflowCash += o.paidAmount;
      } else {
        totalInflowBank += o.paidAmount;
      }
    }
  }

  for (const e of expenses) {
    if (isCash(e.paymentMethod)) {
      totalOutflowCash += e.amount;
    } else {
      totalOutflowBank += e.amount;
    }
  }

  const periodUnexpensedPurchases = purchases.filter((p) => {
    const pDate = p.purchaseDate ? new Date(p.purchaseDate).toISOString().split('T')[0] : '';
    return !expenses.some((e) => {
      const eDate = e.expenseDate ? new Date(e.expenseDate).toISOString().split('T')[0] : '';
      const isSupplyExpense =
        e.category === 'INSUMOS_EXTRA' ||
        e.category === 'MATERIA_PRIMA' ||
        e.category === 'COMPRA_INSUMO' ||
        e.category.includes('Compra') ||
        e.category.includes('Insumo');
      return (
        isSupplyExpense &&
        Math.abs(e.amount - p.totalCost) < 1 &&
        (!pDate || !eDate || pDate === eDate)
      );
    });
  });

  for (const p of periodUnexpensedPurchases) {
    if (isCash(p.paymentMethod)) {
      totalOutflowCash += p.totalCost;
    } else {
      totalOutflowBank += p.totalCost;
    }
  }

  for (const sp of staffPayments) {
    if (sp.paymentMethod === 'ESPECIE_PRODUCTO' || sp.paymentMethod === 'ESPECIE') {
      continue;
    }
    if (isCash(sp.paymentMethod)) {
      totalOutflowCash += sp.netAmount;
    } else {
      totalOutflowBank += sp.netAmount;
    }
  }

  // 2. SALDOS REALES ACUMULADOS EN CAJA Y BANCOS (Arqueo real histórico disponible en tiempo real)
  const treasuryCashMovements = (allTimeCashMovements as typeof cashMovements | null) || cashMovements;
  const treasuryOrders = (allTimeOrders as typeof orders | null) || orders;
  const treasuryExpenses = (allTimeExpenses as typeof expenses | null) || expenses;
  const treasuryPurchases = (allTimePurchases as typeof purchases | null) || purchases;
  const treasuryStaffPayments = (allTimeStaffPayments as typeof staffPayments | null) || staffPayments;

  let cashInHand = 0;
  let digitalBank = 0;

  for (const m of treasuryCashMovements) {
    if (
      m.type === 'BASE_INICIAL' ||
      m.type === 'APORTE_SOCIO' ||
      m.type === 'AJUSTE_CAJA' ||
      m.type === 'AJUSTE_SOBRANTE' ||
      m.type === 'INGRESO'
    ) {
      if (isCash(m.paymentMethod)) {
        cashInHand += m.amount;
      } else {
        digitalBank += m.amount;
      }
    } else if (
      m.type === 'RETIRO_BASE' ||
      m.type === 'DEVOLUCION_APORTE' ||
      m.type === 'AJUSTE_FALTANTE' ||
      m.type === 'EGRESO'
    ) {
      if (isCash(m.paymentMethod)) {
        cashInHand -= m.amount;
      } else {
        digitalBank -= m.amount;
      }
    } else if (m.type === 'TRASLADO_EFECTIVO_A_BANCO') {
      cashInHand -= m.amount;
      digitalBank += m.amount;
    } else if (m.type === 'TRASLADO_BANCO_A_EFECTIVO') {
      cashInHand += m.amount;
      digitalBank -= m.amount;
    }
  }

  for (const o of treasuryOrders) {
    if (o.payments && o.payments.length > 0) {
      for (const p of o.payments) {
        if (p.amount > 0) {
          if (isCash(p.paymentMethod)) {
            cashInHand += p.amount;
          } else {
            digitalBank += p.amount;
          }
        }
      }
    } else if (o.paidAmount > 0) {
      if (isCash(o.paymentMethod)) {
        cashInHand += o.paidAmount;
      } else {
        digitalBank += o.paidAmount;
      }
    }
  }

  for (const e of treasuryExpenses) {
    if (isCash(e.paymentMethod)) {
      cashInHand -= e.amount;
    } else {
      digitalBank -= e.amount;
    }
  }

  const allUnexpensedPurchases = treasuryPurchases.filter((p) => {
    const pDate = p.purchaseDate ? new Date(p.purchaseDate).toISOString().split('T')[0] : '';
    return !treasuryExpenses.some((e) => {
      const eDate = e.expenseDate ? new Date(e.expenseDate).toISOString().split('T')[0] : '';
      const isSupplyExpense =
        e.category === 'INSUMOS_EXTRA' ||
        e.category === 'MATERIA_PRIMA' ||
        e.category === 'COMPRA_INSUMO' ||
        e.category.includes('Compra') ||
        e.category.includes('Insumo');
      return (
        isSupplyExpense &&
        Math.abs(e.amount - p.totalCost) < 1 &&
        (!pDate || !eDate || pDate === eDate)
      );
    });
  });

  for (const p of allUnexpensedPurchases) {
    if (isCash(p.paymentMethod)) {
      cashInHand -= p.totalCost;
    } else {
      digitalBank -= p.totalCost;
    }
  }

  for (const sp of treasuryStaffPayments) {
    if (sp.paymentMethod === 'ESPECIE_PRODUCTO' || sp.paymentMethod === 'ESPECIE') {
      continue;
    }
    if (isCash(sp.paymentMethod)) {
      cashInHand -= sp.netAmount;
    } else {
      digitalBank -= sp.netAmount;
    }
  }

  const cashBalance = cashInHand + digitalBank;

  const totalLitersProducedAllTime = allActiveBatches.reduce((sum, b) => sum + b.totalLitersProduced, 0);
  const totalBatchesCountAllTime = allActiveBatches.length;

  const totalLitersProducedPeriod = periodBatches.reduce((sum, b) => sum + b.totalLitersProduced, 0);
  const totalBatchesCountPeriod = periodBatches.length;

  const batchesThisMonth = allActiveBatches.filter((b) => {
    const d = new Date(b.preparationDate);
    return d >= startOfCurrentMonth && d <= endOfCurrentMonth;
  });
  const totalLitersProducedThisMonth = batchesThisMonth.reduce(
    (sum, b) => sum + b.totalLitersProduced,
    0
  );
  const totalBatchesCountThisMonth = batchesThisMonth.length;

  // 3. Métricas de Stock de Fase B y Presentaciones envasadas disponibles (Spec 007)
  let availableLiters = 0;
  let availableBatchesCount = 0;
  const stockPresentationsMap = new Map<string, { name: string; quantity: number; capacityLiters: number; totalLiters: number }>();

  for (const pkg of (activePackagings || [])) {
    const computed = computePackagingPresentations(pkg);
    if (computed.freeLiters > 0.05) {
      availableBatchesCount += 1;
      availableLiters += computed.freeLiters;

      for (const pres of computed.presentations) {
        if (pres.free > 0) {
          const rawName = pres.containerName || `${pres.capacityLiters}L`;
          const key = cleanPresentationLabel(rawName, pres.capacityLiters);
          const existing = stockPresentationsMap.get(key) || {
            name: key,
            quantity: 0,
            capacityLiters: pres.capacityLiters,
            totalLiters: 0,
          };
          existing.quantity += pres.free;
          existing.totalLiters += pres.freeLiters;
          stockPresentationsMap.set(key, existing);
        }
      }
    }
  }

  // Soporte retrocompatible para lotes legacy que no tengan fracciones envasadas de Fase B (RF-4):
  for (const b of (allActiveBatches || [])) {
    if (b.status !== 'EN_FERMENTACION' && (!b.packagings || b.packagings.length === 0)) {
      const soldFromItems = b.orderItems?.reduce((sum: number, it: any) => sum + (Number(it.totalLiters) || 0), 0) || 0;
      const legacySold = (b.orders || [])
        .filter((o: any) => !b.orderItems?.some((it: any) => it.orderId === o.id))
        .reduce((sum: number, o: any) => sum + (Number(o.totalLiters) || 0), 0);
      const discharged = (b.discharges || []).reduce((sum: number, d: any) => sum + (Number(d.totalLiters) || 0), 0);
      const directAvailable = Math.max(0, (Number(b.totalLitersProduced) || 0) - (Number(b.packagedLiters) || 0) - (soldFromItems + legacySold) - discharged);
      if (directAvailable > 0.05) {
        availableLiters += directAvailable;
        availableBatchesCount += 1;
        const key = '1L';
        const existing = stockPresentationsMap.get(key) || {
          name: key,
          quantity: 0,
          capacityLiters: 1.0,
          totalLiters: 0,
        };
        existing.quantity += Math.round(directAvailable);
        existing.totalLiters += directAvailable;
        stockPresentationsMap.set(key, existing);
      }
    }
  }

  availableLiters = Math.round(availableLiters * 100) / 100;
  const availableStockPresentations = Array.from(stockPresentationsMap.values()).map((p) => ({
    ...p,
    totalLiters: Math.round(p.totalLiters * 100) / 100,
  }));

  // Desglose de despachos de pedidos por presentación (Spec 007)
  const computeOrdersBreakdown = (orderList: typeof orders) => {
    let totalUnits = 0;
    const map = new Map<string, { name: string; quantity: number; capacityLiters: number; totalLiters: number }>();

    for (const o of orderList) {
      if (o.items && o.items.length > 0) {
        for (const it of o.items) {
          const rawName = it.bottleSize || '1L';
          const qty = Number(it.quantity) || 1;
          const cap = it.litersPerUnit || resolvePresentationLiters(rawName);
          const vol = it.totalLiters || (qty * cap);
          totalUnits += qty;
          const name = cleanPresentationLabel(rawName, cap);

          const ex = map.get(name) || { name, quantity: 0, capacityLiters: cap, totalLiters: 0 };
          ex.quantity += qty;
          ex.totalLiters += vol;
          map.set(name, ex);
        }
      } else {
        const rawName = o.bottleSize || '1L';
        const qty = Number(o.quantityBottles) || 1;
        const cap = resolvePresentationLiters(rawName);
        const vol = o.totalLiters || (qty * cap);
        totalUnits += qty;
        const name = cleanPresentationLabel(rawName, cap);

        const ex = map.get(name) || { name, quantity: 0, capacityLiters: cap, totalLiters: 0 };
        ex.quantity += qty;
        ex.totalLiters += vol;
        map.set(name, ex);
      }
    }

    const breakdown = Array.from(map.values()).map((p) => ({
      ...p,
      totalLiters: Math.round(p.totalLiters * 100) / 100,
    }));

    return { totalUnits, breakdown };
  };

  const deliveredBreakdown = computeOrdersBreakdown(deliveredOrders);
  const inProcessBreakdown = computeOrdersBreakdown(inProcessOrders);
  const allOrdersBreakdown = computeOrdersBreakdown(orders);

  // Desglose de consumos de socios por presentación (Spec 007)
  let totalPartnerUnits = 0;
  const partnerMap = new Map<string, { name: string; quantity: number; capacityLiters: number; totalLiters: number }>();

  for (const d of batchDischarges || []) {
    const isPartner = d.reasonType === 'CONSUMO_SOCIO' || d.staffMember?.type === 'SOCIO' || d.staffMember?.fullName;
    if (isPartner) {
      const rawName = d.bottleSize || '1L';
      const qty = Number(d.quantityBottles) || 1;
      const vol = Number(d.totalLiters) || (qty * resolvePresentationLiters(rawName));
      const cap = qty > 0 ? Math.round((vol / qty) * 1000) / 1000 : resolvePresentationLiters(rawName);
      totalPartnerUnits += qty;
      const name = cleanPresentationLabel(rawName, cap);

      const ex = partnerMap.get(name) || { name, quantity: 0, capacityLiters: cap, totalLiters: 0 };
      ex.quantity += qty;
      ex.totalLiters += vol;
      partnerMap.set(name, ex);
    }
  }

  const partnerBreakdown = Array.from(partnerMap.values()).map((p) => ({
    ...p,
    totalLiters: Math.round(p.totalLiters * 100) / 100,
  }));

  const groupByBatchAndFlavor = (orderList: typeof orders) => {
    const groups: Record<
      string,
      {
        batchCode: string;
        flavor: string;
        totalLiters: number;
        totalBottles1L: number;
        totalBottles2L: number;
        totalUnits: number;
        presentationsBreakdown: Record<string, number>;
        totalAmount: number;
        paidAmount: number;
        pendingAmount: number;
        ordersCount: number;
        customers: Array<{
          id: number;
          orderNumber: string;
          customerName: string;
          customerPhone: string;
          address: string;
          liters: number;
          bottlesSummary: string;
          totalAmount: number;
          paidAmount: number;
          pendingAmount: number;
          paymentStatus?: string;
          paymentMethod?: string;
          deliveryStatus: string;
          orderDate: Date;
          deliveryDate: Date | null;
        }>;
      }
    > = {};

    orderList.forEach((o) => {
      const batchCode = o.batch?.batchCode || 'Sin Lote Asignado';
      const flavor = o.batch?.flavor || o.flavor || 'Natural';
      const key = `${batchCode}___${flavor}`;

      if (!groups[key]) {
        groups[key] = {
          batchCode,
          flavor,
          totalLiters: 0,
          totalBottles1L: 0,
          totalBottles2L: 0,
          totalUnits: 0,
          presentationsBreakdown: {},
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          ordersCount: 0,
          customers: [],
        };
      }

      const g = groups[key];
      g.totalLiters += o.totalLiters;
      g.totalAmount += o.totalAmount;
      g.paidAmount += o.paidAmount;
      g.pendingAmount += o.pendingAmount;
      g.ordersCount += 1;

      if (o.items && o.items.length > 0) {
        o.items.forEach((item) => {
          const size = item.bottleSize || '1L';
          const qty = Number(item.quantity) || 1;
          g.totalUnits = (g.totalUnits || 0) + qty;
          g.presentationsBreakdown[size] = (g.presentationsBreakdown[size] || 0) + qty;
          if (size === '1L') g.totalBottles1L += qty;
          if (size === '2L') g.totalBottles2L += qty;
        });
      } else {
        const size = o.bottleSize || '1L';
        const qty = Number(o.quantityBottles) || 1;
        g.totalUnits = (g.totalUnits || 0) + qty;
        g.presentationsBreakdown[size] = (g.presentationsBreakdown[size] || 0) + qty;
        if (size === '1L') g.totalBottles1L += qty;
        if (size === '2L') g.totalBottles2L += qty;
      }

      const bottlesSummary =
        o.items && o.items.length > 0
          ? o.items.map((it) => `${it.quantity}x ${it.bottleSize} (${it.flavor})`).join(', ')
          : `${o.quantityBottles}x ${o.bottleSize} (${o.flavor})`;

      g.customers.push({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer?.fullName || 'Cliente',
        customerPhone: o.customer?.phone || '',
        address: o.deliveryAddress || o.customer?.address || 'Fonseca',
        liters: o.totalLiters,
        bottlesSummary,
        totalAmount: o.totalAmount,
        paidAmount: o.paidAmount,
        pendingAmount: o.pendingAmount,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod || 'EFECTIVO',
        deliveryStatus: o.deliveryStatus,
        orderDate: o.orderDate,
        deliveryDate: o.deliveryDate,
      });
    });

    return Object.values(groups);
  };

  const deliveredGroups = groupByBatchAndFlavor(deliveredOrders);
  const inProcessGroups = groupByBatchAndFlavor(inProcessOrders);
  const allGroups = groupByBatchAndFlavor(orders);

  const ordersPaidCount = orders.filter((o) => o.paymentStatus === 'PAID').length;
  const ordersPartialCount = orders.filter((o) => o.paymentStatus === 'PARTIAL').length;
  const ordersPendingCount = orders.filter((o) => o.paymentStatus === 'PENDING').length;

  const ordersDeliveredCount = deliveredOrders.length;
  const ordersInRouteCount = orders.filter((o) => o.deliveryStatus === 'IN_ROUTE').length;
  const ordersPendingDeliveryCount = inProcessOrders.length;

  return {
    kpis: {
      totalOrdersCount,
      totalUnitsSold: deliveredBreakdown.totalUnits,
      availableLiters,
      availableBatchesCount,
      availableStockPresentations,
      totalLitersAll,
      totalLitersSold: deliveredLiters,
      totalSalesLiters: deliveredLiters,
      deliveredLiters,
      partnerDischargedLiters: totalPartnerDischargedLiters,
      partnerDischargedAmount: totalPartnerDischargedAmount,
      totalAllDischargedLiters,
      totalDispatchedLiters,
      inProcessLiters,
      totalSalesAmount,
      totalInjections,
      totalWithdrawals,
      netCashInjections,
      totalCashCollected,
      totalPendingToCollect,
      deliveredPendingToCollect,
      deliveredPaidAmount,
      deliveredTotalSales,
      inProcessPendingToCollect,
      inProcessPaidAmount,
      inProcessTotalSales,
      totalRawMaterialPurchases,
      totalGeneralExpenses,
      totalPayrollExpenses,
      totalOwnerDraws,
      totalExpenses,
      totalOutflow,
      cashBalance,
      cashInHand,
      digitalBank,
      totalInflowCash,
      totalInflowBank,
      totalOutflowCash,
      totalOutflowBank,
      netProfit,
      totalLitersProducedThisMonth,
      totalLitersProducedAllTime,
      totalBatchesCountThisMonth,
      totalBatchesCountAllTime,
      totalLitersProducedPeriod,
      totalBatchesCountPeriod,
      totalLitersProduced: totalLitersProducedPeriod ?? totalLitersProducedAllTime ?? 0,
    },
    deliveredStats: {
      deliveredOrdersCount: deliveredOrders.length,
      deliveredUnpaidCount: deliveredUnpaidOrders.length,
      deliveredPaidCount: deliveredOrders.filter((o) => o.pendingAmount === 0).length,
      deliveredPendingToCollect,
      deliveredPaidAmount,
      deliveredTotalSales,
      deliveredUnpaidOrders: deliveredUnpaidOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer?.fullName || 'Cliente',
        customerPhone: o.customer?.phone || '',
        deliveryAddress: o.deliveryAddress || o.customer?.address || 'Fonseca',
        totalAmount: o.totalAmount,
        paidAmount: o.paidAmount,
        pendingAmount: o.pendingAmount,
        totalLiters: o.totalLiters,
        flavor: o.flavor,
        paymentMethod: o.paymentMethod || 'EFECTIVO',
        deliveryDate: o.deliveryDate || o.orderDate,
      })),
    },
    inProcessStats: {
      inProcessOrdersCount: inProcessOrders.length,
      inProcessPendingToCollect,
      inProcessPaidAmount,
      inProcessTotalSales,
      inProcessPaidCount: inProcessOrders.filter((o) => o.paymentStatus === 'PAID').length,
      inProcessPartialCount: inProcessOrders.filter((o) => o.paymentStatus === 'PARTIAL').length,
      inProcessPendingCount: inProcessOrders.filter((o) => o.paymentStatus === 'PENDING').length,
    },
    paymentBreakdown: {
      paid: ordersPaidCount,
      partial: ordersPartialCount,
      pending: ordersPendingCount,
    },
    deliveryBreakdown: {
      delivered: ordersDeliveredCount,
      inRoute: ordersInRouteCount,
      pendingDelivery: ordersPendingDeliveryCount,
    },
    detailedBreakdowns: {
      cashFlow: {
        totalInflow: totalInjections + totalCashCollected,
        totalInjections,
        totalWithdrawals,
        netCashInjections,
        totalSalesCollected: totalCashCollected,
        totalOutflow,
        cashBalance,
        cashInHand,
        digitalBank,
        totalInflowCash,
        totalInflowBank,
        totalOutflowCash,
        totalOutflowBank,
        inflows: [
          ...cashMovements
            .filter(
              (m) =>
                m.type === 'BASE_INICIAL' ||
                m.type === 'APORTE_SOCIO' ||
                m.type === 'AJUSTE_CAJA' ||
                m.type === 'AJUSTE_SOBRANTE' ||
                m.type === 'INGRESO'
            )
            .map((m) => ({
              id: `cash_inj_${m.id}`,
              rawId: m.id,
              orderNumber:
                m.type === 'BASE_INICIAL'
                  ? '🏦 BASE-INICIAL'
                  : m.type === 'AJUSTE_SOBRANTE'
                  ? '⚖️ AJUSTE-SOBRANTE (+)'
                  : m.type === 'AJUSTE_CAJA'
                  ? '⚖️ AJUSTE-CAJA'
                  : m.type === 'INGRESO'
                  ? '💵 INGRESO-CAJA'
                  : '💼 APORTE-BOLSILLO',
              date: m.movementDate,
              createdAt: m.createdAt,
              customerName: m.staffMember ? m.staffMember.fullName : (m.registeredBy || 'Edier'),
              customerPhone: '',
              amount: m.amount,
              totalAmount: m.amount,
              pendingAmount: 0,
              flavor: m.concept,
              liters: 0,
              deliveryStatus: 'DEPOSITADO',
              paymentStatus: 'PAID',
              paymentMethod: m.paymentMethod || 'EFECTIVO',
              notes: m.notes,
              isCashMovement: true,
              movementType: m.type,
              category: m.type,
              categoryLabel:
                m.type === 'AJUSTE_SOBRANTE'
                  ? '⚖️ Ajuste Sobrante (+)'
                  : m.type === 'AJUSTE_CAJA'
                  ? '⚖️ Ajuste de Caja'
                  : m.type === 'INGRESO'
                  ? '💵 Ingreso de Caja'
                  : '🏦 Base / Aporte',
              rawMovement: m,
            })),
          ...orders
            .filter((o) => o.paidAmount > 0)
            .flatMap((o) => {
              const customerName = o.customer?.fullName || 'Cliente';
              const customerPhone = o.customer?.phone || '';
              const customerAddress = o.deliveryAddress || o.customer?.address || '';
              const orderCode = o.orderNumber
                ? (String(o.orderNumber).startsWith('PED-') ? String(o.orderNumber) : `PED-${o.orderNumber}`)
                : `PED-#${o.id}`;

              const itemsSummary = o.items && o.items.length > 0
                ? o.items.map((i: any) => `${i.quantity}x ${i.flavor} (${i.bottleSize})`).join(', ')
                : `${o.quantityBottles || 1}x ${o.flavor || 'Natural'} (${o.bottleSize || '1L'})`;

              if (o.payments && o.payments.length > 0) {
                return o.payments
                  .filter((p) => p.amount > 0)
                  .map((p) => ({
                    id: `order_pay_${p.id}`,
                    rawId: o.id,
                    orderId: o.id,
                    paymentId: p.id,
                    orderNumber: orderCode,
                    date: p.paymentDate || o.deliveryDate || o.orderDate,
                    createdAt: p.createdAt || o.createdAt,
                    customerName,
                    customerPhone,
                    customerAddress,
                    itemsSummary,
                    concept: `Pedido ${orderCode} - ${customerName}`,
                    description: `Cobro de venta ${orderCode} (${customerName})`,
                    amount: p.amount,
                    totalAmount: o.totalAmount,
                    paidAmount: o.paidAmount,
                    pendingAmount: o.pendingAmount,
                    flavor: o.flavor,
                    liters: o.totalLiters,
                    deliveryStatus: o.deliveryStatus,
                    deliveryType: o.deliveryType,
                    deliveryFee: o.deliveryFee || 0,
                    paymentStatus: o.paymentStatus,
                    paymentMethod: p.paymentMethod || 'EFECTIVO',
                    notes: p.notes || o.notes,
                    isCashMovement: false,
                    isOrderPayment: true,
                    categoryLabel: '🛒 Venta Pedido',
                    movementType: 'VENTA',
                  }));
              }
              return [
                {
                  id: String(o.id),
                  rawId: o.id,
                  orderId: o.id,
                  paymentId: 0,
                  orderNumber: orderCode,
                  date: o.deliveryDate || o.orderDate,
                  createdAt: o.createdAt,
                  customerName,
                  customerPhone,
                  customerAddress,
                  itemsSummary,
                  concept: `Pedido ${orderCode} - ${customerName}`,
                  description: `Cobro de venta ${orderCode} (${customerName})`,
                  amount: o.paidAmount,
                  totalAmount: o.totalAmount,
                  paidAmount: o.paidAmount,
                  pendingAmount: o.pendingAmount,
                  flavor: o.flavor,
                  liters: o.totalLiters,
                  deliveryStatus: o.deliveryStatus,
                  deliveryType: o.deliveryType,
                  deliveryFee: o.deliveryFee || 0,
                  paymentStatus: o.paymentStatus,
                  paymentMethod: o.paymentMethod || 'EFECTIVO',
                  notes: o.notes,
                  isCashMovement: false,
                  isOrderPayment: true,
                  categoryLabel: '🛒 Venta Pedido',
                  movementType: 'VENTA',
                },
              ];
            }),
        ].sort((a: any, b: any) => {
          const getTime = (item: any) => {
            const d = item.date ? new Date(item.date).getTime() : 0;
            if (!isNaN(d) && d > 0) return d;
            const c = item.createdAt ? new Date(item.createdAt).getTime() : 0;
            return !isNaN(c) ? c : 0;
          };
          return getTime(b) - getTime(a);
        }),
        outflows: [
          ...expenses.map((e) => {
            const isRawMaterial = e.category === 'INSUMOS_EXTRA' || e.category === 'MATERIA_PRIMA';
            return {
              id: `exp_${e.id}`,
              rawId: e.id,
              date: e.expenseDate,
              createdAt: e.createdAt,
              category: e.category,
              categoryLabel: isRawMaterial ? '🥛 Compra Insumo' : `⚙️ ${e.category}`,
              description: e.description,
              amount: e.amount,
              supplier: e.supplier || (isRawMaterial ? 'Proveedor local' : undefined),
              notes: e.notes,
              registeredBy: e.registeredBy,
              paymentMethod: e.paymentMethod || 'EFECTIVO',
              isPurchase: isRawMaterial,
            };
          }),
          ...periodUnexpensedPurchases.map((p) => ({
            id: `purch_${p.id}`,
            rawId: p.id,
            purchaseId: p.id,
            isPurchase: true,
            date: p.purchaseDate,
            createdAt: p.createdAt,
            category: 'INSUMOS_EXTRA',
            categoryLabel: '🥛 Compra Insumo',
            description: `${p.rawMaterial?.name || 'Insumo'} (${p.quantity} ${
              p.rawMaterial?.unit || 'und'
            })`,
            amount: p.totalCost,
            supplier: p.supplier || 'Proveedor local',
            paymentMethod: p.paymentMethod || 'EFECTIVO',
            notes: p.notes,
          })),
          ...payrollPayments.map((p) => ({
            id: `pay_${p.id}`,
            rawId: p.id,
            date: p.paymentDate,
            createdAt: p.createdAt,
            category: 'NOMINA',
            categoryLabel: '👥 Nómina',
            description: `${p.staff?.fullName || 'Personal'} - ${p.calculationDetails || 'Pago'}`,
            amount: p.netAmount,
            paymentMethod: p.paymentMethod || 'EFECTIVO',
            notes: p.notes,
          })),
          ...ownerDrawPayments.map((p) => ({
            id: `draw_${p.id}`,
            rawId: p.id,
            date: p.paymentDate,
            createdAt: p.createdAt,
            category: 'RETIRO_SOCIO',
            categoryLabel: '💼 Retiro Socio',
            description: `${p.staff?.fullName || 'Socio'} - ${p.calculationDetails || 'Retiro'}`,
            amount: p.netAmount,
            paymentMethod: p.paymentMethod || 'EFECTIVO',
            notes: p.notes,
          })),
          ...cashMovements
            .filter(
              (m) =>
                m.type === 'RETIRO_BASE' ||
                m.type === 'DEVOLUCION_APORTE' ||
                m.type === 'AJUSTE_FALTANTE' ||
                m.type === 'EGRESO'
            )
            .map((m) => ({
              id: `cash_ret_${m.id}`,
              rawId: m.id,
              date: m.movementDate,
              createdAt: m.createdAt,
              category: m.type,
              categoryLabel:
                m.type === 'AJUSTE_FALTANTE'
                  ? '⚖️ Ajuste Faltante / 4x1000 (-)'
                  : m.type === 'DEVOLUCION_APORTE'
                  ? '🔄 Devolución Aporte Socio'
                  : m.type === 'EGRESO'
                  ? '📤 Egreso de Caja'
                  : '🏦 Retiro de Base',
              description: m.staffMember
                ? `${m.concept} (${m.staffMember.fullName})`
                : `${m.concept} (${m.registeredBy || 'Edier'})`,
              amount: m.amount,
              notes: m.notes,
              paymentMethod: m.paymentMethod || 'EFECTIVO',
              isCashMovement: true,
              rawMovement: m,
            })),
        ].sort((a: any, b: any) => {
          const getTime = (item: any) => {
            const d = item.date ? new Date(item.date).getTime() : 0;
            if (!isNaN(d) && d > 0) return d;
            const c = item.createdAt ? new Date(item.createdAt).getTime() : 0;
            return !isNaN(c) ? c : 0;
          };
          return getTime(b) - getTime(a);
        }),
        transfers: cashMovements
          .filter(
            (m) =>
              m.type === 'TRASLADO_EFECTIVO_A_BANCO' || m.type === 'TRASLADO_BANCO_A_EFECTIVO'
          )
          .map((m) => ({
            id: `cash_trans_${m.id}`,
            rawId: m.id,
            date: m.movementDate,
            createdAt: m.createdAt,
            type: m.type,
            category: 'TRASLADO',
            categoryLabel:
              m.type === 'TRASLADO_EFECTIVO_A_BANCO'
                ? '🔄 Efectivo ➔ Transferencia'
                : '🔄 Transferencia ➔ Efectivo',
            description: m.concept,
            amount: m.amount,
            paymentMethod:
              m.type === 'TRASLADO_EFECTIVO_A_BANCO'
                ? 'EFECTIVO ➔ TRANSFERENCIA'
                : 'TRANSFERENCIA ➔ EFECTIVO',
            notes: m.notes,
            registeredBy: m.registeredBy || 'Edier',
            isCashMovement: true,
            rawMovement: m,
          })),
      },
      expenses: {
        rawMaterials: purchases.map((p) => ({
          id: p.id,
          date: p.purchaseDate,
          createdAt: p.createdAt,
          name: p.rawMaterial?.name || 'Insumo',
          category: p.rawMaterial?.category || 'INSUMO',
          quantity: p.quantity,
          unit: p.rawMaterial?.unit || 'Und',
          unitCost: p.unitCost,
          totalCost: p.totalCost,
          supplier: p.supplier || 'Proveedor local',
        })),
        generalExpenses: expenses.map((e) => ({
          id: e.id,
          date: e.expenseDate,
          createdAt: e.createdAt,
          category: e.category,
          description: e.description,
          amount: e.amount,
          notes: e.notes,
        })),
        payroll: payrollPayments.map((p) => ({
          id: p.id,
          date: p.paymentDate,
          createdAt: p.createdAt,
          staffName: p.staff?.fullName || 'Colaborador',
          role: p.staff?.role || 'Personal',
          paymentType: p.paymentType,
          calculationDetails: p.calculationDetails || 'Pago nómina',
          netAmount: p.netAmount,
          paymentMethod: p.paymentMethod,
          period:
            p.periodStart && p.periodEnd
              ? `${p.periodStart.toISOString().split('T')[0]} al ${
                  p.periodEnd.toISOString().split('T')[0]
                }`
              : null,
        })),
        ownerDraws: ownerDrawPayments.map((p) => ({
          id: p.id,
          date: p.paymentDate,
          createdAt: p.createdAt,
          staffName: p.staff?.fullName || 'Socio',
          calculationDetails: p.calculationDetails || 'Retiro de utilidades',
          netAmount: p.netAmount,
          paymentMethod: p.paymentMethod,
        })),
      },
      salesByBatchAndFlavor: {
        delivered: deliveredGroups,
        inProcess: inProcessGroups,
        all: allGroups,
        partnerDischarges,
        dischargesSummary: {
          totalPartnerLiters: totalPartnerDischargedLiters,
          totalPartnerAmount: totalPartnerDischargedAmount,
          totalAllDischargedLiters,
          dischargesCount: partnerDischarges.length,
        },
      },
    },
    lowStockAlerts: lowStockMaterials.slice(0, 5).map((m) => ({
      id: m.id,
      name: m.name,
      code: m.code,
      currentStock: m.currentStock,
      minStockAlert: m.minStockAlert,
      unit: m.unit,
    })),
    creditSummary: {
      totalRemainingDebt: activeCreditObligations.reduce((sum, c) => sum + c.remainingBalance, 0),
      activeCreditsCount: activeCreditObligations.length,
      activeCredits: activeCreditObligations,
    },
    dispatchSummary: {
      clientDeliveries: {
        ordersCount: deliveredOrders.length,
        liters: Math.round(deliveredLiters * 100) / 100,
        totalUnits: deliveredBreakdown.totalUnits,
        presentationsBreakdown: deliveredBreakdown.breakdown,
        totalAmount: deliveredTotalSales,
        paidAmount: deliveredPaidAmount,
        pendingAmount: deliveredPendingToCollect,
      },
      partnerConsumptions: {
        dischargesCount: partnerDischarges.length,
        liters: Math.round(totalPartnerDischargedLiters * 100) / 100,
        totalUnits: totalPartnerUnits,
        presentationsBreakdown: partnerBreakdown,
        totalAmount: totalPartnerDischargedAmount,
      },
      totalDispatchedLiters: Math.round(totalDispatchedLiters * 100) / 100,
      inProcessOrders: {
        ordersCount: inProcessOrders.length,
        liters: Math.round(inProcessLiters * 100) / 100,
        totalUnits: inProcessBreakdown.totalUnits,
        presentationsBreakdown: inProcessBreakdown.breakdown,
        totalAmount: inProcessTotalSales,
        paidAmount: inProcessPaidAmount,
        pendingAmount: inProcessPendingToCollect,
      },
    },
    allActiveBatches: allActiveBatches.map((b) => ({
      id: b.id,
      code: b.batchCode,
      flavor: b.flavor,
      status: b.status,
      totalLiters: b.totalLitersProduced,
    })),
    periodBatches: periodBatches.map((b) => ({
      id: b.id,
      code: b.batchCode,
      flavor: b.flavor,
      totalLiters: b.totalLitersProduced,
      status: 'TERMINADO',
      efficiencyRate: b.yieldPercentage,
    })),
    recentOrders: orders.slice(0, 5).map((o) => {
      const itemsSummary = o.items && o.items.length > 0
        ? o.items.map((it) => `${it.quantity}x ${it.bottleSize || '1L'} (${it.flavor || o.flavor || 'Natural'})`).join(', ')
        : `${o.quantityBottles}x ${o.bottleSize || '1L'} (${o.flavor || 'Natural'})`;
      const totalUnits = o.items && o.items.length > 0
        ? o.items.reduce((s, it) => s + (it.quantity || 0), 0)
        : (o.quantityBottles || 1);

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer?.fullName || 'Cliente mostrador',
        total: o.totalAmount,
        totalAmount: o.totalAmount,
        paidAmount: o.paidAmount ?? (o.payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0),
        pendingAmount: o.pendingAmount ?? Math.max(0, o.totalAmount - (o.paidAmount ?? 0)),
        paymentStatus: o.paymentStatus,
        status: o.paymentStatus,
        deliveryStatus: o.deliveryStatus,
        orderDate: o.orderDate,
        itemsSummary,
        totalUnits,
      };
    }),
    periodOrders: includeOrders === 'true' ? orders : [],
    inventorySummary: rawMaterials,
  };
};
