import { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { category, startDate, endDate } = req.query;

    const whereClause: any = {};

    if (category && typeof category === 'string' && category !== 'ALL') {
      whereClause.category = category;
    }

    if (startDate || endDate) {
      whereClause.expenseDate = {};
      if (startDate && typeof startDate === 'string') {
        whereClause.expenseDate.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.expenseDate.lte = end;
      }
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { expenseDate: 'desc' },
    });

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      totalAmount,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
};

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { category, description, amount, expenseDate, paymentMethod, notes, registeredBy } = req.body;

    const parsedAmount = Number(amount);
    if (!description || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Descripción y monto válido son requeridos' });
    }

    const expense = await prisma.expense.create({
      data: {
        category: category || 'OTRO',
        description: description.trim(),
        amount: parsedAmount,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMethod: paymentMethod ? paymentMethod.trim() : 'EFECTIVO',
        notes: notes ? notes.trim() : null,
        registeredBy: registeredBy || 'Edier',
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Error al registrar gasto' });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({
      where: { id: Number(id) },
    });
    res.json({ message: 'Gasto eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Error al eliminar gasto' });
  }
};
