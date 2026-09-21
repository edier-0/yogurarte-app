import { Request, Response, NextFunction } from 'express';
import * as ordersService from './orders.service.js';

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await ordersService.getOrders(req.query as any);
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await ordersService.getOrderById(Number(req.params.id));
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await ordersService.createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await ordersService.updateOrder(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const assignDriver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await ordersService.assignDriver(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const updateDeliveryStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await ordersService.updateDeliveryStatus(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const rescheduleOverdueOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ordersService.rescheduleOverdueOrders();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const addOrderPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ordersService.addOrderPayment(Number(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateOrderPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await ordersService.updateOrderPayment(
      Number(req.params.id),
      Number(req.params.paymentId),
      req.body
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteOrderPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ordersService.deleteOrderPayment(
      Number(req.params.id),
      Number(req.params.paymentId)
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ordersService.deleteOrder(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getWhatsAppLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ordersService.getWhatsAppLink(
      Number(req.params.id),
      req.query.type as string | undefined
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};
