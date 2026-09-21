import { Request, Response, NextFunction } from 'express';
import * as staffService from './staff.service.js';

export const getStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await staffService.getStaff(req.query as any);
    res.json(staff);
  } catch (error) {
    next(error);
  }
};

export const getStaffById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await staffService.getStaffById(Number(req.params.id));
    res.json(member);
  } catch (error) {
    next(error);
  }
};

export const createStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newStaff = await staffService.createStaff(req.body);
    res.status(201).json(newStaff);
  } catch (error) {
    next(error);
  }
};

export const updateStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await staffService.updateStaff(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await staffService.deleteStaff(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getStaffPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await staffService.getStaffPayments(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createStaffPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await staffService.createStaffPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

export const updateStaffPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await staffService.updateStaffPayment(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteStaffPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await staffService.deleteStaffPayment(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getStaffPaymentWhatsAppLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await staffService.getStaffPaymentWhatsAppLink(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};
