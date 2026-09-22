<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { ShoppingBag, Bike, FlaskConical, Wallet, Plus } from 'lucide-vue-next';

const route = useRoute();

const emit = defineEmits<{
  (e: 'newOrder'): void;
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
      <!-- Pedidos -->
      <RouterLink
        to="/operaciones/pedidos"
        class="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-bold transition-all active:scale-95"
        :class="isActive('/operaciones/pedidos') ? 'text-brand-800 dark:text-brand-darkText' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'"
      >
        <ShoppingBag class="h-5 w-5" />
        <span>Pedidos</span>
      </RouterLink>

      <!-- Domicilios -->
      <RouterLink
        to="/operaciones/domicilios"
        class="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-bold transition-all active:scale-95"
        :class="isActive('/operaciones/domicilios') ? 'text-brand-800 dark:text-brand-darkText' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'"
      >
        <Bike class="h-5 w-5" />
        <span>Rutas</span>
      </RouterLink>

      <!-- FAB: Center Quick Action Button -->
      <div class="flex flex-1 items-center justify-center">
        <button
          type="button"
          @click="emit('newOrder')"
          class="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-hero-gradient text-white shadow-elevated transition-transform active:scale-90 hover:shadow-accent"
          title="Nuevo Pedido Rápido"
        >
          <Plus class="h-6 w-6 stroke-[2.5]" />
        </button>
      </div>

      <!-- Producción -->
      <RouterLink
        to="/produccion/lotes"
        class="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-bold transition-all active:scale-95"
        :class="isActive('/produccion') ? 'text-brand-800 dark:text-brand-darkText' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'"
      >
        <FlaskConical class="h-5 w-5" />
        <span>Lotes</span>
      </RouterLink>

      <!-- Caja -->
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
