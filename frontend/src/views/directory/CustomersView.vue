<script setup lang="ts">
import { Users, Plus, Award, AlertCircle, Heart } from 'lucide-vue-next';
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Directorio de Clientes
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Base de clientes frecuentes, historial de pedidos, programa de fidelización y saldos deudores.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-4 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Nuevo Cliente</span>
        </button>
      </div>
    </div>

    <!-- Metrics -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-slate-500">Clientes Totales</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-slate-900 dark:text-white">142</span>
          <Users class="h-5 w-5 text-brand-800 dark:text-brand-darkText stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-accent-500">Club VIP & Puntos</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-accent-500">28</span>
          <Award class="h-5 w-5 text-accent-500 stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-amber-500">Clientes con Cartera</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-amber-500">7</span>
          <AlertCircle class="h-5 w-5 text-amber-500 stroke-[1.75]" />
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-8 text-center shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
      <Heart class="mx-auto h-12 w-12 text-accent-500/70 stroke-[1.5]" />
      <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
        Fidelización y Tarjetas de Cliente
      </h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Gestión de contactos sincronizada con /api/customers y reglas de abono en cascada.
      </p>
    </div>
  </div>
</template>
