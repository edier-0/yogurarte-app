<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Wallet,
  Banknote,
  Smartphone,
  ArrowLeftRight,
  ShieldCheck,
  Receipt,
  Scale,
  CalendarRange,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  RefreshCw,
  ChevronRight,
  Trash2,
} from 'lucide-vue-next';
import {
  useFinanceStore,
  type PeriodFilter,
  getTodayDateBogota,
} from '@/stores/finance.store';
import TransferModal from '@/components/finance/TransferModal.vue';
import CashMovementModal, { type MovementMode } from '@/components/finance/CashMovementModal.vue';
import CashAuditBreakdownModal from '@/components/finance/CashAuditBreakdownModal.vue';

const router = useRouter();
const financeStore = useFinanceStore();

// Modales reactivos
const isTransferModalOpen = ref(false);
const isMovementModalOpen = ref(false);
const movementModalMode = ref<MovementMode>('BASE');
const isAuditModalOpen = ref(false);

// Fechas para rango personalizado
const customStartDate = ref(financeStore.startDate || getTodayDateBogota());
const customEndDate = ref(financeStore.endDate || getTodayDateBogota());

// Formateador de moneda en pesos colombianos
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

// Formateador de fecha/hora legible
const formatMovementDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return dateStr;
  }
};

onMounted(() => {
  financeStore.fetchFinanceData();
});

// Manejo del selector de período segmentado
function handleSelectPeriod(p: PeriodFilter) {
  if (p === 'custom_range') {
    financeStore.period = 'custom_range';
    // No disparamos de inmediato si no hay fechas, esperamos a que el usuario presione Filtrar Rango
    if (customStartDate.value && customEndDate.value) {
      financeStore.setPeriod('custom_range', customStartDate.value, customEndDate.value);
    }
  } else {
    financeStore.setPeriod(p);
  }
}

function handleApplyCustomRange() {
  financeStore.setPeriod('custom_range', customStartDate.value, customEndDate.value);
}

function handleApplyAllHistory() {
  customStartDate.value = '';
  customEndDate.value = '';
  financeStore.setPeriod('all');
}

// Abrir modales según acción
function openAddBase() {
  movementModalMode.value = 'BASE';
  isMovementModalOpen.value = true;
}

function openAdjustCash() {
  movementModalMode.value = 'ADJUST';
  isMovementModalOpen.value = true;
}

function openWithdrawBase() {
  movementModalMode.value = 'WITHDRAW';
  isMovementModalOpen.value = true;
}

function openTransfer() {
  isTransferModalOpen.value = true;
}

function openAddExpense() {
  router.push('/finanzas/gastos');
}

