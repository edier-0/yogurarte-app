import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { useConfirm } from '@/composables/useConfirm';

export type CustomerChip = 'ALL' | 'DEBT' | 'ORDERS' | 'UP_TO_DATE';

export interface CustomerOrderSummary {
  id: number;
  orderNumber: string;
  batchId?: number | null;
  totalLiters: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
  deliveryStatus: string;
  orderDate: string;
  notes?: string | null;
  batch?: {
    id: number;
    batchCode: string;
    flavor: string;
  } | null;
}

export interface CustomerItem {
  id: number;
  fullName: string;
  phone: string;
  address?: string | null;
  neighborhood?: string | null;
  notes?: string | null;
  latestOrderNotes?: string | null;
  latestOrderNumber?: string | null;
  latestOrderDate?: string | null;
  isActive: boolean;
  totalOrders: number;
  totalLiters: number;
  totalSpent: number;
  deliveredPendingDebt: number;
  inProcessPendingAmount: number;
  inProcessOrdersCount: number;
  inProcessPaidCount: number;
  pendingDebt: number;
  totalPendingAmount: number;
  batches?: Array<{
    id: number;
    batchCode: string;
    flavor: string;
  }>;
  orders?: CustomerOrderSummary[];
  createdAt?: string;
}

export interface CustomerFormData {
  id?: number | null;
  fullName: string;
  phone: string;
  address?: string;
  neighborhood?: string;
  notes?: string;
}

export interface CustomerGlobalMetrics {
  totalCustomers: number;
  totalDeliveredDebt: number;
  totalInProcessPending: number;
  debtCount: number;
  ordersCount: number;
  upToDateCount: number;
}

export const useDirectoryStore = defineStore('directory', () => {
  const customers = ref<CustomerItem[]>([]);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // Filtros reactivos
  const activeChip = ref<CustomerChip>('ALL');
  const searchQuery = ref<string>('');
  const debouncedSearch = refDebounced(searchQuery, 300);

  // Métricas globales reales recibidas del backend
  const globalMetrics = ref<CustomerGlobalMetrics>({
    totalCustomers: 0,
    totalDeliveredDebt: 0,
    totalInProcessPending: 0,
    debtCount: 0,
    ordersCount: 0,
    upToDateCount: 0,
  });

  // Conteos globales por chip
  const chipCounts = computed(() => {
    return {
      all: globalMetrics.value.totalCustomers || customers.value.length,
      debt: globalMetrics.value.debtCount,
      orders: globalMetrics.value.ordersCount,
      upToDate: globalMetrics.value.upToDateCount,
    };
  });

  // Métricas superiores computadas globales
  const totalDebtAmount = computed(() => {
    return globalMetrics.value.totalDeliveredDebt;
  });

  const totalInProcessDebt = computed(() => {
    return globalMetrics.value.totalInProcessPending;
  });

  // Clientes filtrados reactivamente
  const filteredCustomers = computed(() => {
    return customers.value;
  });

  // Paginación estricta a 12 registros por página
  const currentPage = ref<number>(1);
  const totalPages = ref<number>(1);
  const totalCustomers = ref<number>(0);
  const pageSize = ref<number>(12);

  // Cargar clientes desde /api/clients (paginado a 12 con soporte de métricas globales)
  async function fetchCustomers(page = 1) {
    isLoading.value = true;
    error.value = null;
    try {
      const params: any = {
        page,
        limit: 12,
        paginate: 'true',
      };
      if (debouncedSearch.value && debouncedSearch.value.trim() !== '') {
        params.search = debouncedSearch.value.trim();
      }
      if (activeChip.value && activeChip.value !== 'ALL') {
        params.chip = activeChip.value;
      }

      const res = await http.get<any>('/clients', { params });
      if (res) {
        if (Array.isArray(res.data)) {
          customers.value = res.data;
        } else if (Array.isArray(res.items)) {
          customers.value = res.items;
        } else if (Array.isArray(res)) {
          customers.value = res;
        }

        if (res.metrics) {
          globalMetrics.value = {
            totalCustomers: Number(res.metrics.totalCustomers) || 0,
            totalDeliveredDebt: Number(res.metrics.totalDeliveredDebt) || 0,
            totalInProcessPending: Number(res.metrics.totalInProcessPending) || 0,
            debtCount: Number(res.metrics.debtCount) || 0,
            ordersCount: Number(res.metrics.ordersCount) || 0,
            upToDateCount: Number(res.metrics.upToDateCount) || 0,
          };
        }

        if (res.pagination) {
          currentPage.value = res.pagination.page || res.pagination.currentPage || page;
          totalPages.value = res.pagination.totalPages || 1;
          totalCustomers.value = res.pagination.total || res.pagination.totalItems || 0;
        } else {
          currentPage.value = 1;
          totalPages.value = 1;
          totalCustomers.value = customers.value.length;
        }
      }
    } catch (err: any) {
      error.value = err?.message || 'Error al cargar directorio de clientes';
    } finally {
      isLoading.value = false;
    }
  }

  // Búsqueda en vivo reactiva y cambio de chip reinician a página 1
  watch([debouncedSearch, activeChip], () => {
    currentPage.value = 1;
    fetchCustomers(1);
  });

  // Crear o actualizar cliente
  async function saveCustomer(payload: CustomerFormData) {
    isLoading.value = true;
    try {
      if (payload.id) {
        const res = await http.put<CustomerItem>(`/customers/${payload.id}`, {
          fullName: payload.fullName.trim(),
          phone: payload.phone.trim(),
          address: payload.address?.trim() || '',
          neighborhood: payload.neighborhood?.trim() || null,
          notes: payload.notes?.trim() || null,
        });
        toast.success('Cliente Actualizado', {
          description: `Se guardaron los datos de ${res.fullName || payload.fullName}.`,
        });
        await fetchCustomers();
        return res;
      } else {
        const res = await http.post<CustomerItem>('/customers', {
          fullName: payload.fullName.trim(),
          phone: payload.phone.trim(),
          address: payload.address?.trim() || 'Fonseca',
          neighborhood: payload.neighborhood?.trim() || null,
          notes: payload.notes?.trim() || null,
        });
        toast.success('¡Cliente Registrado!', {
          description: `${res.fullName || payload.fullName} ha sido añadido al directorio.`,
        });
        await fetchCustomers();
        return res;
      }
    } finally {
      isLoading.value = false;
    }
  }

  // Desactivar / Eliminar cliente (soft delete)
  async function deleteCustomer(id: number) {
    const { confirm } = useConfirm();
    const ok = await confirm({
      title: 'Desactivar Cliente',
      message: '¿Seguro que deseas desactivar este cliente del directorio? Sus pedidos y registros históricos se conservarán.',
      confirmText: 'Desactivar Cliente',
      cancelText: 'Cancelar',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await http.delete(`/customers/${id}`);
      toast.success('Cliente Desactivado', {
        description: 'El cliente ha sido retirado de la vista activa.',
      });
      await fetchCustomers();
    } catch {
      // Manejado por interceptor
    }
  }

  return {
    customers,
    isLoading,
    error,
    activeChip,
    searchQuery,
    debouncedSearch,
    chipCounts,
    totalDebtAmount,
    totalInProcessDebt,
    filteredCustomers,
    currentPage,
    totalPages,
    totalCustomers,
    pageSize,
    fetchCustomers,
    saveCustomer,
    deleteCustomer,
  };
});
