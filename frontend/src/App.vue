<script setup lang="ts">
import { computed, onErrorCaptured } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Toaster, toast } from 'vue-sonner';
import { useTheme } from '@/composables/useTheme';
import AppLayout from '@/layouts/AppLayout.vue';
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
