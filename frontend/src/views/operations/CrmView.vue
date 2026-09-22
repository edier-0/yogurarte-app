<script setup lang="ts">
import { MessageCircle, Wifi, Send, Search } from 'lucide-vue-next';
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          CRM & WhatsApp Baileys
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Mensajería omnicanal en tiempo real, respuestas rápidas y seguimiento de clientes.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <Wifi class="h-3.5 w-3.5 stroke-[2]" />
          Baileys Conectado
        </span>
      </div>
    </div>

    <!-- WhatsApp Shell Placeholder -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Conversation List -->
      <div class="rounded-2xl border border-surface-light-border bg-surface-light-card p-4 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card">
        <div class="relative mb-3">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[1.75]" />
          <input
            type="text"
            placeholder="Buscar conversación..."
            class="w-full rounded-xl border border-slate-200 bg-surface-light-canvas py-1.5 pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-surface-dark-canvas"
          />
        </div>
        <div class="flex flex-col items-center justify-center py-12 text-center text-slate-400">
          <MessageCircle class="h-8 w-8 text-slate-300 dark:text-slate-600 stroke-[1.75]" />
          <p class="mt-2 text-xs font-semibold">Bandeja sincronizada con el backend</p>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="flex flex-col justify-between rounded-2xl border border-surface-light-border bg-surface-light-card p-6 shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card lg:col-span-2">
        <div class="flex flex-col items-center justify-center py-20 text-center text-slate-400">
          <MessageCircle class="h-12 w-12 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
          <h3 class="mt-3 text-base font-extrabold text-slate-700 dark:text-slate-300">
            Selecciona un chat para iniciar
          </h3>
          <p class="mt-1 text-xs">
            Comunícate con tus clientes y envía estados de pedidos vía WhatsApp.
          </p>
        </div>

        <div class="border-t border-surface-light-border pt-3 dark:border-surface-dark-border">
          <div class="flex items-center gap-2">
            <input
              type="text"
              disabled
              placeholder="Escribe un mensaje..."
              class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              disabled
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-400 dark:bg-slate-800"
            >
              <Send class="h-4 w-4 stroke-[1.75]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
