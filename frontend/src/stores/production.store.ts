import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { refDebounced } from '@vueuse/core';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';
import { useConfirm } from '@/composables/useConfirm';
import { getTodayDateBogota } from './finance.store';

export type BatchChip = 'ALL' | 'ACTIVE' | 'DEPLETED' | 'ARCHIVED';

export interface BatchPackagingItem {
  id: number;
  batchId: number;
  flavor: string;
  bottles1L: number;
  bottles2L: number;
  totalLiters: number;
  fruitRawMaterialId?: number | null;
  fruitQuantityUsed?: number;
  fruitUnitCost?: number;
  packagingCost: number;
  notes?: string | null;
  packagedBy?: string;
  packagedAt: string;
  createdAt: string;
}

export interface BatchPackagingPayload {
  flavor: string;
  bottles1L: number;
  bottles2L: number;
  fruitRawMaterialId?: number | null;
  fruitQuantityUsed?: number;
  notes?: string | null;
  packagedBy?: string;
  packagedAt?: string;
  linkOrderIds?: number[];
}

export interface PartnerWithdrawalPayload {
  bottleSize?: string;
  quantityBottles: number;
  staffMemberId: number;
  notes?: string | null;
  registeredBy?: string;
  dischargeDate?: string;
}

export interface BatchSummaryData {
  batch: {
    id: number;
    batchCode: string;
    flavor: string;
    status: string;
    isActive: boolean;
    preparationDate: string;
    expirationDate?: string | null;
    notes?: string | null;
    registeredBy?: string;
    cultureType?: string | null;
  };
  rawMaterialsBalance: {
    milkUsedLiters: number;
    totalLitersProduced: number;
    packagedLiters: number;
    unpackagedLiters: number;
    yieldPercentage: number;
    totalCost: number;
    costPerLiter: number;
  };
  bottlesBreakdown: {
    total1L: number;
    total2L: number;
    sold1L: number;
    sold2L: number;
    discharged1L: number;
    discharged2L: number;
    free1L: number;
    free2L: number;
  };
  volumeBalance: {
    totalProduced: number;
    totalSold: number;
    totalDischarged: number;
    partnerConsumed: number;
    remainingAvailable: number;
  };
  packagings: BatchPackagingItem[];
  linkedOrders: Array<{
    id: number;
    orderNumber: string;
    customer: { id: number; fullName: string; phone?: string | null };
    totalAmount: number;
    totalLiters: number;
    quantityBottles: number;
    deliveryStatus: string;
    paymentStatus: string;
    orderDate: string;
    items: any[];
  }>;
  discharges: any[];
  itemsUsed: any[];
}

export interface BatchItem {
  id: number;
  batchCode: string;
  flavor: string;
  milkUsedLiters: number;
  totalLitersProduced: number;
  packagedLiters?: number;
  unpackagedLiters?: number;
  bottles1LProduced: number;
  bottles2LProduced: number;
  yieldPercentage: number;
  costPerLiter?: number;
  cultureType?: string | null;
  initialSugarGrams?: number;
  powderedMilkGrams?: number;
  preparationDate: string;
  expirationDate?: string | null;
  status: 'EN_FERMENTACION' | 'DISPONIBLE' | 'AGOTADO' | 'ARCHIVADO' | 'COMPLETADO' | string;
  isActive: boolean;
  notes?: string | null;
  registeredBy?: string;
  totalSoldLiters: number;
  totalDischargedLiters: number;
  remainingAvailableLiters: number;
  packagings?: BatchPackagingItem[];
  discharges?: Array<{
    id: number;
    bottleSize: string;
    quantityBottles: number;
    totalLiters: number;
    reasonType: string;
    notes?: string | null;
  }>;
}

