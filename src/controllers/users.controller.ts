import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { generateToken } from '../utils/jwt.utils.js';

// Listar usuarios públicos para selector de login (solo usuarios activos, sin datos sensibles)
export const getPublicUsersList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      },
      orderBy: { id: 'asc' },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
};

// Listar todos los usuarios del sistema (Solo Admin)
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        email: true,
        bankInfo: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
};

// Obtener un usuario por ID
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        email: true,
        bankInfo: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Obtener el perfil del usuario autenticado actualmente
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        email: true,
        bankInfo: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// Crear un nuevo usuario (Solo Admin)
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, username, password, pin, role, phone, email, bankInfo } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Nombre, usuario y contraseña son obligatorios' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return res.status(409).json({ error: 'El nombre de usuario ya está registrado' });
    }

    const validRoles = ['ADMIN', 'PRODUCCION', 'VENTAS', 'DOMICILIARIO'];
    const assignedRole = role && validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : 'VENTAS';

    // Hashear contraseña y PIN con bcrypt
    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);
    const cleanPin = pin ? String(pin).trim() : '1234';

    const newUser = await prisma.user.create({
      data: {
        name: String(name).trim(),
        username: cleanUsername,
        password: hashedPassword,
        pin: cleanPin,
        role: assignedRole,
        phone: phone ? String(phone).trim() : null,
        email: email ? String(email).trim().toLowerCase() : null,
        bankInfo: bankInfo ? String(bankInfo).trim() : null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        email: true,
        bankInfo: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

// Actualizar usuario existente
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, username, password, pin, role, phone, email, bankInfo, isActive } = req.body;

    const existing = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const updateData: any = {};
    if (name) updateData.name = String(name).trim();
    if (username) {
      const cleanUsername = String(username).trim().toLowerCase();
      if (cleanUsername !== existing.username) {
        const dup = await prisma.user.findUnique({ where: { username: cleanUsername } });
        if (dup) return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
        updateData.username = cleanUsername;
      }
    }
    if (password && String(password).trim() !== '') {
      updateData.password = await bcrypt.hash(String(password).trim(), 10);
    }
    if (pin && String(pin).trim() !== '') {
      updateData.pin = String(pin).trim();
    }
    if (role) {
      const validRoles = ['ADMIN', 'PRODUCCION', 'VENTAS', 'DOMICILIARIO'];
      if (validRoles.includes(role.toUpperCase())) {
        updateData.role = role.toUpperCase();
      }
    }
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (email !== undefined) updateData.email = email ? String(email).trim().toLowerCase() : null;
    if (bankInfo !== undefined) updateData.bankInfo = bankInfo ? String(bankInfo).trim() : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        email: true,
        bankInfo: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Eliminar usuario
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = Number(id);

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No permitir eliminar a los socios administradores principales
    if (existing.username === 'edier' || existing.username === 'yeilin') {
      return res.status(400).json({ error: 'No es posible eliminar a los administradores principales' });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};

// Iniciar sesión con hashing bcrypt, migración automática y emisión de token JWT
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Por favor ingresa usuario y contraseña' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanUsername, mode: 'insensitive' } },
          { email: { equals: cleanUsername, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Tu cuenta se encuentra inactiva. Contacta a un administrador.' });
    }

    // Verificar si la contraseña coincide mediante bcrypt o migración transparente de texto plano
    let isPasswordValid = false;
    const isBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');

    if (isBcryptHash) {
      isPasswordValid = await bcrypt.compare(cleanPassword, user.password);
    } else {
      // Contraseña antigua en texto plano: verificar y actualizar a hash seguro automáticamente
      if (user.password === cleanPassword) {
        isPasswordValid = true;
        const newHash = await bcrypt.hash(cleanPassword, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: newHash },
        });
        console.log(`🔒 Contraseña del usuario "${user.username}" migrada exitosamente a hash bcrypt.`);
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Generar Token JWT firmado
    const token = generateToken({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    });

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        phone: user.phone,
        email: user.email,
        bankInfo: user.bankInfo,
      },
    });
  } catch (error) {
    next(error);
  }
};

import { sendPasswordResetEmail } from '../utils/email.utils.js';

