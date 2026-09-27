import { Request, Response, NextFunction } from 'express';
import * as flavorsService from './flavors.service.js';

export const getFlavors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await flavorsService.getFlavors(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getFlavorById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flavor = await flavorsService.getFlavorById(Number(req.params.id));
    res.json(flavor);
  } catch (error) {
    next(error);
  }
};

export const createFlavor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flavor = await flavorsService.createFlavor(req.body);
    res.status(201).json(flavor);
  } catch (error) {
    next(error);
  }
};

export const toggleFlavor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flavor = await flavorsService.toggleFlavor(Number(req.params.id));
    res.json(flavor);
  } catch (error) {
    next(error);
  }
};

export const deleteFlavor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await flavorsService.deleteFlavor(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};