export interface ProductFlavor {
  id: number;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBatchPayload {
  milkUsedLiters: number;
  totalLitersProduced?: number;
  flavor: string;
  cultureType?: string;
  initialSugarGrams?: number;
  powderedMilkGrams?: number;
  preparationDate?: string;
  expirationDate?: string;
  notes?: string | null;
  registeredBy?: string;
  status?: string;
}

export const useProductionStore = defineStore('production', () => {
  const batches = ref<BatchItem[]>([]);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // Paginación reactiva estricta a 5 lotes
  const currentPage = ref<number>(1);
  const limit = ref<number>(5);
  const totalBatches = ref<number>(0);
  const totalPages = ref<number>(1);

  // Catálogo de Sabores Dinámico
  const flavors = ref<ProductFlavor[]>([]);
  const isLoadingFlavors = ref<boolean>(false);
  const activeFlavors = computed(() => flavors.value.filter((f) => f.isActive));

  // Filtros
  const activeChip = ref<BatchChip>('ALL');
  const searchQuery = ref<string>('');
  const debouncedSearch = refDebounced(searchQuery, 300);

  // Métricas superiores computadas
  const fermentingLiters = computed(() => {
    return batches.value
      .filter((b) => b.isActive !== false && b.status === 'EN_FERMENTACION')
      .reduce((sum, b) => sum + (Number(b.milkUsedLiters) || 0), 0);
  });

  const finishedYogurtLiters = computed(() => {
    return batches.value
      .filter((b) => b.isActive !== false && b.status !== 'EN_FERMENTACION' && b.status !== 'ARCHIVADO')
      .reduce((sum, b) => sum + (Number(b.remainingAvailableLiters) || 0), 0);
  });

  const averageYield = computed(() => {
    const list = batches.value.filter((b) => Number(b.milkUsedLiters) > 0 && Number(b.totalLitersProduced) > 0);
    if (list.length === 0) return 96.5;
    const sum = list.reduce((acc, b) => {
      const y = b.yieldPercentage || (b.totalLitersProduced / b.milkUsedLiters) * 100;
      return acc + y;
    }, 0);
    return Math.round((sum / list.length) * 10) / 10;
  });

  // Conteos por chip
  const chipCounts = computed(() => {
    const all = totalBatches.value || batches.value.length;
    const active = batches.value.filter(
      (b) => b.isActive !== false && (b.status === 'DISPONIBLE' || b.status === 'COMPLETADO' || b.status === 'EN_FERMENTACION')
    ).length;
    const depleted = batches.value.filter(
      (b) => b.isActive !== false && (b.status === 'AGOTADO' || (b.remainingAvailableLiters <= 0 && b.status !== 'EN_FERMENTACION'))
    ).length;
    const archived = batches.value.filter((b) => b.isActive === false || b.status === 'ARCHIVADO').length;

    return { all, active, depleted, archived };
  });

  // Lotes filtrados reactivamente
  const filteredBatches = computed(() => {
    let result = batches.value;

    // 1. Filtro por chip
    if (activeChip.value === 'ACTIVE') {
      result = result.filter(
        (b) => b.isActive !== false && (b.status === 'DISPONIBLE' || b.status === 'COMPLETADO' || b.status === 'EN_FERMENTACION') && (b.remainingAvailableLiters > 0 || b.status === 'EN_FERMENTACION')
      );
    } else if (activeChip.value === 'DEPLETED') {
      result = result.filter(
        (b) => b.isActive !== false && (b.status === 'AGOTADO' || (b.remainingAvailableLiters <= 0 && b.status !== 'EN_FERMENTACION'))
      );
    } else if (activeChip.value === 'ARCHIVED') {
      result = result.filter((b) => b.isActive === false || b.status === 'ARCHIVADO');
    }

    // 2. Filtro por buscador (código LOT-..., sabor, notas)
    const q = debouncedSearch.value.trim().toLowerCase();
    if (q) {
      result = result.filter((b) => {
        const code = (b.batchCode || '').toLowerCase();
        const flavor = (b.flavor || '').toLowerCase();
        const notes = (b.notes || '').toLowerCase();
        const reg = (b.registeredBy || '').toLowerCase();
        return code.includes(q) || flavor.includes(q) || notes.includes(q) || reg.includes(q);
      });
    }

    return result;
  });

  // Cargar lotes desde /api/batches con soporte para paginación
  async function fetchBatches(page = 1, statusFilter?: string) {
    isLoading.value = true;
    error.value = null;
    try {
      let resolvedStatus = statusFilter;
      if (!resolvedStatus && activeChip.value !== 'ALL') {
        resolvedStatus = activeChip.value;
      }

      const res = await http.get<any>('/batches', {
        params: {
          page,
          limit: limit.value,
          includeInactive: 'true',
          status: resolvedStatus && resolvedStatus !== 'ALL' ? resolvedStatus : undefined,
        },
      });

      if (res && res.data && res.pagination) {
        batches.value = res.data;
        currentPage.value = res.pagination.page;
        limit.value = res.pagination.limit;
        totalBatches.value = res.pagination.total;
        totalPages.value = res.pagination.totalPages;
      } else if (Array.isArray(res)) {
        batches.value = res;
        totalBatches.value = res.length;
        totalPages.value = Math.ceil(res.length / limit.value) || 1;
      }
    } catch (err: any) {
      error.value = err?.message || 'Error al cargar lotes de producción';
    } finally {
      isLoading.value = false;
    }
  }

  // Navegación de páginas
  async function goToPage(page: number) {
    if (page < 1 || page > totalPages.value || page === currentPage.value) return;
    await fetchBatches(page);
  }

  // Crear lote de producción (Fase A)
  async function createBatch(payload: CreateBatchPayload) {
    isLoading.value = true;
    try {
      const res = await http.post<BatchItem>('/batches', {
        ...payload,
        preparationDate: payload.preparationDate || getTodayDateBogota(),
      });
      toast.success('¡Lote Creado con Éxito!', {
        description: `Lote ${res.batchCode || ''} registrado para ${res.flavor}.`,
      });
      await fetchBatches(1);
      return res;
    } finally {
      isLoading.value = false;
    }
  }

  // Registrar fraccionamiento y envasado (Fase B)
  async function packageBatch(batchId: number, payload: BatchPackagingPayload) {
    isLoading.value = true;
    try {
      const res = await http.post<{ message: string; packaging: BatchPackagingItem; batch: BatchItem }>(
        `/batches/${batchId}/packaging`,
        payload
      );
      toast.success('¡Envasado Registrado!', {
        description: res.message || 'Fracción de lote envasada con éxito.',
      });
      await fetchBatches(currentPage.value);
      return res;
    } finally {
      isLoading.value = false;
    }
  }

  // Desvincular pedido de un lote
  async function unlinkOrder(batchId: number, orderId: number) {
    try {
      const res = await http.delete<{ message: string }>(`/batches/${batchId}/orders/${orderId}`);
      toast.success('Pedido Desvinculado', {
        description: res.message || 'El pedido regresó a pre-venta y se reintegró el saldo al lote.',
      });
      await fetchBatches(currentPage.value);
      return true;
    } catch {
      return false;
    }
  }

  // Registrar retiro de socio
  async function registerPartnerWithdrawal(batchId: number, payload: PartnerWithdrawalPayload) {
    try {
      const res = await http.post<any>(`/batches/${batchId}/partner-withdrawal`, payload);
      toast.success('Retiro Registrado', {
        description: res.message || 'Consumo de socio registrado y descontado del lote.',
      });
      await fetchBatches(currentPage.value);
      return res;
    } catch {
      return null;
    }
  }

  // Obtener resumen y auditoría detallada
  async function fetchBatchSummary(batchId: number): Promise<BatchSummaryData | null> {
    try {
      return await http.get<BatchSummaryData>(`/batches/${batchId}/summary`);
    } catch {
      return null;
    }
  }

  // Consultar pedidos en pre-venta pendientes por sabor
  async function fetchPendingOrders(flavor?: string) {
    try {
      const res = await http.get<{
        count: number;
        totalLiters: number;
        totalAmount: number;
        orders: any[];
      }>('/batches/pending-orders', {
        params: flavor && flavor !== 'ALL' ? { flavor } : undefined,
      });
      return res;
    } catch {
      return { count: 0, totalLiters: 0, totalAmount: 0, orders: [] };
    }
  }

  // Finalizar fermentación
  async function finishFermentation(id: number, producedLiters?: number) {
    try {
      const batch = batches.value.find((b) => b.id === id);
      const liters = producedLiters || batch?.milkUsedLiters || 0;
      await http.put(`/batches/${id}`, {
        status: 'DISPONIBLE',
        totalLitersProduced: liters,
      });
      toast.success('Fermentación Finalizada', {
        description: `El lote pasó a estado DISPONIBLE con ${liters}L listos para venta.`,
      });
      await fetchBatches();
    } catch {
      // Manejado por interceptor
    }
  }

  // Ajustar litros restantes / descarga de merma
  async function adjustBatchLiters(id: number, newProducedLiters: number) {
    try {
      await http.put(`/batches/${id}`, {
        totalLitersProduced: newProducedLiters,
      });
      toast.success('Volumen Ajustado', {
        description: `Se actualizaron los litros totales del lote a ${newProducedLiters}L.`,
      });
      await fetchBatches();
    } catch {
      // Manejado por interceptor
    }
  }

  // Archivar lote
  async function archiveBatch(id: number) {
    const { confirm } = useConfirm();
    const ok = await confirm({
      title: 'Archivar Lote de Producción',
      message: '¿Deseas archivar este lote de producción? El lote será trasladado al histórico y dejará de estar visible en el flujo operativo activo.',
      confirmText: 'Archivar Lote',
      cancelText: 'Cancelar',
      variant: 'warning',
    });
    if (!ok) return;

    try {
      await http.put(`/batches/${id}/deactivate`, {
        reason: 'Archivado manual desde panel de lotes',
        restoreStock: false,
        unlinkOrders: false,
      });
      toast.success('Lote Archivado', {
        description: 'El lote ha sido trasladado al histórico de producción.',
      });
      await fetchBatches();
    } catch {
      // Manejado por interceptor
    }
  }

  // Catálogo de Sabores Dinámico
  async function fetchFlavors(activeOnly = false) {
    isLoadingFlavors.value = true;
    try {
      const data = await http.get<ProductFlavor[]>('/production/flavors', {
        params: activeOnly ? { activeOnly: true } : undefined,
      });
      flavors.value = data;
      return data;
    } catch {
      // Manejado por interceptor
      return [];
    } finally {
      isLoadingFlavors.value = false;
    }
  }

  async function createFlavor(name: string) {
    try {
      const newFlavor = await http.post<ProductFlavor>('/production/flavors', { name });
      toast.success('Sabor Registrado', {
        description: `El sabor "${newFlavor.name}" ha sido agregado al catálogo.`,
      });
      await fetchFlavors();
      return newFlavor;
    } catch {
      // Manejado por interceptor
      return null;
    }
  }

  async function toggleFlavor(id: number) {
    try {
      const updated = await http.patch<ProductFlavor>(`/production/flavors/${id}/toggle`);
      const statusText = updated.isActive ? 'activado' : 'pausado';
      toast.success('Estado Actualizado', {
        description: `El sabor "${updated.name}" ahora está ${statusText}.`,
      });
      await fetchFlavors();
      return updated;
    } catch {
      // Manejado por interceptor
      return null;
    }
  }

  async function deleteFlavor(id: number) {
    try {
      const res = await http.delete<{ message: string; deactivated?: boolean }>(`/production/flavors/${id}`);
      if (res?.deactivated) {
        toast.info('Sabor Desactivado', {
          description: 'El sabor tiene historial de producción o pedidos, por lo que fue pausado en lugar de eliminarse.',
        });
      } else {
        toast.success('Sabor Eliminado', {
          description: 'El sabor ha sido eliminado del catálogo.',
        });
      }
      await fetchFlavors();
      return true;
    } catch {
      // Manejado por interceptor
      return false;
    }
  }

  return {
    batches,
    isLoading,
    error,
    // Paginación
    currentPage,
    limit,
    totalBatches,
    totalPages,
    goToPage,
    // Filtros
    activeChip,
    searchQuery,
    debouncedSearch,
    fermentingLiters,
    finishedYogurtLiters,
    averageYield,
    chipCounts,
    filteredBatches,
    // Acciones Lotes
    fetchBatches,
    createBatch,
    packageBatch,
    unlinkOrder,
    registerPartnerWithdrawal,
    fetchBatchSummary,
    fetchPendingOrders,
    finishFermentation,
    adjustBatchLiters,
    archiveBatch,
    // Catálogo de Sabores
    flavors,
    isLoadingFlavors,
    activeFlavors,
    fetchFlavors,
    createFlavor,
    toggleFlavor,
    deleteFlavor,
  };
});