// Almacén temporal de códigos de recuperación en memoria (15 minutos de validez)
const resetCodesMap = new Map<string, { code: string; expiresAt: number; attempts: number }>();

// Helper para ocultar parcialmente el correo (ej: ed***6@gmail.com)
function maskEmail(email: string | null): string {
  if (!email || !email.includes('@')) return 'tu correo registrado';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.substring(0, 2)}***${user[user.length - 1]}@${domain}`;
}

// Solicitar recuperación de contraseña ("¿Olvidaste tu contraseña?")
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Por favor ingresa tu nombre de usuario o correo' });
    }

    const cleanId = String(identifier).trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanId, mode: 'insensitive' } },
          { email: { equals: cleanId, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'No se encontró ninguna cuenta asociada a este usuario o correo.',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Esta cuenta se encuentra inactiva. Comunícate con los socios administradores.',
        code: 'USER_INACTIVE',
      });
    }

    // CASO A: Es un Administrador (Edier o Yeilin)
    if (user.role === 'ADMIN') {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      resetCodesMap.set(user.username.toLowerCase(), {
        code,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutos
        attempts: 0,
      });

      const masked = maskEmail(user.email);
      
      // Enviar el código EXCLUSIVAMENTE al correo registrado del administrador
      if (user.email) {
        await sendPasswordResetEmail(user.email, user.name, code);
      }

      console.log(`🔑 [SEGURIDAD] Código de verificación generado para administrador "${user.username}" (enviado a ${user.email}): ${code}`);

      return res.json({
        status: 'admin_recovery',
        role: 'ADMIN',
        username: user.username,
        name: user.name,
        emailMasked: masked,
        // NUNCA se envía el código en la respuesta HTTP: viaja solo al correo del dueño
        message: `Hemos enviado un código de seguridad de 6 dígitos a tu correo electrónico registrado (${masked}). Ingrésalo a continuación para crear tu nueva contraseña.`,
      });
    }

    // CASO B: Es un colaborador o domiciliario (PRODUCCION, VENTAS, DOMICILIARIO)
    // Se les indica que deben notificar a los administradores para restablecer su clave
    return res.json({
      status: 'notify_admin',
      role: user.role,
      username: user.username,
      name: user.name,
      admins: [
        { name: 'Edier Robles', phone: '3024581882' },
        { name: 'Yeilin Gomez', phone: '3147464663' },
      ],
      message: 'Por seguridad, las contraseñas de colaboradores y domiciliarios son restablecidas por los administradores principales.',
    });
  } catch (error) {
    next(error);
  }
};

// Restablecer contraseña para administradores con código de verificación
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, resetCode, newPassword } = req.body;

    if (!identifier || !resetCode || !newPassword) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanId, mode: 'insensitive' } },
          { email: { equals: cleanId, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'El restablecimiento con código directo solo está habilitado para administradores.',
      });
    }

    const storedData = resetCodesMap.get(user.username.toLowerCase());
    if (!storedData || Date.now() > storedData.expiresAt) {
      return res.status(400).json({
        error: 'El código de recuperación ha expirado o no es válido. Por favor solicita uno nuevo.',
      });
    }

    // Límite de 3 intentos para ingresar el código de 6 dígitos
    if (storedData.attempts >= 3) {
      resetCodesMap.delete(user.username.toLowerCase());
      return res.status(400).json({
        error: 'Demasiados intentos fallidos. Por tu seguridad, este código ha sido invalidado. Solicita un nuevo código.',
      });
    }

    if (storedData.code !== String(resetCode).trim()) {
      storedData.attempts += 1;
      const remaining = 3 - storedData.attempts;
      return res.status(400).json({
        error: `El código de seguridad ingresado es incorrecto.${remaining > 0 ? ` Te quedan ${remaining} intento(s).` : ' Código invalidado.'}`,
      });
    }

    // Hashear y guardar la nueva contraseña con bcrypt
    const hashedPassword = await bcrypt.hash(String(newPassword).trim(), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Limpiar el código usado
    resetCodesMap.delete(user.username.toLowerCase());

    console.log(`✅ Contraseña de administrador "${user.username}" actualizada exitosamente.`);

    res.json({
      message: '¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión con tu nueva contraseña.',
    });
  } catch (error) {
    next(error);
  }
};
