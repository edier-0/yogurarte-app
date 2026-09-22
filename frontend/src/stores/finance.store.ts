import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { refDebounced } from '@vueuse/core';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';

export const COLOMBIA_TIMEZONE = 'America/Bogota';

/**
 * Obtiene la fecha local de Colombia en formato YYYY-MM-DD
 */
export function getTodayDateBogota(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export type PeriodFilter = 'today' | 'this_week' | 'this_month' | 'custom_range' | 'all';
export type MovementTab = 'ALL' | 'SALES' | 'EXPENSES' | 'BASE' | 'TRANSFERS';

export interface FinanceKpis {
  cashBalance: number;
  cashInHand: number;
  digitalBank: number;
  totalInflowCash: number;
  totalInflowBank: number;
  totalOutflowCash: number;
  totalOutflowBank: number;
  totalInjections: number;
  totalWithdrawals: number;
  totalCashCollected: number;
  totalSalesAmount: number;
  totalExpenses: number;
  totalRawMaterialPurchases: number;
  totalGeneralExpenses: number;
  totalPayrollExpenses: number;
  totalOwnerDraws: number;
  deliveredPendingToCollect: number;
}

export interface UnifiedMovement {
  id: string | number;
  rawId?: number;
  date: string;
  createdAt?: string;
  flowType: 'INFLOW' | 'OUTFLOW' | 'TRANSFER';
  tabCategory: 'SALES' | 'EXPENSES' | 'BASE' | 'TRANSFERS';
  concept: string;
  description: string;
  amount: number;
  displayAmount: number;
  paymentMethod: string;
  categoryLabel?: string;
  notes?: string | null;
  registeredBy?: string;
  isCashMovement?: boolean;
}

export interface TransferPayload {
  type?: 'TRASLADO_EFECTIVO_A_BANCO' | 'TRASLADO_BANCO_A_EFECTIVO';
  from?: 'EFECTIVO' | 'BANCO' | string;
  to?: 'EFECTIVO' | 'BANCO' | string;
  amount: number;
  concept: string;
  movementDate?: string;
  notes?: string | null;
}

export interface CashMovementPayload {
  type:
    | 'BASE_INICIAL'
    | 'APORTE_SOCIO'
    | 'RETIRO_BASE'
    | 'AJUSTE_CAJA'
    | 'AJUSTE_SOBRANTE'
    | 'AJUSTE_FALTANTE'
    | 'TRASLADO_EFECTIVO_A_BANCO'
    | 'TRASLADO_BANCO_A_EFECTIVO';
  amount: number;
  concept: string;
  paymentMethod?: string;
  movementDate?: string;
  notes?: string | null;
  registeredBy?: string;
}

export const useFinanceStore = defineStore('finance', () => {
  // Estado de KPIs y Resumen
  const kpis = ref<FinanceKpis>({
    cashBalance: 0,
    cashInHand: 0,
    digitalBank: 0,
    totalInflowCash: 0,
    totalInflowBank: 0,
    totalOutflowCash: 0,
    totalOutflowBank: 0,
    totalInjections: 0,
    totalWithdrawals: 0,
    totalCashCollected: 0,
    totalSalesAmount: 0,
    totalExpenses: 0,
    totalRawMaterialPurchases: 0,
    totalGeneralExpenses: 0,
    totalPayrollExpenses: 0,
    totalOwnerDraws: 0,
    deliveredPendingToCollect: 0,
  });

  const movements = ref<UnifiedMovement[]>([]);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // Filtros de navegación
  const period = ref<PeriodFilter>('today');
  const startDate = ref<string>('');
  const endDate = ref<string>('');
  const activeTab = ref<MovementTab>('ALL');
  const searchQuery = ref<string>('');

  const debouncedSearchQuery = refDebounced(searchQuery, 300);

  // Getters computados
  const cashInHand = computed(() => kpis.value.cashInHand || 0);
  const cashInBanks = computed(() => kpis.value.digitalBank || 0);
  const totalRealBalance = computed(() => kpis.value.cashBalance || 0);

  // Conteos por Tab del Libro Diario
  const tabCounts = computed(() => {
    const list = movements.value;
    return {
      all: list.length,
      sales: list.filter((m) => m.tabCategory === 'SALES').length,
      expenses: list.filter((m) => m.tabCategory === 'EXPENSES').length,
      base: list.filter((m) => m.tabCategory === 'BASE').length,
      transfers: list.filter((m) => m.tabCategory === 'TRANSFERS').length,
    };
  });

  // Movimientos filtrados por pestaña y búsqueda reactiva
  const filteredMovements = computed(() => {
    let result = movements.value;

    // 1. Filtro por Pestaña
    if (activeTab.value !== 'ALL') {
      result = result.filter((m) => m.tabCategory === activeTab.value);
    }

    // 2. Filtro por Búsqueda (debounce 300ms)
    const q = debouncedSearchQuery.value.trim().toLowerCase();
    if (q) {
      result = result.filter((m) => {
        const concept = (m.concept || '').toLowerCase();
        const desc = (m.description || '').toLowerCase();
        const notes = (m.notes || '').toLowerCase();
        const method = (m.paymentMethod || '').toLowerCase();
        const cat = (m.categoryLabel || '').toLowerCase();
        const reg = (m.registeredBy || '').toLowerCase();
        return (
          concept.includes(q) ||
          desc.includes(q) ||
          notes.includes(q) ||
          method.includes(q) ||
          cat.includes(q) ||
          reg.includes(q)
        );
      });
    }

    return result;
  });

  // Cargar datos financieros completos (KPIs + Conciliación de Movimientos)
  async function fetchFinanceData() {
    isLoading.value = true;
    error.value = null;

    try {
      const params: Record<string, string> = {};

      if (period.value === 'today') {
        params.period = 'today';
      } else if (period.value === 'this_week') {
        params.period = 'week';
      } else if (period.value === 'this_month') {
        params.period = 'month';
      } else if (period.value === 'custom_range') {
        if (startDate.value) params.startDate = startDate.value;
        if (endDate.value) params.endDate = endDate.value;
      }

      // 1. Obtener resumen y desglose auditado desde /api/dashboard/summary
      const summaryData = await http.get<any>('/dashboard/summary', { params });

      if (summaryData?.kpis) {
        kpis.value = {
          cashBalance: Number(summaryData.kpis.cashBalance) || 0,
          cashInHand: Number(summaryData.kpis.cashInHand) || 0,
          digitalBank: Number(summaryData.kpis.digitalBank) || 0,
          totalInflowCash: Number(summaryData.kpis.totalInflowCash) || 0,
          totalInflowBank: Number(summaryData.kpis.totalInflowBank) || 0,
          totalOutflowCash: Number(summaryData.kpis.totalOutflowCash) || 0,
          totalOutflowBank: Number(summaryData.kpis.totalOutflowBank) || 0,
          totalInjections: Number(summaryData.kpis.totalInjections) || 0,
          totalWithdrawals: Number(summaryData.kpis.totalWithdrawals) || 0,
          totalCashCollected: Number(summaryData.kpis.totalCashCollected) || 0,
          totalSalesAmount: Number(summaryData.kpis.totalSalesAmount) || 0,
          totalExpenses: Number(summaryData.kpis.totalExpenses) || 0,
          totalRawMaterialPurchases: Number(summaryData.kpis.totalRawMaterialPurchases) || 0,
          totalGeneralExpenses: Number(summaryData.kpis.totalGeneralExpenses) || 0,
          totalPayrollExpenses: Number(summaryData.kpis.totalPayrollExpenses) || 0,
          totalOwnerDraws: Number(summaryData.kpis.totalOwnerDraws) || 0,
          deliveredPendingToCollect: Number(summaryData.kpis.deliveredPendingToCollect) || 0,
        };
      }

      // 2. Normalizar todos los flujos de caja en el libro diario unificado
      const cashFlow = summaryData?.detailedBreakdowns?.cashFlow || {};
      const inflows = Array.isArray(cashFlow.inflows) ? cashFlow.inflows : [];
      const outflows = Array.isArray(cashFlow.outflows) ? cashFlow.outflows : [];
      const transfers = Array.isArray(cashFlow.transfers) ? cashFlow.transfers : [];

      const unified: UnifiedMovement[] = [];

      // A. Ingresos
      inflows.forEach((i: any) => {
        const isAdj =
          i.movementType === 'AJUSTE_SOBRANTE' ||
          i.movementType === 'AJUSTE_CAJA' ||
          i.category === 'AJUSTE_SOBRANTE' ||
          i.category === 'AJUSTE_CAJA' ||
          (i.categoryLabel && i.categoryLabel.includes('Ajuste'));

        unified.push({
          id: i.id || `inflow_${Math.random()}`,
          rawId: i.rawId || i.id,
          date: i.date || i.movementDate || i.paymentDate || new Date().toISOString(),
          createdAt: i.createdAt,
          flowType: 'INFLOW',
          tabCategory: isAdj ? 'BASE' : i.isCashMovement ? 'BASE' : 'SALES',
          concept: i.concept || i.description || (i.isCashMovement ? 'Aporte o Base' : 'Cobro de Venta'),
          description: i.description || i.concept || '',
          amount: Number(i.amount) || 0,
          displayAmount: Number(i.amount) || 0,
          paymentMethod: i.paymentMethod || 'EFECTIVO',
          categoryLabel: i.categoryLabel || (isAdj ? 'Ajuste Caja' : i.isCashMovement ? 'Base / Aporte' : 'Venta'),
          notes: i.notes || null,
          registeredBy: i.registeredBy || 'Edier',
          isCashMovement: !!i.isCashMovement,
        });
      });

      // B. Egresos
      outflows.forEach((o: any) => {
        const isAdj =
          o.category === 'AJUSTE_FALTANTE' ||
          o.category === 'AJUSTE_CAJA' ||
          o.movementType === 'AJUSTE_FALTANTE' ||
          (o.categoryLabel && o.categoryLabel.includes('Ajuste'));

        const isBaseWithdrawal = o.category === 'RETIRO_BASE' || o.movementType === 'RETIRO_BASE';

        unified.push({
          id: o.id || `outflow_${Math.random()}`,
          rawId: o.rawId || o.id,
          date: o.date || o.expenseDate || o.purchaseDate || o.movementDate || new Date().toISOString(),
          createdAt: o.createdAt,
          flowType: 'OUTFLOW',
          tabCategory: isAdj || isBaseWithdrawal ? 'BASE' : 'EXPENSES',
          concept: o.concept || o.description || o.name || 'Gasto Operativo',
          description: o.description || o.concept || o.name || '',
          amount: Number(o.amount) || 0,
          displayAmount: -Math.abs(Number(o.amount) || 0),
          paymentMethod: o.paymentMethod || 'EFECTIVO',
          categoryLabel: o.categoryLabel || o.category || 'Gasto',
          notes: o.notes || null,
          registeredBy: o.registeredBy || 'Edier',
          isCashMovement: !!o.isCashMovement,
        });
      });

      // C. Traslados
      transfers.forEach((t: any) => {
        unified.push({
          id: t.id || `transfer_${Math.random()}`,
          rawId: t.rawId,
          date: t.date || t.movementDate || new Date().toISOString(),
          createdAt: t.createdAt,
          flowType: 'TRANSFER',
          tabCategory: 'TRANSFERS',
          concept: t.description || t.concept || 'Traslado entre Cuentas',
          description: t.description || t.concept || '',
          amount: Number(t.amount) || 0,
          displayAmount: Number(t.amount) || 0,
          paymentMethod: t.paymentMethod || 'TRASLADO',
          categoryLabel: t.categoryLabel || 'Traslado',
          notes: t.notes || null,
          registeredBy: t.registeredBy || 'Edier',
          isCashMovement: true,
        });
      });

      // Ordenar cronológicamente descendente
      unified.sort((a, b) => {
        const timeB = new Date(b.date || b.createdAt || 0).getTime();
        const timeA = new Date(a.date || a.createdAt || 0).getTime();
        return timeB - timeA;
      });

      movements.value = unified;
    } catch (err: any) {
      error.value = err?.message || 'Error al sincronizar datos de caja y finanzas';
    } finally {
      isLoading.value = false;
    }
  }

  // Establecer período de filtrado
  function setPeriod(p: PeriodFilter, start: string = '', end: string = '') {
    period.value = p;
    startDate.value = start;
    endDate.value = end;
    return fetchFinanceData();
  }

  // Registrar un Traslado de Fondos (Efectivo <-> Bancos / Nequi)
  async function createTransfer(payload: TransferPayload) {
    isLoading.value = true;
    try {
      const type =
        payload.type ||
        (payload.from === 'EFECTIVO'
          ? 'TRASLADO_EFECTIVO_A_BANCO'
          : 'TRASLADO_BANCO_A_EFECTIVO');

      const body = {
        type,
        amount: Number(payload.amount),
        concept:
          payload.concept ||
          (type === 'TRASLADO_EFECTIVO_A_BANCO'
            ? 'Consignación de efectivo a cuenta digital / Nequi'
            : 'Retiro de banco a efectivo'),
        paymentMethod: type === 'TRASLADO_EFECTIVO_A_BANCO' ? 'TRANSFERENCIA' : 'EFECTIVO',
        movementDate: payload.movementDate || getTodayDateBogota(),
        notes: payload.notes || null,
      };

      // Registrar movimiento de caja en la API de finanzas
      const res = await http.post('/cash-movements', body);
      toast.success('¡Traslado Registrado con Éxito!', {
        description: `Se trasladaron $ ${new Intl.NumberFormat('es-CO').format(body.amount)} entre cuentas.`,
      });

      await fetchFinanceData();
      return res;
    } finally {
      isLoading.value = false;
    }
  }

  // Registrar Base / Aporte, Retiro de Base o Ajuste de Caja
  async function createCashMovement(payload: CashMovementPayload) {
    isLoading.value = true;
    try {
      const body = {
        ...payload,
        amount: Number(payload.amount),
        movementDate: payload.movementDate || getTodayDateBogota(),
      };

      const res = await http.post('/cash-movements', body);
      toast.success('¡Movimiento Asentado!', {
        description: `${payload.concept} registrado por $ ${new Intl.NumberFormat('es-CO').format(body.amount)}.`,
      });

      await fetchFinanceData();
      return res;
    } finally {
      isLoading.value = false;
    }
  }

  // Eliminar un movimiento de caja
  async function deleteMovement(id: number) {
    try {
      await http.delete(`/cash-movements/${id}`);
      toast.success('Movimiento Eliminado', {
        description: 'El registro de caja fue removido satisfactoriamente.',
      });
      await fetchFinanceData();
    } catch {
      // Manejado por interceptor
    }
  }

  return {
    kpis,
    movements,
    isLoading,
    error,
    period,
    startDate,
    endDate,
    activeTab,
    searchQuery,
    debouncedSearchQuery,
    cashInHand,
    cashInBanks,
    totalRealBalance,
    tabCounts,
    filteredMovements,
    fetchFinanceData,
    setPeriod,
    createTransfer,
    createCashMovement,
    deleteMovement,
  };
});
