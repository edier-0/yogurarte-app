import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { useCrmStore } from './crm.store';

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

export interface OrdersMetricsData {
  totalOrdersCount: number;
  totalSalesAmount: number;
  totalPaidAmount: number;
  totalPendingDebt: number;
  countEncargos: number;
  countWithDebt: number;
  countAlDia: number;
  countDeliveriesPreparing: number;
  countDeliveriesInRoute: number;
  countDeliveriesDelivered: number;
}

export const useOperationsStore = defineStore('operations', () => {
  // Estado base
  const orders = ref<Order[]>([]);
  const ordersMetrics = ref<OrdersMetricsData | null>(null);
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

  // Métricas reactivas de Pedidos (consumen nativamente /api/orders/metrics)
  const totalOrdersCount = computed(() => {
    if (ordersMetrics.value && typeof ordersMetrics.value.totalOrdersCount === 'number') {
      return ordersMetrics.value.totalOrdersCount;
    }
    return orders.value.length;
  });

  const totalPendingDebt = computed(() => {
    if (ordersMetrics.value && typeof ordersMetrics.value.totalPendingDebt === 'number') {
      return ordersMetrics.value.totalPendingDebt;
    }
    return orders.value.reduce((acc, curr) => acc + getPendingBalance(curr), 0);
  });

  const countWithDebt = computed(() => {
    if (ordersMetrics.value && typeof ordersMetrics.value.countWithDebt === 'number') {
      return ordersMetrics.value.countWithDebt;
    }
    return orders.value.filter((o) => getPendingBalance(o) > 0).length;
  });

  const countAlDia = computed(() => {
    if (ordersMetrics.value && typeof ordersMetrics.value.countAlDia === 'number') {
      return ordersMetrics.value.countAlDia;
    }
    return orders.value.filter((o) => getPendingBalance(o) <= 0).length;
  });

  const countEncargos = computed(() => {
    if (ordersMetrics.value && typeof ordersMetrics.value.countEncargos === 'number') {
      return ordersMetrics.value.countEncargos;
    }
    return orders.value.filter(
      (o) =>
        o.deliveryStatus === 'PENDING' ||
        o.deliveryStatus === 'PREPARING' ||
        o.deliveryStatus === 'READY_FOR_DISPATCH' ||
        o.deliveryStatus === 'IN_ROUTE'
    ).length;
  });

  // Métricas de Domicilios de Hoy
  const countDeliveriesPreparing = computed(() => {
    if (ordersMetrics.value && typeof ordersMetrics.value.countDeliveriesPreparing === 'number') {
      return ordersMetrics.value.countDeliveriesPreparing;
    }
    return orders.value.filter(
      (o) =>
        o.deliveryStatus === 'PENDING' ||
        o.deliveryStatus === 'PREPARING' ||
        o.deliveryStatus === 'READY_FOR_DISPATCH'
    ).length;
  });

  const countDeliveriesInRoute = computed(() => {
    if (ordersMetrics.value && typeof ordersMetrics.value.countDeliveriesInRoute === 'number') {
      return ordersMetrics.value.countDeliveriesInRoute;
    }
    return orders.value.filter((o) => o.deliveryStatus === 'IN_ROUTE').length;
  });

  const countDeliveriesDelivered = computed(() => {
    if (ordersMetrics.value && typeof ordersMetrics.value.countDeliveriesDelivered === 'number') {
      return ordersMetrics.value.countDeliveriesDelivered;
    }
    return orders.value.filter((o) => o.deliveryStatus === 'DELIVERED').length;
  });

  // ==========================================
  // PAGINACIÓN REACTIVA (ESTRICTA A 9 REGISTROS)
  // ==========================================
  const ordersPage = ref<number>(1);
  const ordersLimit = ref<number>(9);

  const deliveriesPage = ref<number>(1);
  const deliveriesLimit = ref<number>(9);

  // Slices paginados
  const paginatedOrders = computed(() => {
    const start = (ordersPage.value - 1) * ordersLimit.value;
    return filteredOrders.value.slice(start, start + ordersLimit.value);
  });

  const ordersTotalCount = computed(() => filteredOrders.value.length);
  const ordersTotalPages = computed(() => Math.max(1, Math.ceil(filteredOrders.value.length / ordersLimit.value)));

  const paginatedDeliveries = computed(() => {
    const start = (deliveriesPage.value - 1) * deliveriesLimit.value;
    return filteredDeliveries.value.slice(start, start + deliveriesLimit.value);
  });

  const deliveriesTotalCount = computed(() => filteredDeliveries.value.length);
  const deliveriesTotalPages = computed(() => Math.max(1, Math.ceil(filteredDeliveries.value.length / deliveriesLimit.value)));

  function goToOrdersPage(page: number) {
    if (page < 1) {
      ordersPage.value = 1;
    } else if (page > ordersTotalPages.value) {
      ordersPage.value = ordersTotalPages.value;
    } else {
      ordersPage.value = page;
    }
  }

  function goToDeliveriesPage(page: number) {
    if (page < 1) {
      deliveriesPage.value = 1;
    } else if (page > deliveriesTotalPages.value) {
      deliveriesPage.value = deliveriesTotalPages.value;
    } else {
      deliveriesPage.value = page;
    }
  }

  // Sincronización y reset de paginación al cambiar filtros
  watch([filterChip, debouncedSearchQuery], () => {
    ordersPage.value = 1;
  });

  watch([deliveryChip, deliveryDriverFilter, debouncedDeliverySearchQuery], () => {
    deliveriesPage.value = 1;
  });

  // ==========================================
  // ACCIONES HTTP ASÍNCRONAS
  // ==========================================
  // ==========================================

  async function fetchOrders(params?: Record<string, any>) {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await http.get<any>('/orders', {
        params: params || { paginate: 'false' },
      });

      if (Array.isArray(data)) {
        orders.value = data;
      } else if (data && Array.isArray(data.data)) {
        orders.value = data.data;
      } else if (data && Array.isArray(data.items)) {
        orders.value = data.items;
      } else {
        orders.value = [];
      }

      // Cargar métricas agregadas nativas de base de datos
      fetchOrdersMetrics(params);
    } catch (err: any) {
      error.value = err?.message || 'Error al cargar pedidos';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchOrdersMetrics(params?: Record<string, any>) {
    try {
      const data = await http.get<OrdersMetricsData>('/orders/metrics', { params });
      if (data) {
        ordersMetrics.value = data;
      }
    } catch (err) {
      console.error('Error al cargar métricas de pedidos:', err);
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
    fetchOrdersMetrics();
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
    fetchOrdersMetrics();
    return updated;
  }

  async function deleteOrder(id: number): Promise<boolean> {
    try {
      const res = await http.delete<{ message: string; id: number }>(`/orders/${id}`);
      orders.value = orders.value.filter((o) => o.id !== id);
      toast.success('Pedido Eliminado', {
        description: res?.message || 'El pedido ha sido eliminado del sistema y se liberaron sus botellas.',
      });
      fetchOrdersMetrics();
      return true;
    } catch (err: any) {
      toast.error('Error al Eliminar Pedido', {
        description: err?.message || 'No se pudo eliminar el pedido.',
      });
      return false;
    }
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
    fetchOrdersMetrics();
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
    fetchOrdersMetrics();
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
        customerId?: number;
      }>(`/orders/${orderId}/whatsapp`);

      const crmStore = useCrmStore();
      crmStore.openMessagePreview({
        phone: res.phone,
        text: res.rawMessage,
        customerId: res.customerId,
        contactName: res.customerName,
        fallbackUrl: res.whatsappUrl,
        title: `Confirmar Despacho a ${res.customerName}`,
      });
    } catch {
      toast.error('No se pudo preparar el mensaje de WhatsApp');
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
    // Paginación Pedidos (9 por página)
    ordersPage,
    ordersLimit,
    ordersTotalCount,
    ordersTotalPages,
    paginatedOrders,
    goToOrdersPage,
    // Paginación Domicilios (9 por página)
    deliveriesPage,
    deliveriesLimit,
    deliveriesTotalCount,
    deliveriesTotalPages,
    paginatedDeliveries,
    goToDeliveriesPage,
    // Acciones
    fetchOrders,
    fetchOrdersMetrics,
    ordersMetrics,
    fetchDrivers,
    fetchCustomers,
    createOrder,
    updateOrder,
    deleteOrder,
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
