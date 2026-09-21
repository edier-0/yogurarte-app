import { Request, Response, NextFunction } from 'express';
import * as preparationsService from './preparations.service.js';

export const getPreparations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const preparations = await preparationsService.getAllPreparations();
    res.json(preparations);
  } catch (error) {
    next(error);
  }
};

export const getPreparationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const preparation = await preparationsService.getPreparationById(Number(req.params.id));
    res.json(preparation);
  } catch (error) {
    next(error);
  }
};

export const createPreparation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const preparation = await preparationsService.createPreparation(req.body);
    res.status(201).json(preparation);
  } catch (error) {
    next(error);
  }
};

export const deletePreparation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await preparationsService.deletePreparation(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};
