import { Request, Response, NextFunction } from 'express';
import * as settingsService from './settings.service.js';

export { DEFAULT_SETTINGS, getSettingValue, getAllSettingsMap } from './settings.service.js';

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await settingsService.getAllSettingsMap();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await settingsService.updateSettings(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
