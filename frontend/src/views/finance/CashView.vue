<script setup lang="ts">
import { ref } from 'vue';
import {
  Wallet,
  Banknote,
  Smartphone,
  ArrowLeftRight,
  ShieldCheck,
  Receipt,
  Scale,
  CalendarRange
} from 'lucide-vue-next';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const cashInHand = ref(620000);
const cashInBanks = ref(830000);
const totalRealBalance = ref(1450000);
const activePeriod = ref<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');
</script>

<template>
  <div class="space-y-6">
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
        <!-- Cuadrar Caja -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface-light-card px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all active:scale-95 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-dark-card dark:text-slate-200"
        >
          <Scale class="h-4 w-4 text-brand-800 dark:text-brand-darkText stroke-[1.75]" />
          <span>Cuadrar Caja</span>
        </button>

        <!-- Traslado -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-4 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
          title="Traslado entre Efectivo y Banco"
        >
          <ArrowLeftRight class="h-4 w-4 stroke-[2]" />
          <span>Traslado</span>
        </button>
      </div>
    </div>

    <!-- Saldo Real - Tarjeta Principal con Desglose Físico vs Bancos -->
    <div class="rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7">
      <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-natural-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-natural-500 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center gap-1">
              <Wallet class="h-3.5 w-3.5 stroke-[2]" />
              Saldo Real en Caja
            </span>
            <span class="flex items-center gap-1 text-xs font-bold text-slate-400">
              <ShieldCheck class="h-3.5 w-3.5 text-emerald-500 stroke-[1.75]" />
              Auditado
            </span>
          </div>
          <div class="mt-2 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
            {{ formatCurrency(totalRealBalance) }}
          </div>
        </div>

        <!-- Desglose Físico vs Digital -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Efectivo Físico -->
          <div class="flex items-center gap-3 rounded-2xl bg-surface-light-canvas px-4 py-3 dark:bg-surface-dark-canvas">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Banknote class="h-5 w-5 stroke-[1.75]" />
            </div>
            <div>
              <span class="block text-[11px] font-bold uppercase text-slate-400">En Efectivo</span>
              <span class="text-sm font-extrabold text-slate-900 dark:text-white">
                {{ formatCurrency(cashInHand) }}
              </span>
            </div>
          </div>

          <!-- Bancos / Digital -->
          <div class="flex items-center gap-3 rounded-2xl bg-surface-light-canvas px-4 py-3 dark:bg-surface-dark-canvas">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-dairy-50 text-dairy-500 dark:bg-blue-950/40 dark:text-blue-400">
              <Smartphone class="h-5 w-5 stroke-[1.75]" />
            </div>
            <div>
              <span class="block text-[11px] font-bold uppercase text-slate-400">Bancos & Nequi</span>
              <span class="text-sm font-extrabold text-slate-900 dark:text-white">
                {{ formatCurrency(cashInBanks) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Barra de Período Ergonómica (CalendarRange) -->
    <div class="flex flex-col gap-3 rounded-2xl border border-surface-light-border bg-surface-light-card p-3 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <CalendarRange class="h-4 w-4 text-brand-800 dark:text-brand-darkText stroke-[1.75]" />
        <span>Filtrar Período:</span>
      </div>

      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <button
          type="button"
          @click="activePeriod = 'TODAY'"
          class="rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
          :class="activePeriod === 'TODAY' ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'"
        >
          Hoy
        </button>
        <button
          type="button"
          @click="activePeriod = 'WEEK'"
          class="rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
          :class="activePeriod === 'WEEK' ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'"
        >
          Esta Semana
        </button>
        <button
          type="button"
          @click="activePeriod = 'MONTH'"
          class="rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
          :class="activePeriod === 'MONTH' ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'"
        >
          Este Mes
        </button>
        <button
          type="button"
          @click="activePeriod = 'ALL'"
          class="rounded-xl px-3 py-1.5 text-xs font-bold transition-all"
          :class="activePeriod === 'ALL' ? 'bg-brand-800 text-white shadow-sm dark:bg-brand-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'"
        >
          Histórico
        </button>
      </div>
    </div>

    <!-- Libro Diario de Caja Placeholder -->
    <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-8 text-center shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
      <Receipt class="mx-auto h-12 w-12 text-amber-500 stroke-[1.5]" />
      <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
        Libro Diario de Caja
      </h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Trazabilidad completa de ingresos por abonos, egresos por gastos y conciliación física.
      </p>
    </div>
  </div>
</template>
