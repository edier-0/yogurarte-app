<script setup lang="ts">
import { FlaskConical, Milk, Plus, TrendingUp } from 'lucide-vue-next';
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Lotes y Rendimiento
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Control de fermentación, trazabilidad de leche, descargos de mermas y costos por litro.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-4 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
      >
        <Plus class="h-4 w-4 stroke-[2.5]" />
        <span>Iniciar Nuevo Lote</span>
      </button>
    </div>

    <!-- Metrics -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-slate-500">Lotes Activos</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-slate-900 dark:text-white">4</span>
          <FlaskConical class="h-5 w-5 text-natural-500 stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-natural-500">Litros Producidos (Mes)</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-natural-500">480 L</span>
          <Milk class="h-5 w-5 text-natural-500 stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-dairy-500">Rendimiento Promedio</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-dairy-500">96.8%</span>
          <TrendingUp class="h-5 w-5 text-dairy-500 stroke-[1.75]" />
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-8 text-center shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
      <FlaskConical class="mx-auto h-12 w-12 text-natural-500/70 stroke-[1.5]" />
      <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
        Módulo de Lotes y Trazabilidad
      </h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Gestión de lotes conectado con /api/batches y cálculo automático de rendimiento artesanal.
      </p>
    </div>
  </div>
</template>
