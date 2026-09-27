<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import {
  ShieldCheck,
  Banknote,
  Smartphone,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  X,
} from 'lucide-vue-next';
import { useFinanceStore } from '@/stores/finance.store';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const financeStore = useFinanceStore();

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[90vh] overflow-y-auto"
      >
        <!-- Encabezado del Modal -->
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-natural-50 text-natural-500 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Auditoría y Origen de Fondos en Caja
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Trazabilidad matemática de ingresos, egresos y traslados por canal
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="emit('update:open', false)"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Banner de Saldo Real Consolidado -->
        <div class="mt-5 rounded-2xl bg-surface-light-canvas p-5 dark:bg-surface-dark-canvas border border-surface-light-border dark:border-surface-dark-border">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Saldo Real Total Auditado
              </span>
              <div class="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                {{ formatCurrency(financeStore.totalRealBalance) }}
              </div>
            </div>

            <!-- Canales Desglosados -->
            <div class="flex flex-wrap items-center gap-2.5">
              <div class="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <Banknote class="h-4 w-4" />
                <div class="text-left">
                  <span class="block text-[9px] font-extrabold uppercase">En Efectivo</span>
                  <span class="text-xs font-black">{{ formatCurrency(financeStore.cashInHand) }}</span>
                </div>
              </div>

              <div class="flex items-center gap-2 rounded-xl bg-dairy-50 px-3 py-2 text-dairy-600 dark:bg-blue-950/40 dark:text-blue-300">
                <Smartphone class="h-4 w-4" />
                <div class="text-left">
                  <span class="block text-[9px] font-extrabold uppercase">Bancos & Nequi</span>
                  <span class="text-xs font-black">{{ formatCurrency(financeStore.cashInBanks) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bloques de Flujo Auditado -->
        <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- 1. Ingresos Auditados -->
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <div class="flex items-center justify-between border-b border-emerald-100 pb-2 dark:border-emerald-900/40">
              <div class="flex items-center gap-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight class="h-4 w-4 stroke-[2.5]" />
                <span>Ingresos Brutos</span>
              </div>
              <span class="text-xs font-black text-emerald-700 dark:text-emerald-400">
                {{ formatCurrency(financeStore.kpis.totalCashCollected + financeStore.kpis.totalInjections) }}
              </span>
            </div>

            <div class="mt-3 space-y-2 text-xs">
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Cobros de Ventas (Pedidos)</span>
                <span class="font-extrabold text-slate-900 dark:text-white">
                  {{ formatCurrency(financeStore.kpis.totalCashCollected) }}
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Bases Iniciales e Inyecciones</span>
                <span class="font-extrabold text-slate-900 dark:text-white">
                  {{ formatCurrency(financeStore.kpis.totalInjections) }}
                </span>
              </div>
              <div class="mt-2 border-t border-emerald-100/60 pt-2 text-[11px] text-slate-500">
                <div class="flex justify-between">
                  <span>En Efectivo:</span>
                  <span class="font-bold text-amber-600">{{ formatCurrency(financeStore.kpis.totalInflowCash) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>En Bancos / Digital:</span>
                  <span class="font-bold text-dairy-500">{{ formatCurrency(financeStore.kpis.totalInflowBank) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Egresos Auditados -->
          <div class="rounded-2xl border border-rose-100 bg-rose-50/30 p-4 dark:border-rose-900/30 dark:bg-rose-950/20">
            <div class="flex items-center justify-between border-b border-rose-100 pb-2 dark:border-rose-900/40">
              <div class="flex items-center gap-2 text-xs font-extrabold text-rose-700 dark:text-rose-400">
                <ArrowDownLeft class="h-4 w-4 stroke-[2.5]" />
                <span>Egresos Totales</span>
              </div>
              <span class="text-xs font-black text-rose-700 dark:text-rose-400">
                -{{ formatCurrency(financeStore.kpis.totalExpenses + financeStore.kpis.totalWithdrawals) }}
              </span>
            </div>

            <div class="mt-3 space-y-2 text-xs">
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Compras de Insumos y Leche</span>
                <span class="font-extrabold text-slate-900 dark:text-white">
                  {{ formatCurrency(financeStore.kpis.totalRawMaterialPurchases) }}
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Gastos Operativos & Servicios</span>
                <span class="font-extrabold text-slate-900 dark:text-white">
                  {{ formatCurrency(financeStore.kpis.totalGeneralExpenses) }}
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Nómina y Mano de Obra</span>
                <span class="font-extrabold text-slate-900 dark:text-white">
                  {{ formatCurrency(financeStore.kpis.totalPayrollExpenses) }}
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Retiros de Base de Caja</span>
                <span class="font-extrabold text-slate-900 dark:text-white">
                  {{ formatCurrency(financeStore.kpis.totalWithdrawals) }}
                </span>
              </div>
              <div class="mt-2 border-t border-rose-100/60 pt-2 text-[11px] text-slate-500">
                <div class="flex justify-between">
                  <span>En Efectivo:</span>
                  <span class="font-bold text-amber-600">-{{ formatCurrency(financeStore.kpis.totalOutflowCash) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>En Bancos / Digital:</span>
                  <span class="font-bold text-dairy-500">-{{ formatCurrency(financeStore.kpis.totalOutflowBank) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Traslados y Regla de Cuadre -->
        <div class="mt-4 rounded-2xl border border-blue-100 bg-blue-50/30 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
          <div class="flex items-center gap-2 text-xs font-extrabold text-blue-700 dark:text-blue-400">
            <ArrowLeftRight class="h-4 w-4 stroke-[2]" />
            <span>Traslados entre Cuentas (Consignaciones y Retiros)</span>
          </div>
          <p class="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
            Los traslados transfieren valor entre el monedero de <strong>Efectivo</strong> y las cuentas digitales <strong>(Bancolombia / Nequi)</strong>. Mantienen el balance global inalterado mientras actualizan con exactitud la disponibilidad física en caja menor.
          </p>
        </div>

        <div class="mt-5 flex justify-end">
          <button
            type="button"
            @click="emit('update:open', false)"
            class="rounded-xl bg-brand-800 px-5 py-2.5 text-xs font-extrabold text-white transition-transform active:scale-95 dark:bg-brand-500"
          >
            Entendido
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
