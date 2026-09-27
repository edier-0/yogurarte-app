<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useCrmStore } from '@/stores/crm.store';
import { ShoppingBag, Bike, MessageCircle, Wallet, Plus } from 'lucide-vue-next';

const route = useRoute();
const crmStore = useCrmStore();

const emit = defineEmits<{
  (e: 'newOrder'): void;
  (e: 'new-order'): void;
}>();

const currentPath = computed(() => route.path);

const isActive = (prefix: string) => {
  return currentPath.value.startsWith(prefix);
};
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
    <!-- Main Bottom Bar -->
    <nav
      class="flex h-16 w-full items-center justify-around border-t border-surface-light-border bg-surface-light-card/95 px-2 backdrop-blur-lg pb-safe dark:border-surface-dark-border dark:bg-surface-dark-card/95"
    >
      <!-- 1. Pedidos (Acceso para todos los roles) -->
      <RouterLink
        to="/operaciones/pedidos"
        class="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-bold transition-all active:scale-95"
        :class="isActive('/operaciones/pedidos') ? 'text-brand-800 dark:text-brand-darkText' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'"
      >
        <ShoppingBag class="h-5 w-5" />
        <span>Pedidos</span>
      </RouterLink>

      <!-- 2. Domicilios / Rutas -->
      <RouterLink
        to="/operaciones/domicilios"
        class="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-bold transition-all active:scale-95"
        :class="isActive('/operaciones/domicilios') ? 'text-brand-800 dark:text-brand-darkText' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'"
      >
        <Bike class="h-5 w-5" />
        <span>Rutas</span>
      </RouterLink>

      <!-- 3. FAB: Botón central de acción rápida (+) -->
      <div class="flex flex-1 items-center justify-center">
        <button
          type="button"
          @click="emit('new-order'); emit('newOrder');"
          class="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-hero-gradient text-white shadow-elevated transition-transform active:scale-90 hover:shadow-accent"
          title="Nuevo Pedido Rápido"
        >
          <Plus class="h-6 w-6 stroke-[2.5]" />
        </button>
      </div>

      <!-- 4. WhatsApp / CRM (Reemplaza a Lotes, con badge de estado en vivo) -->
      <RouterLink
        to="/operaciones/crm"
        class="relative flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-bold transition-all active:scale-95"
        :class="isActive('/operaciones/crm') ? 'text-brand-800 dark:text-brand-darkText' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'"
      >
        <div class="relative">
          <MessageCircle class="h-5 w-5" />
          <span
            v-if="crmStore.isWhatsAppConnected"
            class="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center"
            title="WhatsApp En Vivo"
          >
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
        </div>
        <span>WhatsApp</span>
      </RouterLink>

      <!-- 5. Caja (Control de Caja / Finanzas) -->
      <RouterLink
        to="/finanzas/caja"
        class="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-bold transition-all active:scale-95"
        :class="isActive('/finanzas') ? 'text-brand-800 dark:text-brand-darkText' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'"
      >
        <Wallet class="h-5 w-5" />
        <span>Caja</span>
      </RouterLink>
    </nav>
  </div>
</template>
