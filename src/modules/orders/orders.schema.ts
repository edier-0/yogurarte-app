import { z } from 'zod';

const toNullableNumber = (val: unknown) => {
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

const toOptionalNumber = (val: unknown, fallback?: number) => {
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

export const orderItemSchema = z.object({
  batchId: z.preprocess(toNullableNumber, z.number().int().positive().nullable().optional()),
  packagingId: z.preprocess(toNullableNumber, z.number().int().positive().nullable().optional()),
  bottleSize: z.string().optional().default('1L'),
  flavor: z.string().optional().default('Natural'),
  quantity: z.preprocess((v) => toOptionalNumber(v, 1), z.number().min(0, 'La cantidad no puede ser negativa').default(1)),
  unitPrice: z.preprocess((v) => toOptionalNumber(v), z.number().min(0).optional()),
});

export const createOrderSchema = z.object({
  customerId: z.preprocess(toNullableNumber, z.number().int().positive().nullable().optional()),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerNeighborhood: z.string().optional().nullable(),
  batchId: z.preprocess(toNullableNumber, z.number().int().positive().nullable().optional()),
  bottleSize: z.string().optional(),
  flavor: z.string().optional(),
  quantityBottles: z.preprocess((v) => toOptionalNumber(v), z.number().optional()),
  unitPrice: z.preprocess((v) => toOptionalNumber(v), z.number().optional()),
  totalLiters: z.preprocess((v) => toOptionalNumber(v), z.number().optional()),
  items: z.array(orderItemSchema).optional(),
  totalAmount: z.preprocess((v) => toOptionalNumber(v), z.number().optional()),
  paidAmount: z.preprocess((v) => toOptionalNumber(v, 0), z.number().optional().default(0)),
  paymentMethod: z.string().optional().default('EFECTIVO'),
  deliveryType: z.enum(['PROPIO', 'DOMICILIARIO', 'LOCAL']).optional().default('PROPIO'),
  deliveryDriverId: z.preprocess(toNullableNumber, z.number().int().positive().nullable().optional()),
  deliveryDriverName: z.string().optional().nullable(),
  deliveryFee: z.preprocess((v) => toOptionalNumber(v, 0), z.number().min(0).optional().default(0)),
  discount: z.preprocess((v) => toOptionalNumber(v, 0), z.number().min(0).optional().default(0)),
  isLoyaltyReward: z.boolean().optional(),
  deliveryStatus: z.enum(['PENDING', 'PREPARING', 'READY_FOR_DISPATCH', 'IN_ROUTE', 'DELIVERED', 'CANCELLED']).optional().default('PENDING'),
  orderDate: z.string().optional(),
  deliveryDate: z.string().optional().nullable().or(z.literal('')),
  deliveryAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const updateOrderSchema = z.object({
  customerId: z.preprocess(toNullableNumber, z.number().int().positive().nullable().optional()),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerNeighborhood: z.string().optional().nullable(),
  batchId: z.preprocess(toNullableNumber, z.number().int().positive().nullable().optional()),
  bottleSize: z.string().optional(),
  flavor: z.string().optional(),
  quantityBottles: z.preprocess((v) => toOptionalNumber(v), z.number().optional()),
  unitPrice: z.preprocess((v) => toOptionalNumber(v), z.number().optional()),
  totalLiters: z.preprocess((v) => toOptionalNumber(v), z.number().optional()),
  items: z.array(orderItemSchema).optional(),
  totalAmount: z.preprocess((v) => toOptionalNumber(v), z.number().optional()),
  paidAmount: z.preprocess((v) => toOptionalNumber(v), z.number().optional()),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  deliveryType: z.enum(['PROPIO', 'DOMICILIARIO', 'LOCAL']).optional(),
  deliveryDriverId: z.preprocess(toNullableNumber, z.number().int().positive().nullable().optional()),
  deliveryDriverName: z.string().optional().nullable(),
  deliveryFee: z.preprocess((v) => toOptionalNumber(v), z.number().min(0).optional()),
  discount: z.preprocess((v) => toOptionalNumber(v), z.number().min(0).optional()),
  deliveryStatus: z.enum(['PENDING', 'PREPARING', 'READY_FOR_DISPATCH', 'IN_ROUTE', 'DELIVERED', 'CANCELLED']).optional(),
  orderDate: z.string().optional(),
  deliveryDate: z.string().optional().nullable().or(z.literal('')),
  deliveryAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const assignDriverSchema = z.object({
  deliveryType: z.string().optional(),
  deliveryDriverId: z.coerce.number().int().positive('ID de repartidor inválido'),
  deliveryDriverName: z.string().optional().nullable(),
});

export const updateDeliveryStatusSchema = z.object({
  deliveryStatus: z.enum(['PENDING', 'PREPARING', 'READY_FOR_DISPATCH', 'IN_ROUTE', 'DELIVERED', 'CANCELLED']).optional(),
  paymentMethod: z.string().optional(),
  paidAmount: z.coerce.number().optional(),
  collectPayment: z.boolean().optional(),
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID']).optional(),
  notes: z.string().optional().nullable(),
});

export const addOrderPaymentSchema = z.object({
  amount: z.coerce.number().min(0, 'El monto del abono no puede ser negativo'),
  paymentMethod: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const updateOrderPaymentSchema = z.object({
  amount: z.coerce.number().min(0, 'El monto no puede ser negativo').optional(),
  paymentMethod: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const ordersQuerySchema = z.object({
  search: z.string().optional(),
  paymentStatus: z.string().optional(),
  deliveryStatus: z.string().optional(),
  debtCategory: z.enum(['DELIVERED_DEBT', 'PAID_NOT_DELIVERED', 'PAID_PENDING_DELIVERY', 'IN_PROCESS', 'PAID', 'ALL']).optional(),
  sortBy: z.enum(['UPDATED_DESC', 'PRIORITY_DEBT', 'DATE_DESC', 'DATE_ASC']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  month: z.string().optional(),
  date: z.string().optional(),
  batchId: z.string().optional(),
  deliveryType: z.string().optional(),
  driverId: z.string().optional(),
  deliveryDriverId: z.string().optional(),
  limit: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  paginate: z.enum(['true', 'false']).optional(),
});

export const ordersMetricsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  date: z.string().optional(),
  month: z.string().optional(),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;
export type AddOrderPaymentInput = z.infer<typeof addOrderPaymentSchema>;
export type UpdateOrderPaymentInput = z.infer<typeof updateOrderPaymentSchema>;
export type OrdersQueryInput = z.infer<typeof ordersQuerySchema>;
export type OrdersMetricsQueryInput = z.infer<typeof ordersMetricsQuerySchema>;
