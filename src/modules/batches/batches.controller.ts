import { Request, Response, NextFunction } from 'express';
import * as batchesService from './batches.service.js';

export const getBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batches = await batchesService.getBatches(req.query as any);
    res.json(batches);
  } catch (error) {
    next(error);
  }
};

export const getBatchById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batch = await batchesService.getBatchById(Number(req.params.id));
    res.json(batch);
  } catch (error) {
    next(error);
  }
};

export const createBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batch = await batchesService.createBatch(req.body);
    res.status(201).json(batch);
  } catch (error) {
    next(error);
  }
};

export const updateBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await batchesService.updateBatch(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deactivateBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.deactivateBatch(Number(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getPendingOrdersByFlavor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { flavor } = req.query;
    const result = await batchesService.getPendingOrdersByFlavor(flavor as string | undefined);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const linkOrdersToBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.linkOrdersToBatch(Number(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createBatchDischarge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.createBatchDischarge(Number(req.params.id), req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteBatchDischarge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.deleteBatchDischarge(Number(req.params.dischargeId));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createBatchPackaging = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.createBatchPackaging(Number(req.params.id), req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const unlinkOrderFromBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.unlinkOrderFromBatch(
      Number(req.params.id),
      Number(req.params.orderId)
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getBatchSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.getBatchSummary(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const recordPartnerWithdrawal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.recordPartnerWithdrawal(Number(req.params.id), req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getNextBatchCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.getNextBatchCode(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const patchBatchStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.patchBatchStatus(Number(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateBatchPackaging = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.updateBatchPackaging(Number(req.params.packagingId), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const patchBatchVolume = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await batchesService.patchBatchVolume(Number(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};



