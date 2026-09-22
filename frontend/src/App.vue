<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Toaster, toast } from 'vue-sonner';
import { useTheme } from '@/composables/useTheme';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue';

const { isDark } = useTheme();
const route = useRoute();
const router = useRouter();

const headerTitle = computed(() => {
  return (route.meta?.title as string) || 'YogurArte';
});

const headerSubtitle = computed(() => {
  const domain = (route.meta?.domain as string) || 'Sistema Operativo Integral';
  return `${domain} • Vue 3 & TypeScript`;
});

const onNewOrder = () => {
  router.push('/operaciones/pedidos');
  toast.success('Crear Nuevo Pedido', {
    description: 'Formulario de comanda rápida listo para ingresar datos.',
  });
};
</script>

<template>
  <div class="flex min-h-screen w-full bg-surface-light-canvas dark:bg-surface-dark-canvas transition-colors">
    <!-- Desktop Sidebar (4 Domains) -->
    <AppSidebar />

    <!-- Main Content Area -->
    <div class="flex flex-1 flex-col overflow-hidden pb-20 lg:pb-0">
      <!-- Sticky Top Header with dynamic title -->
      <AppHeader
        :title="headerTitle"
        :subtitle="headerSubtitle"
      />

      <!-- Dynamic Workspace / View Container -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div class="mx-auto max-w-7xl">
          <RouterView v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </RouterView>
        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <MobileBottomNav @new-order="onNewOrder" />

    <!-- Global Toast Container (Vue Sonner) -->
    <Toaster
      position="top-right"
      :theme="isDark ? 'dark' : 'light'"
      rich-colors
      close-button
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
