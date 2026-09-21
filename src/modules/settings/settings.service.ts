import prisma from '../../prisma.js';
import { BadRequestError } from '../../shared/errors/appError.js';
import { UpdateSettingsInput } from './settings.schema.js';

export const DEFAULT_SETTINGS: Record<string, string> = {
  nequiNumber: '3024581882',
  bankName: 'Nequi / Bancolombia',
  bankHolder: 'Edier / YogurArte',
  paymentInstructions: 'Transferencias vía Nequi o Bancolombia a la mano',
  daviplataNumber: '',
  bancolombiaAccount: '',
  instagramUrl: 'https://www.instagram.com/yogurartesanalfonseca?igsi=ZXNjM2dxZ3Z1dXg4&utm_source=qr',
};

export async function getSettingValue(key: string, defaultValue: string = ''): Promise<string> {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key },
    });
    return record ? record.value : (DEFAULT_SETTINGS[key] ?? defaultValue);
  } catch (error) {
    console.error(`Error reading setting key "${key}":`, error);
    return DEFAULT_SETTINGS[key] ?? defaultValue;
  }
}

export async function getAllSettingsMap(): Promise<Record<string, string>> {
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
}

export async function updateSettings(updates: UpdateSettingsInput) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new BadRequestError('Datos de configuración inválidos');
  }

  const updatedKeys: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const [key, value] of Object.entries(updates)) {
      if (typeof key === 'string' && value !== undefined) {
        const strVal = String(value ?? '').trim();
        await tx.systemSetting.upsert({
          where: { key },
          update: { value: strVal },
          create: { key, value: strVal },
        });
        updatedKeys.push(key);
      }
    }
  });

  const currentSettings = await getAllSettingsMap();

  return {
    message: 'Configuración guardada y actualizada correctamente',
    settings: currentSettings,
    updatedKeys,
  };
}
