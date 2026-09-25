<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import MobileBottomNav from '@/components/layout/MobileBottomNav.vue';

defineProps<{
  headerTitle: string;
  headerSubtitle: string;
}>();

const emit = defineEmits<{
  (e: 'new-order'): void;
}>();
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
    <!-- Desktop Sidebar Fijo -->
    <AppSidebar />

    <!-- Main Content Area con Scroll Independiente -->
    <div class="flex flex-1 flex-col h-screen overflow-hidden pb-20 lg:pb-0">
      <!-- Sticky Top Header -->
      <AppHeader
        :title="headerTitle"
        :subtitle="headerSubtitle"
      />

      <!-- Área Principal con Scroll Exclusivo -->
      <main class="flex-1 h-screen overflow-y-auto p-4 md:p-6 lg:p-8">
        <div class="mx-auto max-w-7xl">
          <slot />
        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <MobileBottomNav @new-order="emit('new-order')" />
  </div>
</template>
