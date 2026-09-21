import { Request, Response, NextFunction } from 'express';
import * as financeService from './finance.service.js';

// ============================================================================
// 1. MOVIMIENTOS DE CAJA (CASH MOVEMENTS)
// ============================================================================

export const getCashMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await financeService.getCashMovements(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createCashMovement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const movement = await financeService.createCashMovement(req.body);
    res.status(201).json(movement);
  } catch (error) {
    next(error);
  }
};

export const updateCashMovement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await financeService.updateCashMovement(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteCashMovement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await financeService.deleteCashMovement(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 2. GASTOS OPERATIVOS (EXPENSES)
// ============================================================================

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await financeService.getExpenses(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await financeService.createExpense(req.body);
    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await financeService.deleteExpense(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 3. CRÉDITOS Y OBLIGACIONES (CREDITS)
// ============================================================================

export const getCredits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await financeService.getCredits();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createCredit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credit = await financeService.createCredit(req.body);
    res.status(201).json(credit);
  } catch (error) {
    next(error);
  }
};

export const payCreditInstallment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await financeService.payCreditInstallment(Number(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const skipCreditInstallment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await financeService.skipCreditInstallment(Number(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteCredit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await financeService.deleteCredit(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 4. DASHBOARD Y ANALÍTICA FINANCIERA
// ============================================================================

export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await financeService.getDashboardSummary(req.query as any);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};
