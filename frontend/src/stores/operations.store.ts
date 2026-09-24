import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { refDebounced } from '@vueuse/core';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';

export type DeliveryStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY_FOR_DISPATCH'
  | 'IN_ROUTE'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface OrderItem {
  id?: number;
  batchId?: number | null;
  bottleSize: string;
  flavor: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  litersPerUnit?: number;
  totalLiters?: number;
}

export interface OrderPayment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string | null;
}

export interface Customer {
  id: number;
  fullName: string;
  phone: string;
  address?: string | null;
  neighborhood?: string | null;
  loyaltyRedeemedCount?: number;
}

export interface Driver {
  id: number;
  fullName: string;
  phone?: string;
  type?: string;
  isActive?: boolean;
}

export interface Order {
  id: number;
  orderCode: string;
  orderNumber?: number;
  orderDate: string;
  deliveryDate?: string | null;
  deliveryType: 'PROPIO' | 'DOMICILIARIO' | 'LOCAL' | string;
  deliveryStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  paidAmount?: number;
  totalPaid?: number;
  pendingBalance?: number;
  pendingAmount?: number;
  deliveryFee: number;
  discount?: number;
  notes?: string | null;
  customer?: Customer;
  customerId?: number | null;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items?: OrderItem[];
  payments?: OrderPayment[];
  deliveryDriverId?: number | null;
  deliveryDriverName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type OrderFilterChip = 'ALL' | 'ENCARGOS' | 'CON_DEUDA' | 'AL_DIA';
export type DeliveryFilterChip = 'ALL' | 'PREPARING' | 'IN_ROUTE' | 'DELIVERED';

export const useOperationsStore = defineStore('operations', () => {
  // Estado base
  const orders = ref<Order[]>([]);
  const drivers = ref<Driver[]>([]);
  const customers = ref<Customer[]>([]);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // Filtros de Pedidos
  const filterChip = ref<OrderFilterChip>('ALL');
  const searchQuery = ref<string>('');

  // Filtros de Domicilios de Hoy
  const deliveryChip = ref<DeliveryFilterChip>('ALL');
  const deliveryDriverFilter = ref<string>('ALL'); // 'ALL' | 'UNASSIGNED' | driverId string
  const deliverySearchQuery = ref<string>('');

  // Búsqueda con debounce reactivo de 300ms
  const debouncedSearchQuery = refDebounced(searchQuery, 300);
  const debouncedDeliverySearchQuery = refDebounced(deliverySearchQuery, 300);

  // Helper para normalizar saldo pendiente
  const getPendingBalance = (o: Order): number => {
    if (typeof o.pendingBalance === 'number') return o.pendingBalance;
    if (typeof o.pendingAmount === 'number') return o.pendingAmount;
    const paid = o.totalPaid ?? o.paidAmount ?? 0;
    return Math.max(0, (o.totalAmount || 0) - paid);
  };

  // Pedidos filtrados para OrdersView
  const filteredOrders = computed(() => {
    let result = [...orders.value];

    // 1. Filtro por Chip
    if (filterChip.value === 'ENCARGOS') {
      result = result.filter(
        (o) =>
          o.deliveryStatus === 'PENDING' ||
          o.deliveryStatus === 'PREPARING' ||
          o.deliveryStatus === 'READY_FOR_DISPATCH' ||
          o.deliveryStatus === 'IN_ROUTE'
      );
    } else if (filterChip.value === 'CON_DEUDA') {
      result = result.filter((o) => getPendingBalance(o) > 0);
    } else if (filterChip.value === 'AL_DIA') {
      result = result.filter(
        (o) => getPendingBalance(o) <= 0 || o.paymentStatus === 'PAID'
      );
    }

    // 2. Filtro por búsqueda
    const query = debouncedSearchQuery.value.trim().toLowerCase();
    if (query) {
      result = result.filter((o) => {
        const code = (o.orderCode || '').toLowerCase();
        const clientName = (o.customer?.fullName || o.customerName || '').toLowerCase();
        const clientPhone = (o.customer?.phone || o.customerPhone || '').toLowerCase();
        const address = (o.customer?.address || o.customerAddress || '').toLowerCase();
        const notes = (o.notes || '').toLowerCase();
        return (
          code.includes(query) ||
          clientName.includes(query) ||
          clientPhone.includes(query) ||
          address.includes(query) ||
          notes.includes(query)
        );
      });
    }

    return result;
  });

  // Pedidos filtrados para DeliveryView (Domicilios de Hoy)
  const filteredDeliveries = computed(() => {
    let result = [...orders.value];

    // 1. Filtro por Repartidor
    if (deliveryDriverFilter.value !== 'ALL') {
      if (deliveryDriverFilter.value === 'UNASSIGNED') {
        result = result.filter(
          (o) => o.deliveryType === 'DOMICILIARIO' && !o.deliveryDriverId
        );
      } else {
        const dId = Number(deliveryDriverFilter.value);
        result = result.filter((o) => o.deliveryDriverId === dId);
      }
    }

    // 2. Filtro por Chip de Estado de Entrega
    if (deliveryChip.value === 'PREPARING') {
      result = result.filter(
        (o) =>
          o.deliveryStatus === 'PREPARING' ||
          o.deliveryStatus === 'READY_FOR_DISPATCH' ||
          o.deliveryStatus === 'PENDING'
      );
    } else if (deliveryChip.value === 'IN_ROUTE') {
      result = result.filter((o) => o.deliveryStatus === 'IN_ROUTE');
    } else if (deliveryChip.value === 'DELIVERED') {
      result = result.filter((o) => o.deliveryStatus === 'DELIVERED');
    }

    // 3. Filtro por búsqueda
    const query = debouncedDeliverySearchQuery.value.trim().toLowerCase();
    if (query) {
      result = result.filter((o) => {
        const code = (o.orderCode || '').toLowerCase();
        const clientName = (o.customer?.fullName || o.customerName || '').toLowerCase();
        const clientPhone = (o.customer?.phone || o.customerPhone || '').toLowerCase();
        const address = (o.customer?.address || o.customerAddress || '').toLowerCase();
        return (
          code.includes(query) ||
          clientName.includes(query) ||
          clientPhone.includes(query) ||
          address.includes(query)
        );
      });
    }

    return result;
  });

  // Métricas reactivas de Pedidos
  const totalOrdersCount = computed(() => orders.value.length);

  const totalPendingDebt = computed(() =>
    orders.value.reduce((acc, curr) => acc + getPendingBalance(curr), 0)
  );

  const countWithDebt = computed(
    () => orders.value.filter((o) => getPendingBalance(o) > 0).length
  );

  const countAlDia = computed(
    () => orders.value.filter((o) => getPendingBalance(o) <= 0).length
  );

  const countEncargos = computed(
    () =>
      orders.value.filter(
        (o) =>
          o.deliveryStatus === 'PENDING' ||
          o.deliveryStatus === 'PREPARING' ||
          o.deliveryStatus === 'READY_FOR_DISPATCH' ||
          o.deliveryStatus === 'IN_ROUTE'
      ).length
  );

  // Métricas de Domicilios de Hoy
  const countDeliveriesPreparing = computed(
    () =>
      orders.value.filter(
        (o) =>
          o.deliveryStatus === 'PENDING' ||
          o.deliveryStatus === 'PREPARING' ||
          o.deliveryStatus === 'READY_FOR_DISPATCH'
      ).length
  );

  const countDeliveriesInRoute = computed(
    () => orders.value.filter((o) => o.deliveryStatus === 'IN_ROUTE').length
  );

  const countDeliveriesDelivered = computed(
    () => orders.value.filter((o) => o.deliveryStatus === 'DELIVERED').length
  );

  // ==========================================
  // ACCIONES HTTP ASÍNCRONAS
  // ==========================================

  async function fetchOrders(params?: Record<string, any>) {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await http.get<Order[] | { items: Order[] }>('/orders', {
        params: params || { paginate: 'false' },
      });

      if (Array.isArray(data)) {
        orders.value = data;
      } else if (data && Array.isArray(data.items)) {
        orders.value = data.items;
      } else {
        orders.value = [];
      }
    } catch (err: any) {
      error.value = err?.message || 'Error al cargar pedidos';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchDrivers() {
    try {
      const data = await http.get<Driver[]>('/staff');
      if (Array.isArray(data)) {
        drivers.value = data.filter((d) => d.isActive !== false);
      }
    } catch {
      // Manejado por interceptor
    }
  }

  async function fetchCustomers() {
    try {
      const data = await http.get<Customer[] | { items: Customer[] }>('/customers', {
        params: { paginate: 'false' },
      });
      if (Array.isArray(data)) {
        customers.value = data;
      } else if (data && Array.isArray(data.items)) {
        customers.value = data.items;
      }
    } catch {
      // Manejado por interceptor
    }
  }

  async function createOrder(payload: any): Promise<Order> {
    const newOrder = await http.post<Order>('/orders', payload);
    orders.value.unshift(newOrder);
    toast.success('¡Pedido Registrado!', {
      description: `Pedido ${newOrder.orderCode || ''} creado exitosamente.`,
    });
    return newOrder;
  }

  async function updateOrder(id: number, payload: any): Promise<Order> {
    const updated = await http.put<Order>(`/orders/${id}`, payload);
    const index = orders.value.findIndex((o) => o.id === id);
    if (index !== -1) {
      orders.value[index] = { ...orders.value[index], ...updated };
    }
    toast.success('Pedido Actualizado', {
      description: `Los datos del pedido fueron guardados.`,
    });
    return updated;
  }

  async function updateDeliveryStatus(
    id: number,
    payload: {
      deliveryStatus: DeliveryStatus;
      paymentMethod?: string;
      paidAmount?: number;
      collectPayment?: boolean;
      notes?: string;
    }
  ) {
    const updated = await http.put<Order>(`/orders/${id}/delivery-status`, payload);
    const index = orders.value.findIndex((o) => o.id === id);
    if (index !== -1) {
      orders.value[index] = { ...orders.value[index], ...updated };
    }
    toast.success('Estado Actualizado', {
      description: `Nuevo estado de entrega: ${payload.deliveryStatus}`,
    });
    return updated;
  }

  async function addPayment(
    orderId: number,
    payload: {
      amount: number;
      paymentMethod?: string;
      paymentDate?: string;
      notes?: string;
    }
  ) {
    const updatedOrder = await http.post<Order>(`/orders/${orderId}/payments`, payload);
    const index = orders.value.findIndex((o) => o.id === orderId);
    if (index !== -1) {
      orders.value[index] = { ...orders.value[index], ...updatedOrder };
    }
    toast.success('Abono Registrado', {
      description: `Se registró el pago de $${payload.amount.toLocaleString('es-CO')}.`,
    });
    return updatedOrder;
  }

  async function assignDriver(
    orderId: number,
    payload: {
      deliveryType: string;
      deliveryDriverId: number;
      deliveryDriverName?: string;
    }
  ) {
    const updated = await http.put<Order>(`/orders/${orderId}/assign-driver`, payload);
    const index = orders.value.findIndex((o) => o.id === orderId);
    if (index !== -1) {
      orders.value[index] = { ...orders.value[index], ...updated };
    }
    toast.success('Repartidor Asignado', {
      description: `Pedido asignado a ${payload.deliveryDriverName || 'Repartidor'}.`,
    });
    return updated;
  }

  async function rescheduleOverdue() {
    try {
      const res = await http.post<{ message: string; updatedCount?: number }>(
        '/orders/reschedule-overdue'
      );
      toast.success('Reprogramación Completada', {
        description: res.message || 'Pedidos pendientes reprogramados para hoy.',
      });
      await fetchOrders();
    } catch {
      // Manejado por interceptor
    }
  }

  async function dispatchWhatsApp(orderId: number) {
    try {
      const res = await http.get<{
        whatsappUrl: string | null;
        rawMessage: string;
        phone: string;
        customerName: string;
      }>(`/orders/${orderId}/whatsapp`);

      const phone = (res.phone || '').trim();
      const isUsername = phone.startsWith('@') || /[a-zA-Z]/.test(phone);

      if (isUsername || !res.whatsappUrl) {
        // Enviar por CRM interno
        await http.post('/crm/messages', {
          recipient: phone,
          text: res.rawMessage,
        });
        toast.success(`Mensaje enviado vía CRM interno a ${phone}`);
      } else {
        // Abrir WhatsApp Web / App
        window.open(res.whatsappUrl, '_blank');
        toast.info('Abriendo WhatsApp...');
      }
    } catch {
      toast.error('No se pudo despachar el mensaje de WhatsApp');
    }
  }

  // Setters
  function setFilterChip(chip: OrderFilterChip) {
    filterChip.value = chip;
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query;
  }

  function setDeliveryChip(chip: DeliveryFilterChip) {
    deliveryChip.value = chip;
  }

  function setDeliveryDriverFilter(driverId: string) {
    deliveryDriverFilter.value = driverId;
  }

  function setDeliverySearchQuery(query: string) {
    deliverySearchQuery.value = query;
  }

  return {
    orders,
    drivers,
    customers,
    isLoading,
    error,
    filterChip,
    searchQuery,
    debouncedSearchQuery,
    filteredOrders,
    totalOrdersCount,
    totalPendingDebt,
    countWithDebt,
    countAlDia,
    countEncargos,
    // Domicilios
    deliveryChip,
    deliveryDriverFilter,
    deliverySearchQuery,
    debouncedDeliverySearchQuery,
    filteredDeliveries,
    countDeliveriesPreparing,
    countDeliveriesInRoute,
    countDeliveriesDelivered,
    getPendingBalance,
    // Acciones
    fetchOrders,
    fetchDrivers,
    fetchCustomers,
    createOrder,
    updateOrder,
    updateDeliveryStatus,
    addPayment,
    assignDriver,
    rescheduleOverdue,
    dispatchWhatsApp,
    setFilterChip,
    setSearchQuery,
    setDeliveryChip,
    setDeliveryDriverFilter,
    setDeliverySearchQuery,
  };
});
