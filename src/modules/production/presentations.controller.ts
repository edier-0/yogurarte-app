import { Request, Response, NextFunction } from 'express';
import * as presentationsService from './presentations.service.js';

export const getPresentations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await presentationsService.getPresentations(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getPresentationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const presentation = await presentationsService.getPresentationById(Number(req.params.id));
    res.json(presentation);
  } catch (error) {
    next(error);
  }
};

export const createPresentation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const presentation = await presentationsService.createPresentation(req.body);
    res.status(201).json(presentation);
  } catch (error) {
    next(error);
  }
};

export const updatePresentation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const presentation = await presentationsService.updatePresentation(Number(req.params.id), req.body);
    res.json(presentation);
  } catch (error) {
    next(error);
  }
};

export const togglePresentation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const presentation = await presentationsService.togglePresentation(Number(req.params.id));
    res.json(presentation);
  } catch (error) {
    next(error);
  }
};

export const deletePresentation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await presentationsService.deletePresentation(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};
