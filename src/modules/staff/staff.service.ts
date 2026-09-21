import prisma from '../../prisma.js';
import { buildWhatsAppUrl } from '../../utils/whatsapp.utils.js';
import { parseColombiaDate } from '../../utils/date.utils.js';
import {
  BadRequestError,
  NotFoundError,
} from '../../shared/errors/appError.js';
import {
  CreateStaffInput,
  CreateStaffPaymentInput,
  StaffPaymentsQueryInput,
  StaffQueryInput,
  UpdateStaffInput,
  UpdateStaffPaymentInput,
} from './staff.schema.js';

// ============================================================================
// 1. GESTIÓN DE PERSONAL Y SOCIOS (STAFF MEMBERS)
// ============================================================================

/**
 * Listar miembros del personal y socios con filtros
 */
export const getStaff = async (query: StaffQueryInput) => {
  const { includeInactive, type } = query;

  const where: any = {};
  if (includeInactive !== 'true') {
    where.isActive = true;
  }
  if (type && typeof type === 'string') {
    where.type = type.toUpperCase();
  }

  return prisma.staffMember.findMany({
    where,
    orderBy: [
      { type: 'asc' }, // Socios primero
      { fullName: 'asc' },
    ],
    include: {
      payments: {
        orderBy: { paymentDate: 'desc' },
        take: 5,
      },
    },
  });
};

/**
 * Obtener un integrante por ID con su historial de pagos
 */
export const getStaffById = async (id: number) => {
  const member = await prisma.staffMember.findUnique({
    where: { id },
    include: {
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
    },
  });

  if (!member) {
    throw new NotFoundError('Integrante no encontrado');
  }

  return member;
};

/**
 * Crear un nuevo integrante (Socio o Empleado)
 */
export const createStaff = async (data: CreateStaffInput) => {
  const { fullName, phone, role, type, paymentScheme, defaultRate, bankInfo } = data;

  if (!fullName || fullName.trim() === '') {
    throw new BadRequestError('El nombre completo es obligatorio');
  }

  return prisma.staffMember.create({
    data: {
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : null,
      role: role || (type === 'SOCIO' ? 'SOCIO' : 'PRODUCCION'),
      type: type === 'SOCIO' ? 'SOCIO' : 'EMPLEADO',
      paymentScheme: paymentScheme || 'LIBRE',
      defaultRate: defaultRate ? Number(defaultRate) : 0,
      bankInfo: bankInfo ? bankInfo.trim() : null,
      isActive: true,
    },
  });
};

/**
 * Actualizar datos de un integrante
 */
export const updateStaff = async (id: number, data: UpdateStaffInput) => {
  const existing = await prisma.staffMember.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Integrante no encontrado');
  }

  const { fullName, phone, role, type, paymentScheme, defaultRate, bankInfo, isActive } = data;

  return prisma.staffMember.update({
    where: { id },
    data: {
      fullName: fullName !== undefined ? fullName.trim() : undefined,
      phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
      role: role !== undefined ? role : undefined,
      type: type !== undefined ? type : undefined,
      paymentScheme: paymentScheme !== undefined ? paymentScheme : undefined,
      defaultRate: defaultRate !== undefined ? Number(defaultRate) : undefined,
      bankInfo: bankInfo !== undefined ? (bankInfo ? bankInfo.trim() : null) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    },
  });
};

/**
 * Eliminar integrante del personal
 */
export const deleteStaff = async (id: number) => {
  const existing = await prisma.staffMember.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Integrante no encontrado');
  }

  const deleted = await prisma.staffMember.delete({
    where: { id },
  });

  return { message: 'Integrante eliminado correctamente', staff: deleted };
};

// ============================================================================
// 2. PAGOS DE NÓMINA, LIQUIDACIÓN Y RETIROS DE SOCIOS (PAYMENTS)
// ============================================================================

/**
 * Listar pagos y retiros de nómina con filtros temporales
 */
