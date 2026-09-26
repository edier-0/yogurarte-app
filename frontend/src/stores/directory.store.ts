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

export const useDirectoryStore = defineStore('directory', () => {
  const customers = ref<CustomerItem[]>([]);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // Filtros reactivos
  const activeChip = ref<CustomerChip>('ALL');
  const searchQuery = ref<string>('');
  const debouncedSearch = refDebounced(searchQuery, 300);

  // Conteos por chip
  const chipCounts = computed(() => {
    const all = customers.value.length;
    const debt = customers.value.filter(
      (c) => (c.deliveredPendingDebt > 0 || c.totalPendingAmount > 0)
    ).length;
    const orders = customers.value.filter(
      (c) => c.inProcessOrdersCount > 0
    ).length;
    const upToDate = customers.value.filter(
      (c) => (c.deliveredPendingDebt || 0) <= 0 && (c.totalPendingAmount || 0) <= 0
    ).length;

    return { all, debt, orders, upToDate };
  });

  // Métricas superiores computadas
  const totalDebtAmount = computed(() => {
    return customers.value.reduce((sum, c) => sum + (Number(c.deliveredPendingDebt) || 0), 0);
  });

  const totalInProcessDebt = computed(() => {
    return customers.value.reduce((sum, c) => sum + (Number(c.inProcessPendingAmount) || 0), 0);
  });

  // Clientes filtrados reactivamente
  const filteredCustomers = computed(() => {
    let list = customers.value;

    // 1. Filtrar por chip
    if (activeChip.value === 'DEBT') {
      list = list.filter((c) => (c.deliveredPendingDebt > 0 || c.totalPendingAmount > 0));
    } else if (activeChip.value === 'ORDERS') {
      list = list.filter((c) => c.inProcessOrdersCount > 0);
    } else if (activeChip.value === 'UP_TO_DATE') {
      list = list.filter((c) => (c.deliveredPendingDebt || 0) <= 0 && (c.totalPendingAmount || 0) <= 0);
    }

    // 2. Filtrar por buscador
    const q = debouncedSearch.value.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const name = (c.fullName || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const addr = (c.address || '').toLowerCase();
        const neigh = (c.neighborhood || '').toLowerCase();
        const notes = (c.notes || '').toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          addr.includes(q) ||
          neigh.includes(q) ||
          notes.includes(q)
        );
      });
    }

    return list;
  });

  // Paginación estricta a 12 registros por página
  const currentPage = ref<number>(1);
  const totalPages = ref<number>(1);
  const totalCustomers = ref<number>(0);
  const pageSize = ref<number>(12);

  // Cargar clientes desde /api/clients (paginado a 12)
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

      const res = await http.get<any>('/clients', { params });
      if (res) {
        if (Array.isArray(res.data)) {
          customers.value = res.data;
        } else if (Array.isArray(res.items)) {
          customers.value = res.items;
        } else if (Array.isArray(res)) {
          customers.value = res;
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

  // Búsqueda en vivo reactiva reinicia a página 1
  watch(debouncedSearch, () => {
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
