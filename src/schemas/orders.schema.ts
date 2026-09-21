/**
 * Re-exportación para compatibilidad durante la migración arquitectónica (ADR-001)
 */
export {
  orderItemSchema,
  createOrderSchema,
  updateOrderSchema,
  assignDriverSchema,
  updateDeliveryStatusSchema,
  addOrderPaymentSchema,
  updateOrderPaymentSchema,
  ordersQuerySchema,
  type OrderItemInput,
  type CreateOrderInput,
  type UpdateOrderInput,
  type AssignDriverInput,
  type UpdateDeliveryStatusInput,
  type AddOrderPaymentInput,
  type UpdateOrderPaymentInput,
  type OrdersQueryInput,
} from '../modules/orders/orders.schema.js';
