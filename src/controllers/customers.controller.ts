import { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const { search, includeInactive } = req.query;

    const whereClause: any = {};
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      whereClause.OR = [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim() } },
        { address: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        orders: {
          select: {
            id: true,
            totalLiters: true,
            totalAmount: true,
            paidAmount: true,
            pendingAmount: true,
            paymentStatus: true,
            deliveryStatus: true,
            orderDate: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const customersWithStats = customers.map((c) => {
      const totalOrders = c.orders.length;
      const totalLiters = c.orders.reduce((acc, o) => acc + o.totalLiters, 0);
      const totalSpent = c.orders.reduce((acc, o) => acc + o.totalAmount, 0);
      const pendingDebt = c.orders.reduce((acc, o) => acc + o.pendingAmount, 0);

      return {
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        address: c.address,
        neighborhood: c.neighborhood,
        notes: c.notes,
        isActive: c.isActive,
        totalOrders,
        totalLiters,
        totalSpent,
        pendingDebt,
        createdAt: c.createdAt,
      };
    });

    res.json(customersWithStats);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
      include: {
        orders: {
          orderBy: { orderDate: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer by id:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

export const createOrUpdateCustomer = async (req: Request, res: Response) => {
  try {
    const { id, fullName, phone, address, neighborhood, notes } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
    }

    if (id) {
      const updated = await prisma.customer.update({
        where: { id: Number(id) },
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address ? address.trim() : '',
          neighborhood: neighborhood ? neighborhood.trim() : null,
          notes: notes ? notes.trim() : null,
          isActive: true,
        },
      });
      return res.json(updated);
    }

    const created = await prisma.customer.create({
      data: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address ? address.trim() : '',
        neighborhood: neighborhood ? neighborhood.trim() : null,
        notes: notes ? notes.trim() : null,
        isActive: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating/updating customer:', error);
    res.status(500).json({ error: 'Error al guardar cliente' });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, address, neighborhood, notes, isActive } = req.body;

    const updated = await prisma.customer.update({
      where: { id: Number(id) },
      data: {
        fullName: fullName !== undefined ? fullName.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        neighborhood: neighborhood !== undefined ? neighborhood.trim() : undefined,
        notes: notes !== undefined ? notes.trim() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Desactivar cliente (soft-delete para proteger historial de pedidos)
    await prisma.customer.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });

    res.json({ message: 'Cliente desactivado correctamente', id: Number(id) });
  } catch (error) {
    console.error('Error deactivating customer:', error);
    res.status(500).json({ error: 'Error al desactivar cliente' });
  }
};