export const getStaffPayments = async (query: StaffPaymentsQueryInput) => {
  const { staffId, paymentType, date, startDate, endDate, month, period } = query;

  const where: any = {};

  if (staffId) {
    where.staffId = Number(staffId);
  }

  if (paymentType && typeof paymentType === 'string') {
    where.paymentType = paymentType.toUpperCase();
  }

  if (date && typeof date === 'string') {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    where.paymentDate = { gte: startOfDay, lte: endOfDay };
  } else if (startDate || endDate) {
    const dateFilter: any = {};
    if (startDate && typeof startDate === 'string') {
      dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate && typeof endDate === 'string') {
      dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    where.paymentDate = dateFilter;
  } else if (month && typeof month === 'string') {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const startOfMonth = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));
    where.paymentDate = { gte: startOfMonth, lte: endOfMonth };
  } else if (period && typeof period === 'string') {
    const now = new Date();
    if (period === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      where.paymentDate = {
        gte: new Date(`${todayStr}T00:00:00.000Z`),
        lte: new Date(`${todayStr}T23:59:59.999Z`),
      };
    } else if (period === 'yesterday') {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yStr = y.toISOString().split('T')[0];
      where.paymentDate = {
        gte: new Date(`${yStr}T00:00:00.000Z`),
        lte: new Date(`${yStr}T23:59:59.999Z`),
      };
    } else if (period === 'month') {
      const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
      where.paymentDate = { gte: startOfMonth, lte: endOfMonth };
    }
  }

  const payments = await prisma.staffPayment.findMany({
    where,
    orderBy: { paymentDate: 'desc' },
    include: {
      staff: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          role: true,
          type: true,
          bankInfo: true,
        },
      },
    },
  });

  const totalAmount = payments.reduce((sum: number, p: any) => sum + p.netAmount, 0);

  return {
    totalAmount,
    count: payments.length,
    payments,
  };
};

/**
 * Registrar un pago de nómina, retiro de socio o anticipo de forma atómica ($transaction)
 */
export const createStaffPayment = async (data: CreateStaffPaymentInput) => {
  const {
    staffId,
    paymentType,
    amount,
    deductions,
    netAmount,
    periodStart,
    periodEnd,
    paymentDate,
    calculationDetails,
    paymentMethod,
    notes,
    registeredBy,
  } = data;

  if (!staffId) {
    throw new BadRequestError('El integrante es obligatorio');
  }

  const grossAmount = Number(amount) || 0;
  const ded = Number(deductions) || 0;
  const finalNet = netAmount !== undefined ? Number(netAmount) : Math.max(0, grossAmount - ded);

  if (finalNet <= 0 && grossAmount <= 0) {
    throw new BadRequestError('El monto a pagar debe ser mayor a 0');
  }

  return await prisma.$transaction(async (tx) => {
    const staffMember = await tx.staffMember.findUnique({
      where: { id: Number(staffId) },
    });

    if (!staffMember) {
      throw new NotFoundError('Integrante no encontrado');
    }

    return tx.staffPayment.create({
      data: {
        staffId: Number(staffId),
        paymentType: paymentType || (staffMember.type === 'SOCIO' ? 'RETIRO_SOCIO' : 'NOMINA'),
        amount: grossAmount,
        deductions: ded,
        netAmount: finalNet,
        periodStart: periodStart ? parseColombiaDate(periodStart) : null,
        periodEnd: periodEnd ? parseColombiaDate(periodEnd) : null,
        paymentDate: parseColombiaDate(paymentDate),
        calculationDetails: calculationDetails || null,
        paymentMethod: paymentMethod || 'EFECTIVO',
        notes: notes || null,
        registeredBy: registeredBy || 'Administrador',
      },
      include: {
        staff: true,
      },
    });
  });
};

/**
 * Actualizar pago de nómina o retiro con atomicidad ($transaction)
 */
