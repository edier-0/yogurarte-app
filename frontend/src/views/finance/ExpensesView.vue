<script setup lang="ts">
import {
  Receipt,
  Plus,
  CreditCard,
  Fuel,
  Zap,
  Wrench
} from 'lucide-vue-next';

const expenseCategories = [
  { name: 'Combustible & Domicilios', icon: Fuel, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40', total: '$ 320.000' },
  { name: 'Servicios Públicos (Luz / Agua)', icon: Zap, color: 'text-dairy-500 bg-dairy-50 dark:bg-blue-950/40', total: '$ 480.000' },
  { name: 'Mantenimiento & Planta', icon: Wrench, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800', total: '$ 210.000' },
  { name: 'Cuotas & Insumos a Crédito', icon: CreditCard, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40', total: '$ 450.000' },
];
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Gastos y Compras
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Registro de compras de leche, insumos, fletes, mantenimiento y cuentas por pagar.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-accent transition-transform active:scale-95 hover:bg-accent-600"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Registrar Gasto</span>
        </button>
      </div>
    </div>

    <!-- Metrics -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-slate-500">Gastos del Mes</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-rose-600 dark:text-rose-400">$ 2.340.000</span>
          <Receipt class="h-5 w-5 text-rose-500 stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-amber-500">Cuentas por Pagar</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-amber-500">$ 450.000</span>
          <CreditCard class="h-5 w-5 text-amber-500 stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-slate-500">Categorías de Gasto</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-slate-900 dark:text-white">4</span>
          <Tag class="h-5 w-5 text-brand-800 dark:text-brand-darkText stroke-[1.75]" />
        </div>
      </div>
    </div>

    <!-- Categorías de Gasto Rápidas (Fuel, Zap, Wrench, CreditCard) -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="cat in expenseCategories"
        :key="cat.name"
        class="flex items-center gap-3.5 rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card"
      >
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" :class="cat.color">
          <component :is="cat.icon" class="h-5 w-5 stroke-[1.75]" />
        </div>
        <div class="min-w-0 flex-1">
          <span class="block truncate text-xs font-bold text-slate-500 dark:text-slate-400">
            {{ cat.name }}
          </span>
          <span class="text-sm font-extrabold text-slate-900 dark:text-white">
            {{ cat.total }}
          </span>
        </div>
      </div>
    </div>

    <!-- Historial de Facturas -->
    <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-8 text-center shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
      <Receipt class="mx-auto h-12 w-12 text-slate-400 stroke-[1.5]" />
      <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
        Historial de Gastos y Facturas
      </h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Control y clasificación de egresos conectado con la API financiera.
      </p>
    </div>
  </div>
</template>
