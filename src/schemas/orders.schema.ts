import { z } from 'zod';

export const orderItemSchema = z.object({
  batchId: z.coerce.number().optional().nullable(),
  bottleSize: z.string().optional().default('1L'),
  flavor: z.string().optional().default('Natural'),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1').default(1),
  unitPrice: z.coerce.number().optional(),
});

export const createOrderSchema = z.object({
  customerId: z.coerce.number().optional().nullable(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  batchId: z.coerce.number().optional().nullable(),
  bottleSize: z.string().optional(),
  flavor: z.string().optional(),
  quantityBottles: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  items: z.array(orderItemSchema).optional(),
  totalAmount: z.coerce.number().optional(),
  paidAmount: z.coerce.number().optional().default(0),
  paymentMethod: z.string().optional().default('EFECTIVO'),
  deliveryType: z.enum(['PROPIO', 'DOMICILIARIO', 'LOCAL']).optional().default('PROPIO'),
  deliveryDriverId: z.coerce.number().optional().nullable(),
  deliveryDriverName: z.string().optional().nullable(),
  deliveryStatus: z.enum(['PENDING', 'PREPARING', 'IN_ROUTE', 'DELIVERED', 'CANCELLED']).optional().default('PENDING'),
  orderDate: z.string().optional(),
  deliveryDate: z.string().optional().nullable().or(z.literal('')),
  deliveryAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const updateOrderSchema = z.object({
  customerId: z.coerce.number().optional().nullable(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  batchId: z.coerce.number().optional().nullable(),
  bottleSize: z.string().optional(),
  flavor: z.string().optional(),
  quantityBottles: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  items: z.array(orderItemSchema).optional(),
  totalAmount: z.coerce.number().optional(),
  paidAmount: z.coerce.number().optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  deliveryType: z.enum(['PROPIO', 'DOMICILIARIO', 'LOCAL']).optional(),
  deliveryDriverId: z.coerce.number().optional().nullable(),
  deliveryDriverName: z.string().optional().nullable(),
  deliveryStatus: z.enum(['PENDING', 'PREPARING', 'IN_ROUTE', 'DELIVERED', 'CANCELLED']).optional(),
  orderDate: z.string().optional(),
  deliveryDate: z.string().optional().nullable().or(z.literal('')),
  deliveryAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const assignDriverSchema = z.object({
  deliveryDriverId: z.coerce.number().int().positive('ID de repartidor inválido'),
  deliveryDriverName: z.string().optional().nullable(),
});

export const updateDeliveryStatusSchema = z.object({
  deliveryStatus: z.enum(['PENDING', 'PREPARING', 'IN_ROUTE', 'DELIVERED', 'CANCELLED']).optional(),
  paymentMethod: z.string().optional(),
  paidAmount: z.coerce.number().optional(),
  collectPayment: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});