export const updateStaffPayment = async (id: number, data: UpdateStaffPaymentInput) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.staffPayment.findUnique({
      where: { id },
      include: { staff: true },
    });

    if (!existing) {
      throw new NotFoundError('Pago no encontrado');
    }

    const {
      staffId,
      paymentType,
      amount,
      deductions,
      netAmount,
      periodStart,
      periodEnd,
      paymentDate,
      calculationDetails,
      paymentMethod,
      notes,
      registeredBy,
    } = data;

    const updateData: any = {};
    if (staffId !== undefined) updateData.staffId = Number(staffId);
    if (paymentType !== undefined) updateData.paymentType = paymentType;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (deductions !== undefined) updateData.deductions = Number(deductions);

    if (netAmount !== undefined) {
      updateData.netAmount = Number(netAmount);
    } else if (amount !== undefined || deductions !== undefined) {
      const g = amount !== undefined ? Number(amount) : existing.amount;
      const d = deductions !== undefined ? Number(deductions) : existing.deductions;
      updateData.netAmount = Math.max(0, g - d);
    }

    if (periodStart !== undefined) updateData.periodStart = periodStart ? parseColombiaDate(periodStart) : null;
    if (periodEnd !== undefined) updateData.periodEnd = periodEnd ? parseColombiaDate(periodEnd) : null;
    if (paymentDate !== undefined) updateData.paymentDate = paymentDate ? parseColombiaDate(paymentDate) : existing.paymentDate;
    if (calculationDetails !== undefined) updateData.calculationDetails = calculationDetails || null;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (notes !== undefined) updateData.notes = notes || null;
    if (registeredBy !== undefined) updateData.registeredBy = registeredBy;

    return tx.staffPayment.update({
      where: { id },
      data: updateData,
      include: { staff: true },
    });
  });
};

/**
 * Eliminar pago de nómina ($transaction)
 */
export const deleteStaffPayment = async (id: number) => {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.staffPayment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Pago no encontrado');
    }

    await tx.staffPayment.delete({
      where: { id },
    });

    return { message: 'Pago de nómina eliminado correctamente' };
  });
};

/**
 * Generar enlace y mensaje interactivo de WhatsApp con comprobante de pago
 */
export const getStaffPaymentWhatsAppLink = async (id: number) => {
  const payment = await prisma.staffPayment.findUnique({
    where: { id },
    include: { staff: true },
  });

  if (!payment) {
    throw new NotFoundError('Pago no encontrado');
  }

  const formatMoney = (val: number) => `$${Math.round(val).toLocaleString('es-CO')} COP`;
  const formatDateStr = (d: Date | null) => (d ? new Date(d).toLocaleDateString('es-CO') : 'N/A');

  const isSocio = payment.paymentType === 'RETIRO_SOCIO';
  const title = isSocio ? '🤝 *COMPROBANTE DE RETIRO DE SOCIO*' : '🥛 *COMPROBANTE DE PAGO DE NÓMINA*';
  const business = '*YogurArte • Fonseca, La Guajira*';

  let message = `${title}\n${business}\n\n`;
  message += `👤 *Colaborador:* ${payment.staff.fullName}\n`;
  message += `💼 *Cargo:* ${payment.staff.role}\n`;
  message += `📅 *Fecha de Pago:* ${formatDateStr(payment.paymentDate)}\n`;

  if (payment.periodStart && payment.periodEnd) {
    message += `📆 *Periodo:* ${formatDateStr(payment.periodStart)} al ${formatDateStr(payment.periodEnd)}\n`;
  }

  if (payment.calculationDetails) {
    message += `📝 *Concepto:* ${payment.calculationDetails}\n`;
  }

  message += `\n💵 *Monto Bruto:* ${formatMoney(payment.amount)}\n`;
  if (payment.deductions > 0) {
    message += `➖ *Deducciones/Anticipos:* ${formatMoney(payment.deductions)}\n`;
  }
  message += `💰 *TOTAL PAGADO:* *${formatMoney(payment.netAmount)}*\n`;
  message += `💳 *Método:* ${payment.paymentMethod}\n`;

  if (payment.notes) {
    message += `\n📌 *Notas:* ${payment.notes}\n`;
  }

  message += `\n✨ _¡Gracias por formar parte del equipo de YogurArte!_ 🥛`;

  let targetPhone = (payment.staff.phone || '').trim();
  let phoneDigits = targetPhone.replace(/\D/g, '');

  if (phoneDigits.length < 7 && payment.staff.bankInfo) {
    const bankDigits = payment.staff.bankInfo.replace(/\D/g, '');
    if (bankDigits.length >= 7) {
      targetPhone = bankDigits;
      phoneDigits = bankDigits;
    }
  }

  if (phoneDigits.length < 7) {
    const searchKey = `${payment.staff.fullName || ''} ${payment.staff.phone || ''}`.toLowerCase();
    if (searchKey.includes('edier')) {
      targetPhone = '3024581882';
    } else if (searchKey.includes('yeilin')) {
      targetPhone = '3147464663';
    }
  }

  const whatsappUrl = buildWhatsAppUrl(targetPhone, message);

  return { whatsappUrl, message, phone: targetPhone };
};
