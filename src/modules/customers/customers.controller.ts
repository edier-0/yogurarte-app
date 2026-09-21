import { Request, Response, NextFunction } from 'express';
import * as customersService from './customers.service.js';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await customersService.getCustomers(req.query as any);
    if (result && typeof result === 'object' && 'pagination' in result) {
      res.setHeader('X-Total-Count', String((result as any).pagination.totalItems));
      res.setHeader('X-Total-Pages', String((result as any).pagination.totalPages));
      res.setHeader('X-Current-Page', String((result as any).pagination.currentPage));
      res.json(result);
    } else {
      res.json(result);
    }
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await customersService.getCustomerById(Number(req.params.id));
    res.json(customer);
  } catch (error) {
    next(error);
  }
};

export const getCustomerWhatsAppLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await customersService.getCustomerWhatsAppLink(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await customersService.createOrUpdateCustomer(req.body);
    const statusCode = req.body.id ? 200 : 201;
    res.status(statusCode).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await customersService.updateCustomer(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await customersService.deleteCustomer(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const applyCustomerPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await customersService.applyCustomerPayment(Number(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const resolveCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await customersService.resolveOrCreateCustomer(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
