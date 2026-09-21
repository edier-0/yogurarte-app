import { Request, Response, NextFunction } from 'express';
import * as inventoryService from './inventory.service.js';

export const getMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const materials = await inventoryService.getMaterials(req.query as any);
    res.json(materials);
  } catch (error) {
    next(error);
  }
};

export const createMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const material = await inventoryService.createMaterial(req.body);
    res.status(201).json(material);
  } catch (error) {
    next(error);
  }
};

export const updateMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await inventoryService.updateMaterial(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await inventoryService.deleteMaterial(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await inventoryService.createPurchase(req.body);
    res.status(201).json(purchase);
  } catch (error) {
    next(error);
  }
};

export const updatePurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await inventoryService.updatePurchase(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deletePurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await inventoryService.deletePurchase(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await inventoryService.adjustStock(Number(req.params.id), req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAdjustmentsHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adjustments = await inventoryService.getAdjustmentsHistory(req.query as any);
    res.json(adjustments);
  } catch (error) {
    next(error);
  }
};

export const deleteAdjustment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await inventoryService.deleteAdjustment(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getPurchasesHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchases = await inventoryService.getPurchasesHistory(req.query as any);
    res.json(purchases);
  } catch (error) {
    next(error);
  }
};
