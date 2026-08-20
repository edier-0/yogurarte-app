import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int('El ID debe ser un número entero').positive('El ID debe ser un número entero positivo'),
});
