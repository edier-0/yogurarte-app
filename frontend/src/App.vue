<script setup lang="ts">
import { computed, onErrorCaptured } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Toaster } from 'vue-sonner';
import { useTheme } from '@/composables/useTheme';
import AppLayout from '@/layouts/AppLayout.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import WhatsAppMessagePreviewModal from '@/components/operations/crm/WhatsAppMessagePreviewModal.vue';
import { useOperationsStore } from '@/stores/operations.store';

const { isDark } = useTheme();
const route = useRoute();
const router = useRouter();
const operationsStore = useOperationsStore();

// Blindaje contra errores de renderizado en vistas hijas (evita que la pantalla quede en blanco)
onErrorCaptured((err) => {
  console.error('[Vue Boundary] Error capturado en la vista:', err);
  return false;
});

const isAuthLayout = computed(() => {
  return (
    route.meta?.layout === 'auth' ||
    route.path === '/login' ||
    route.path === '/recuperar' ||
    route.path === '/forgot-password' ||
    (typeof window !== 'undefined' &&
      (window.location.pathname === '/login' ||
        window.location.pathname.startsWith('/login') ||
        window.location.pathname === '/recuperar' ||
        window.location.pathname.startsWith('/recuperar')))
  );
});

const headerTitle = computed(() => {
  return (route.meta?.title as string) || 'YogurArte';
});

const headerSubtitle = computed(() => {
  return (route.meta?.domain as string) || 'Operaciones';
});

const onNewOrder = () => {
  operationsStore.openCreateOrderModal();
  if (route.path === '/operaciones/pedidos') {
    if (route.query.new !== 'true') {
      router.replace({ path: '/operaciones/pedidos', query: { new: 'true' } });
    }
  } else {
    router.push({ path: '/operaciones/pedidos', query: { new: 'true' } });
  }
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
  </div>

  <!-- Layout Estándar de la Aplicación (Sidebar Fijo en Escritorio y Scroll Independiente en Main) -->
  <AppLayout
    v-else
    :header-title="headerTitle"
    :header-subtitle="headerSubtitle"
    @new-order="onNewOrder"
  >
    <RouterView v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>
  </AppLayout>

  <!-- Global Toast Container (Vue Sonner) -->
  <Toaster
    position="top-right"
    :theme="isDark ? 'dark' : 'light'"
    rich-colors
    close-button
  />

  <!-- Diálogo de Confirmación Asíncrono Global -->
  <ConfirmModal />

  <!-- Diálogo Global de Previsualización y Edición de Mensajes de WhatsApp -->
  <WhatsAppMessagePreviewModal />
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
