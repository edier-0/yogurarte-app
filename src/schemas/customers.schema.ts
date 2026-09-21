/**
 * Re-exportación para compatibilidad durante la migración arquitectónica (ADR-001)
 */
export {
  createOrUpdateCustomerSchema,
  updateCustomerSchema,
  applyCustomerPaymentSchema,
  customersQuerySchema,
  resolveCustomerSchema,
  type CreateOrUpdateCustomerInput,
  type UpdateCustomerInput,
  type ApplyCustomerPaymentInput,
  type CustomersQueryInput,
  type ResolveCustomerInput,
} from '../modules/customers/customers.schema.js';
