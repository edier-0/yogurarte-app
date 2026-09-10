import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { buildWhatsAppUrl } from '../utils/whatsapp.utils.js';
import { parseColombiaDate } from '../utils/date.utils.js';

// Listar miembros del personal y socios
export const getStaff = async (req: Request, res: Response) => {
  try {
    const { includeInactive, type } = req.query;

    const where: any = {};
    if (includeInactive !== 'true') {
      where.isActive = true;
    }
    if (type && typeof type === 'string') {
      where.type = type.toUpperCase();
    }

    const staff = await prisma.staffMember.findMany({
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

    res.json(staff);
  } catch (error) {
    console.error('Error al obtener personal:', error);
    res.status(500).json({ error: 'Error al obtener personal' });
  }
};

// Obtener un integrante por ID con todo su historial
export const getStaffById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const member = await prisma.staffMember.findUnique({
      where: { id: Number(id) },
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!member) {
      return res.status(404).json({ error: 'Integrante no encontrado' });
    }

    res.json(member);
  } catch (error) {
    console.error('Error al obtener integrante:', error);
    res.status(500).json({ error: 'Error al obtener integrante' });
  }
};

// Crear integrante (Socio o Empleado)
export const createStaff = async (req: Request, res: Response) => {
  try {
    const { fullName, phone, role, type, paymentScheme, defaultRate, bankInfo } = req.body;

    if (!fullName || fullName.trim() === '') {
      return res.status(400).json({ error: 'El nombre completo es obligatorio' });
    }

    const newStaff = await prisma.staffMember.create({
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

    res.status(201).json(newStaff);
  } catch (error) {
    console.error('Error al crear integrante:', error);
    res.status(500).json({ error: 'Error al crear integrante' });
  }
};

// Actualizar integrante
export const updateStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, role, type, paymentScheme, defaultRate, bankInfo, isActive } = req.body;

    const updated = await prisma.staffMember.update({
      where: { id: Number(id) },
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

    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar integrante:', error);
    res.status(500).json({ error: 'Error al actualizar integrante' });
  }
};

// Eliminar integrante del personal
export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await prisma.staffMember.delete({
      where: { id: Number(id) },
    });
    res.json({ message: 'Integrante eliminado correctamente', staff: deleted });
  } catch (error) {
    console.error('Error al eliminar integrante:', error);
    res.status(500).json({ error: 'Error al eliminar integrante' });
  }
};

// Listar pagos y retiros de nómina con filtros
export const getStaffPayments = async (req: Request, res: Response) => {
  try {
    const { staffId, paymentType, date, startDate, endDate, month, period } = req.query;

    const where: any = {};

    if (staffId) {
      where.staffId = Number(staffId);
    }

    if (paymentType && typeof paymentType === 'string') {
      where.paymentType = paymentType.toUpperCase();
    }

    // Filtros de fecha
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

    res.json({
      totalAmount,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('Error al obtener pagos de nómina:', error);
    res.status(500).json({ error: 'Error al obtener pagos de nómina' });
  }
};

// Registrar un nuevo pago de nómina, retiro de socio o anticipo
export const createStaffPayment = async (req: Request, res: Response) => {
  try {
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
    } = req.body;

    if (!staffId) {
      return res.status(400).json({ error: 'El integrante es obligatorio' });
    }

    const staffMember = await prisma.staffMember.findUnique({
      where: { id: Number(staffId) },
    });

    if (!staffMember) {
      return res.status(404).json({ error: 'Integrante no encontrado' });
    }

    const grossAmount = Number(amount) || 0;
    const ded = Number(deductions) || 0;
    const finalNet = netAmount !== undefined ? Number(netAmount) : Math.max(0, grossAmount - ded);

    if (finalNet <= 0 && grossAmount <= 0) {
      return res.status(400).json({ error: 'El monto a pagar debe ser mayor a 0' });
    }

    const newPayment = await prisma.staffPayment.create({
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

    res.status(201).json(newPayment);
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: 'Error al registrar pago de nómina' });
  }
};

// Actualizar un pago de nómina o retiro de socio existente
export const updateStaffPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
    } = req.body;

    const existing = await prisma.staffPayment.findUnique({
      where: { id: Number(id) },
      include: { staff: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const data: any = {};
    if (staffId !== undefined) data.staffId = Number(staffId);
    if (paymentType !== undefined) data.paymentType = paymentType;
    if (amount !== undefined) data.amount = Number(amount);
    if (deductions !== undefined) data.deductions = Number(deductions);

    if (netAmount !== undefined) {
      data.netAmount = Number(netAmount);
    } else if (amount !== undefined || deductions !== undefined) {
      const g = amount !== undefined ? Number(amount) : existing.amount;
      const d = deductions !== undefined ? Number(deductions) : existing.deductions;
      data.netAmount = Math.max(0, g - d);
    }

    if (periodStart !== undefined) data.periodStart = periodStart ? parseColombiaDate(periodStart) : null;
    if (periodEnd !== undefined) data.periodEnd = periodEnd ? parseColombiaDate(periodEnd) : null;
    if (paymentDate !== undefined) data.paymentDate = paymentDate ? parseColombiaDate(paymentDate) : existing.paymentDate;
    if (calculationDetails !== undefined) data.calculationDetails = calculationDetails || null;
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
    if (notes !== undefined) data.notes = notes || null;
    if (registeredBy !== undefined) data.registeredBy = registeredBy;

    const updated = await prisma.staffPayment.update({
      where: { id: Number(id) },
      data,
      include: { staff: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar pago de nómina:', error);
    res.status(500).json({ error: 'Error al actualizar pago de nómina' });
  }
};

// Eliminar un pago de nómina
export const deleteStaffPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.staffPayment.delete({
      where: { id: Number(id) },
    });
    res.json({ message: 'Pago de nómina eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    res.status(500).json({ error: 'Error al eliminar pago' });
  }
};

// Generar enlace de WhatsApp con el comprobante de pago
export const getStaffPaymentWhatsAppLink = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await prisma.staffPayment.findUnique({
      where: { id: Number(id) },
      include: { staff: true },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
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

    // Resolver el teléfono numérico real para abrir el chat directo
    let targetPhone = (payment.staff.phone || '').trim();
    let phoneDigits = targetPhone.replace(/\D/g, '');

    // Si el campo phone es un username o no tiene al menos 7 dígitos, buscar en bankInfo
    if (phoneDigits.length < 7 && payment.staff.bankInfo) {
      const bankDigits = payment.staff.bankInfo.replace(/\D/g, '');
      if (bankDigits.length >= 7) {
        targetPhone = bankDigits;
        phoneDigits = bankDigits;
      }
    }

    // Si aún no tiene número, verificar nombres conocidos de socios
    if (phoneDigits.length < 7) {
      const searchKey = `${payment.staff.fullName || ''} ${payment.staff.phone || ''}`.toLowerCase();
      if (searchKey.includes('edier')) {
        targetPhone = '3024581882';
      } else if (searchKey.includes('yeilin')) {
        targetPhone = '3147464663';
      }
    }

    const whatsappUrl = buildWhatsAppUrl(targetPhone, message);

    res.json({ whatsappUrl, message, phone: targetPhone });
  } catch (error) {
    console.error('Error al generar enlace de WhatsApp:', error);
    res.status(500).json({ error: 'Error al generar enlace de WhatsApp' });
  }
};
