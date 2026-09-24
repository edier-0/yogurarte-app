<script setup lang="ts">
import { computed, onErrorCaptured } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Toaster, toast } from 'vue-sonner';
import { useTheme } from '@/composables/useTheme';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';

const { isDark } = useTheme();
const route = useRoute();
const router = useRouter();

// Blindaje contra errores de renderizado en vistas hijas (evita que la pantalla quede en blanco)
onErrorCaptured((err) => {
  console.error('[Vue Boundary] Error capturado en la vista:', err);
  return false;
});

const isAuthLayout = computed(() => {
  return route.meta?.layout === 'auth';
});

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
  <!-- Layout para Pantallas de Autenticación (Login / Recuperar Contraseña) -->
  <div
    v-if="isAuthLayout"
    class="min-h-screen w-full bg-surface-light-canvas dark:bg-surface-dark-canvas transition-colors"
  >
    <RouterView v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>

    <!-- Global Toast Container (Vue Sonner) -->
    <Toaster
      position="top-right"
      :theme="isDark ? 'dark' : 'light'"
      rich-colors
      close-button
    />
  </div>

  <!-- Layout Estándar de la Aplicación (Sidebar, Header, Main, BottomNav) -->
  <div
    v-else
    class="flex min-h-screen w-full bg-surface-light-canvas dark:bg-surface-dark-canvas transition-colors"
  >
    <!-- Desktop Sidebar (4 Domains + Dashboard) -->
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

  <!-- Diálogo de Confirmación Asíncrono Global -->
  <ConfirmModal />
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