function confirmDelete(id: number | string, isCash: boolean | undefined) {
  if (!isCash || typeof id !== 'number') return;
  if (window.confirm('¿Deseas eliminar este movimiento de caja?')) {
    financeStore.deleteMovement(id);
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Encabezado de la Vista -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Control de Caja y Finanzas
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Auditoría de saldo real, desglose de efectivo físico vs cuentas digitales y traslados.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <!-- Botón Refrescar -->
        <button
          type="button"
          @click="financeStore.fetchFinanceData"
          :disabled="financeStore.isLoading"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface-light-card px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-200"
          title="Actualizar saldos y libro diario"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': financeStore.isLoading }" />
          <span class="hidden sm:inline">Refrescar</span>
        </button>

        <!-- Botón Traslado Rápido -->
        <button
          type="button"
          @click="openTransfer"
          class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
          title="Traslado entre Efectivo y Banco"
        >
          <ArrowLeftRight class="h-4 w-4 stroke-[2]" />
          <span>Traslado</span>
        </button>
      </div>
    </div>

    <!-- 1. Tarjeta Superior de Métrica (Saldo Real Auditado) -->
    <div class="rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7">
      <div class="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <!-- Balance Total y Auditoría -->
        <div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1 rounded-full bg-natural-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-natural-500 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Wallet class="h-3.5 w-3.5 stroke-[2]" />
              Saldo Real en Caja
            </span>
            <span class="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
              <ShieldCheck class="h-3.5 w-3.5 text-emerald-500 stroke-[2]" />
              Auditado
            </span>
          </div>

          <div class="mt-2 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
            {{ formatCurrency(financeStore.totalRealBalance) }}
          </div>

          <!-- Botón interactivo: Ver origen en caja -->
          <button
            type="button"
            @click="isAuditModalOpen = true"
            class="group mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-brand-800 transition-colors hover:text-brand-900 dark:text-brand-darkText dark:hover:text-amber-300"
          >
            <span>Ver origen en caja</span>
            <ChevronRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <!-- Sub-bloque Desglosado: Efectivo Físico vs Bancos / Digital -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Banknote En Efectivo -->
          <div class="flex min-w-[150px] flex-1 items-center gap-3 rounded-2xl bg-surface-light-canvas px-4 py-3 border border-surface-light-border dark:border-surface-dark-border dark:bg-surface-dark-canvas sm:flex-initial">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Banknote class="h-5 w-5 stroke-[1.75]" />
            </div>
            <div>
              <span class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                En Efectivo
              </span>
              <span class="text-sm font-black text-slate-900 dark:text-white sm:text-base">
                {{ formatCurrency(financeStore.cashInHand) }}
              </span>
            </div>
          </div>

          <!-- Smartphone En Bancos / Digital -->
          <div class="flex min-w-[150px] flex-1 items-center gap-3 rounded-2xl bg-surface-light-canvas px-4 py-3 border border-surface-light-border dark:border-surface-dark-border dark:bg-surface-dark-canvas sm:flex-initial">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-dairy-50 text-dairy-500 dark:bg-blue-950/40 dark:text-blue-400">
              <Smartphone class="h-5 w-5 stroke-[1.75]" />
            </div>
            <div>
              <span class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                En Bancos / Digital
              </span>
              <span class="text-sm font-black text-slate-900 dark:text-white sm:text-base">
                {{ formatCurrency(financeStore.cashInBanks) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Barra de Períodos Ergonómica -->
    <div class="space-y-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2 text-xs font-extrabold text-slate-600 dark:text-slate-300">
          <CalendarRange class="h-4 w-4 text-brand-800 dark:text-brand-darkText stroke-[1.75]" />
          <span>Período de Análisis:</span>
        </div>

        <!-- Control Segmentado Deslizable (scrollbar-width: none) -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            @click="handleSelectPeriod('today')"
            class="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all"
            :class="
              financeStore.period === 'today'
                ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-500'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            "
          >
            Hoy
          </button>

          <button
            type="button"
            @click="handleSelectPeriod('this_week')"
            class="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all"
            :class="
              financeStore.period === 'this_week'
                ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-500'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            "
          >
            Esta Semana
          </button>

          <button
            type="button"
            @click="handleSelectPeriod('this_month')"
            class="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all"
            :class="
              financeStore.period === 'this_month'
                ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-500'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            "
          >
            Este Mes
          </button>

          <button
            type="button"
            @click="handleSelectPeriod('custom_range')"
            class="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all"
            :class="
              financeStore.period === 'custom_range' || financeStore.period === 'all'
                ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-500'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            "
          >
            Histórico / Rango
          </button>
        </div>
      </div>

      <!-- Despliegue de Rango Personalizado (.cash-date-card) -->
      <div
        v-if="financeStore.period === 'custom_range' || financeStore.period === 'all'"
        class="border-t border-surface-light-border pt-3 dark:border-surface-dark-border"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="grid grid-cols-2 gap-2.5 sm:flex sm:items-center">
            <!-- Tarjeta Desde -->
            <div class="cash-date-card flex flex-1 flex-col rounded-xl border border-surface-light-border bg-surface-light-canvas px-3 py-1.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
              <span class="text-[10px] font-bold text-slate-400">Desde:</span>
              <input
                v-model="customStartDate"
                type="date"
                class="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none dark:text-white"
              />
            </div>

            <!-- Tarjeta Hasta -->
            <div class="cash-date-card flex flex-1 flex-col rounded-xl border border-surface-light-border bg-surface-light-canvas px-3 py-1.5 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
              <span class="text-[10px] font-bold text-slate-400">Hasta:</span>
              <input
                v-model="customEndDate"
                type="date"
                class="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none dark:text-white"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="handleApplyCustomRange"
              class="flex-1 rounded-xl bg-brand-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-transform active:scale-95 dark:bg-brand-500 sm:flex-initial"
            >
              Filtrar Rango
            </button>
            <button
              type="button"
              @click="handleApplyAllHistory"
              class="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-canvas dark:text-slate-300 sm:flex-initial"
            >
              Ver Todo el Historial
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Botonera Operativa Responsiva (Grilla 2 Columnas en móvil) -->
    <div class="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
      <!-- 1. PiggyBank Base / Aporte -->
      <button
        type="button"
        @click="openAddBase"
        class="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs font-extrabold text-emerald-700 transition-transform active:scale-95 hover:bg-emerald-100/60 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
      >
        <PiggyBank class="h-4 w-4 stroke-[2]" />
        <span>Base / Aporte</span>
      </button>

      <!-- 2. Scale Ajustar / Cuadrar -->
      <button
        type="button"
        @click="openAdjustCash"
        class="inline-flex items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-purple-50/60 p-3 text-xs font-extrabold text-purple-700 transition-transform active:scale-95 hover:bg-purple-100/60 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-300"
        title="Ajustar diferencias por comisiones o descuadres"
      >
        <Scale class="h-4 w-4 stroke-[2]" />
        <span>Ajustar / Cuadrar</span>
      </button>

      <!-- 3. ArrowDownLeft Retirar Base -->
      <button
        type="button"
        @click="openWithdrawBase"
        class="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-3 text-xs font-extrabold text-rose-700 transition-transform active:scale-95 hover:bg-rose-100/60 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
      >
        <ArrowDownLeft class="h-4 w-4 stroke-[2]" />
        <span>Retirar Base</span>
      </button>

      <!-- 4. ArrowLeftRight Traslado (etiqueta corta) -->
      <button
        type="button"
        @click="openTransfer"
        class="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/60 p-3 text-xs font-extrabold text-blue-700 transition-transform active:scale-95 hover:bg-blue-100/60 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300"
        title="Traslado entre Efectivo y Banco"
      >
        <ArrowLeftRight class="h-4 w-4 stroke-[2]" />
        <span>Traslado</span>
      </button>

      <!-- 5. Receipt Registrar Gasto (abarcando las 2 columnas con col-span-2) -->
      <button
        type="button"
        @click="openAddExpense"
        class="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-hero-gradient p-3 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 sm:col-auto sm:px-5"
      >
        <Receipt class="h-4 w-4 stroke-[2]" />
        <span>Registrar Gasto</span>
      </button>
    </div>

    <!-- 4. Libro Diario Reactivo -->
    <div class="space-y-4 rounded-3xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
            Libro Diario de Caja
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Registro cronológico detallado de ingresos, egresos y traslados
          </p>
        </div>

        <!-- Buscador Reactivo (debounce 300ms) -->
        <div class="relative w-full sm:w-72">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            v-model="financeStore.searchQuery"
            type="text"
            placeholder="Buscar concepto, notas..."
            class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
          />
        </div>
      </div>

      <!-- Tira de 5 Chips de Filtrado con Conteos -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <!-- [Todos] -->
        <button
          type="button"
          @click="financeStore.activeTab = 'ALL'"
          class="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
          :class="
            financeStore.activeTab === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          "
        >
          Todos ({{ financeStore.tabCounts.all }})
        </button>

        <!-- [Cobros de Ventas] -->
        <button
          type="button"
          @click="financeStore.activeTab = 'SALES'"
          class="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
          :class="
            financeStore.activeTab === 'SALES'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          "
        >
          Cobros de Ventas ({{ financeStore.tabCounts.sales }})
        </button>

        <!-- [Compras y Gastos] -->
        <button
          type="button"
          @click="financeStore.activeTab = 'EXPENSES'"
          class="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
          :class="
            financeStore.activeTab === 'EXPENSES'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          "
        >
          Compras y Gastos ({{ financeStore.tabCounts.expenses }})
        </button>

        <!-- [Bases y Retiros] -->
        <button
          type="button"
          @click="financeStore.activeTab = 'BASE'"
          class="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
          :class="
            financeStore.activeTab === 'BASE'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          "
        >
          Bases y Retiros ({{ financeStore.tabCounts.base }})
        </button>

        <!-- [Traslados] -->
        <button
          type="button"
          @click="financeStore.activeTab = 'TRANSFERS'"
          class="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all"
          :class="
            financeStore.activeTab === 'TRANSFERS'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
          "
        >
          Traslados ({{ financeStore.tabCounts.transfers }})
        </button>
      </div>

      <!-- Lista de Movimientos con v-auto-animate -->
      <div v-auto-animate class="space-y-2.5">
        <!-- Estado Vacío -->
        <div
          v-if="financeStore.filteredMovements.length === 0"
          class="rounded-2xl border border-dashed border-surface-light-border p-8 text-center dark:border-surface-dark-border"
        >
          <Receipt class="mx-auto h-10 w-10 text-slate-400/80 stroke-[1.5]" />
          <h3 class="mt-2 text-sm font-extrabold text-slate-900 dark:text-white">
            Sin movimientos en este período
          </h3>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            No se encontraron registros de caja bajo los filtros seleccionados.
          </p>
        </div>

        <!-- Tarjetas de Movimientos -->
        <div
          v-for="mov in financeStore.filteredMovements"
          :key="mov.id"
          class="flex flex-col gap-3 rounded-2xl border border-surface-light-border bg-surface-light-canvas p-3.5 transition-all hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3">
            <!-- Icono según tipo de flujo -->
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="
                mov.flowType === 'INFLOW'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : mov.flowType === 'OUTFLOW'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                  : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
              "
            >
              <ArrowUpRight v-if="mov.flowType === 'INFLOW'" class="h-5 w-5 stroke-[2.5]" />
              <ArrowDownLeft v-else-if="mov.flowType === 'OUTFLOW'" class="h-5 w-5 stroke-[2.5]" />
              <ArrowLeftRight v-else class="h-5 w-5 stroke-[2]" />
            </div>

            <!-- Concepto y Metadatos -->
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-extrabold text-slate-900 dark:text-white">
                  {{ mov.concept }}
                </span>
                <span
                  class="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider"
                  :class="
                    mov.flowType === 'INFLOW'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : mov.flowType === 'OUTFLOW'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  "
                >
                  {{ mov.categoryLabel || mov.tabCategory }}
                </span>
              </div>

              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>{{ formatMovementDate(mov.date) }}</span>
                <span>•</span>
                <span class="font-bold text-slate-700 dark:text-slate-300">{{ mov.paymentMethod }}</span>
                <span v-if="mov.registeredBy">• Por: {{ mov.registeredBy }}</span>
              </div>

              <p v-if="mov.notes" class="mt-1 text-[11px] italic text-slate-400">
                "{{ mov.notes }}"
              </p>
            </div>
          </div>

          <!-- Monto y Acciones -->
          <div class="flex items-center justify-between sm:justify-end gap-3 border-t border-slate-100 pt-2 sm:border-t-0 sm:pt-0 dark:border-slate-800">
            <div class="text-right">
              <span
                class="text-sm font-black sm:text-base"
                :class="
                  mov.flowType === 'INFLOW'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : mov.flowType === 'OUTFLOW'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-blue-600 dark:text-blue-400'
                "
              >
                {{ mov.flowType === 'INFLOW' ? '+' : mov.flowType === 'OUTFLOW' ? '-' : '' }}{{ formatCurrency(mov.amount) }}
              </span>
            </div>

            <!-- Botón Eliminar si es movimiento de caja -->
            <button
              v-if="mov.isCashMovement && mov.rawId"
              type="button"
              @click="confirmDelete(mov.rawId, mov.isCashMovement)"
              class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              title="Eliminar movimiento de caja"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modales Auxiliares -->
    <TransferModal
      v-model:open="isTransferModalOpen"
      @transferred="financeStore.fetchFinanceData"
    />

    <CashMovementModal
      v-model:open="isMovementModalOpen"
      :mode="movementModalMode"
      @saved="financeStore.fetchFinanceData"
    />

    <CashAuditBreakdownModal
      v-model:open="isAuditModalOpen"
    />
  </div>
</template>

<style scoped>
.cash-date-card {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.cash-date-card:focus-within {
  border-color: #2D3748;
}

/* Ocultar barra de desplazamiento manteniendo funcionalidad táctil */
.scrollbar-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
