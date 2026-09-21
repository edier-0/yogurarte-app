import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre completo es obligatorio'),
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres'),
  pin: z.string().optional().nullable(),
  role: z.enum(['ADMIN', 'PRODUCCION', 'VENTAS', 'DOMICILIARIO']).optional().default('VENTAS'),
  phone: z.string().optional().nullable(),
  email: z.string().email('Correo electrónico inválido').optional().nullable().or(z.literal('')),
  bankInfo: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  password: z.string().optional().nullable().or(z.literal('')),
  pin: z.string().optional().nullable(),
  role: z.enum(['ADMIN', 'PRODUCCION', 'VENTAS', 'DOMICILIARIO']).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Correo electrónico inválido').optional().nullable().or(z.literal('')),
  bankInfo: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Por favor ingresa tu nombre de usuario o correo'),
});

export const resetPasswordSchema = z.object({
  identifier: z.string().min(1, 'Por favor ingresa tu usuario o correo'),
  resetCode: z.string().min(4, 'El código de recuperación es obligatorio'),
  newPassword: z.string().min(4, 'La nueva contraseña debe tener al menos 4 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
