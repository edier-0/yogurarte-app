import { Request, Response } from 'express';
import prisma from '../prisma.js';

export const DEFAULT_SETTINGS: Record<string, string> = {
  nequiNumber: '3024581882',
  bankName: 'Nequi / Bancolombia',
  bankHolder: 'Edier / YogurArte',
  paymentInstructions: 'Transferencias vía Nequi o Bancolombia a la mano',
  daviplataNumber: '',
  bancolombiaAccount: '',
};

export const getSettingValue = async (key: string, defaultValue: string = ''): Promise<string> => {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key },
    });
    return record ? record.value : (DEFAULT_SETTINGS[key] ?? defaultValue);
  } catch (error) {
    console.error(`Error reading setting key "${key}":`, error);
    return DEFAULT_SETTINGS[key] ?? defaultValue;
  }
};

export const getAllSettingsMap = async (): Promise<Record<string, string>> => {
  try {
    const records = await prisma.systemSetting.findMany();
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const item of records) {
      result[item.key] = item.value;
    }
    return result;
  } catch (error) {
    console.error('Error reading all system settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await getAllSettingsMap();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Error al obtener la configuración del sistema' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Datos de configuración inválidos' });
    }

    const updatedKeys: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (typeof key === 'string' && value !== undefined) {
        const strVal = String(value ?? '').trim();
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: strVal },
          create: { key, value: strVal },
        });
        updatedKeys.push(key);
      }
    }

    const currentSettings = await getAllSettingsMap();
    res.json({
      message: 'Configuración guardada y actualizada correctamente',
      settings: currentSettings,
      updatedKeys,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Error al actualizar la configuración del sistema' });
  }
};
