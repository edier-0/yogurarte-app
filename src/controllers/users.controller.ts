import { Request, Response } from 'express';
import prisma from '../prisma.js';

// Listar todos los usuarios del sistema
export const getUsers = async (req: Request, res: Response) => {
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
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// Obtener un usuario por ID
export const getUserById = async (req: Request, res: Response) => {
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
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

// Crear un nuevo usuario (Solo Admin)
export const createUser = async (req: Request, res: Response) => {
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
      return res.status(400).json({ error: 'El nombre de usuario ya está registrado' });
    }

    const validRoles = ['ADMIN', 'PRODUCCION', 'VENTAS', 'DOMICILIARIO'];
    const assignedRole = role && validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : 'VENTAS';

    const newUser = await prisma.user.create({
      data: {
        name: String(name).trim(),
        username: cleanUsername,
        password: String(password).trim(),
        pin: pin ? String(pin).trim() : '1234',
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
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// Actualizar usuario existente
export const updateUser = async (req: Request, res: Response) => {
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
        if (dup) return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
        updateData.username = cleanUsername;
      }
    }
    if (password && String(password).trim() !== '') {
      updateData.password = String(password).trim();
    }
    if (pin) updateData.pin = String(pin).trim();
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
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// Eliminar / Desactivar usuario
export const deleteUser = async (req: Request, res: Response) => {
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
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

// Iniciar sesión con validación de rol y estado activo
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Por favor ingresa usuario y contraseña' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const user = await prisma.user.findFirst({
      where: {
        username: { equals: cleanUsername, mode: 'insensitive' },
      },
    });

    if (!user || user.password !== cleanPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Tu cuenta se encuentra inactiva. Contacta a un administrador.' });
    }

    res.json({
      message: 'Inicio de sesión exitoso',
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
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Error en el servidor al iniciar sesión' });
  }
};

