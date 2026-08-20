import { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getCashMovements = async (req: Request, res: Response) => {
  try {
    const { type, startDate, endDate } = req.query;

    const whereClause: any = {};

    if (type && typeof type === 'string' && type !== 'ALL') {
      whereClause.type = type;
    }

    if (startDate || endDate) {
      whereClause.movementDate = {};
      if (startDate && typeof startDate === 'string') {
        whereClause.movementDate.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.movementDate.lte = end;
      }
    }

    const movements = await prisma.cashMovement.findMany({
      where: whereClause,
      orderBy: { movementDate: 'desc' },
    });

    const totalInjections = movements
      .filter((m) => m.type === 'BASE_INICIAL' || m.type === 'APORTE_SOCIO' || m.type === 'AJUSTE_CAJA')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalWithdrawals = movements
      .filter((m) => m.type === 'RETIRO_BASE')
      .reduce((sum, m) => sum + m.amount, 0);

    const netCashMovement = totalInjections - totalWithdrawals;

    res.json({
      count: movements.length,
      totalInjections,
      totalWithdrawals,
      netCashMovement,
      movements,
    });
  } catch (error) {
    console.error('Error fetching cash movements:', error);
    res.status(500).json({ error: 'Error al obtener movimientos de caja' });
  }
};

export const createCashMovement = async (req: Request, res: Response) => {
  try {
    const { type, amount, movementDate, concept, paymentMethod, notes, registeredBy } = req.body;

    const parsedAmount = Number(amount);
    if (!concept || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Concepto y monto válido son requeridos' });
    }

    const validTypes = [
      'BASE_INICIAL',
      'APORTE_SOCIO',
      'RETIRO_BASE',
      'AJUSTE_CAJA',
      'TRASLADO_EFECTIVO_A_BANCO',
      'TRASLADO_BANCO_A_EFECTIVO',
    ];
    const movementType = validTypes.includes(type) ? type : 'BASE_INICIAL';

    const movement = await prisma.cashMovement.create({
      data: {
        type: movementType,
        amount: parsedAmount,
        concept: concept.trim(),
        paymentMethod: paymentMethod || 'EFECTIVO',
        movementDate: movementDate ? new Date(movementDate) : new Date(),
        notes: notes ? notes.trim() : null,
        registeredBy: registeredBy || 'Edier',
      },
    });

    res.status(201).json(movement);
  } catch (error) {
    console.error('Error creating cash movement:', error);
    res.status(500).json({ error: 'Error al registrar movimiento de caja' });
  }
};

export const updateCashMovement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, amount, movementDate, concept, paymentMethod, notes, registeredBy } = req.body;

    const parsedAmount = Number(amount);
    if (!concept || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Concepto y monto válido son requeridos' });
    }

    const validTypes = [
      'BASE_INICIAL',
      'APORTE_SOCIO',
      'RETIRO_BASE',
      'AJUSTE_CAJA',
      'TRASLADO_EFECTIVO_A_BANCO',
      'TRASLADO_BANCO_A_EFECTIVO',
    ];
    const movementType = validTypes.includes(type) ? type : 'BASE_INICIAL';

    const movement = await prisma.cashMovement.update({
      where: { id: Number(id) },
      data: {
        type: movementType,
        amount: parsedAmount,
        concept: concept.trim(),
        paymentMethod: paymentMethod || 'EFECTIVO',
        movementDate: movementDate ? new Date(movementDate) : new Date(),
        notes: notes ? notes.trim() : null,
        registeredBy: registeredBy || 'Edier',
      },
    });

    res.json(movement);
  } catch (error) {
    console.error('Error updating cash movement:', error);
    res.status(500).json({ error: 'Error al actualizar movimiento de caja' });
  }
};

export const deleteCashMovement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.cashMovement.delete({
      where: { id: Number(id) },
    });
    res.json({ message: 'Movimiento de caja eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting cash movement:', error);
    res.status(500).json({ error: 'Error al eliminar movimiento de caja' });
  }
};

