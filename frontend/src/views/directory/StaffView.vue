<script setup lang="ts">
import { Users, Crown, HardHat, BadgeDollarSign, Plus } from 'lucide-vue-next';
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Nómina y Personal
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Control de colaboradores, jornales de producción, liquidaciones de pago y roles de usuario.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-4 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95"
        >
          <Plus class="h-4 w-4 stroke-[2.5]" />
          <span>Registrar Colaborador</span>
        </button>
      </div>
    </div>

    <!-- Metrics -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-slate-500">Equipo Activo</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-slate-900 dark:text-white">6</span>
          <Users class="h-5 w-5 text-natural-500 stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-amber-500">Socios Administradores</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-amber-500">2</span>
          <Crown class="h-5 w-5 text-amber-500 stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-dairy-500">Colaboradores & Domicilios</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-dairy-500">4</span>
          <HardHat class="h-5 w-5 text-dairy-500 stroke-[1.75]" />
        </div>
      </div>

      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-5 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <span class="text-xs font-bold text-natural-500">Liquidación de Quincena</span>
        <div class="mt-2 flex items-baseline justify-between">
          <span class="text-2xl font-extrabold text-natural-500">$ 1.800.000</span>
          <BadgeDollarSign class="h-5 w-5 text-natural-500 stroke-[1.75]" />
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-8 text-center shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
      <Users class="mx-auto h-12 w-12 text-slate-400 stroke-[1.5]" />
      <h3 class="mt-3 text-base font-extrabold text-slate-900 dark:text-white">
        Administración de Equipo y Pagos
      </h3>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Jornales de producción y domicilios con soporte de zonas horarias locales y roles.
      </p>
    </div>
  </div>
</template>
