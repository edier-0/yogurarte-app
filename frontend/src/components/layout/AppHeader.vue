<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';
import { Sun, Moon, Wifi } from 'lucide-vue-next';

const { isDark, toggleTheme } = useTheme();

defineProps<{
  title?: string;
  subtitle?: string;
}>();
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-surface-light-border bg-surface-light-card/80 px-4 backdrop-blur-md transition-colors dark:border-surface-dark-border dark:bg-surface-dark-card/80 lg:px-6"
  >
    <!-- Brand / View Title -->
    <div class="flex items-center gap-3">
      <div
        class="flex h-10 w-10 items-center justify-center rounded-xl bg-hero-gradient text-white shadow-card"
      >
        <span class="text-xl font-bold font-handwritten">Y</span>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-base font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-lg">
            {{ title || 'YogurArte' }}
          </h1>
          <span
            class="hidden rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-brand-800 dark:bg-brand-darkSurface dark:text-brand-darkText sm:inline-flex"
          >
            Artesanal
          </span>
        </div>
        <p class="text-xs font-medium text-surface-light-muted dark:text-surface-dark-muted">
          {{ subtitle || 'Fonseca, La Guajira' }}
        </p>
      </div>
    </div>

    <!-- Actions / Theme / Status -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Status Badge CRM -->
      <div
        class="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400 md:inline-flex"
      >
        <Wifi class="h-3.5 w-3.5 animate-pulse text-emerald-500" />
        <span>Baileys Online</span>
      </div>

      <!-- Theme Switcher Button -->
      <button
        type="button"
        @click="toggleTheme"
        class="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-canvas text-slate-700 transition-all hover:bg-slate-100 hover:text-brand-800 active:scale-95 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-darkText"
        :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      >
        <Moon v-if="isDark" class="h-4 w-4 text-brand-darkText transition-transform" />
        <Sun v-else class="h-4 w-4 text-amber-500 transition-transform" />
      </button>

      <!-- Active User Profile Avatar -->
      <div class="flex items-center gap-2 pl-1">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 font-bold text-brand-800 shadow-sm dark:border-brand-900 dark:bg-brand-950 dark:text-brand-300"
        >
          <span class="text-sm">YA</span>
        </div>
      </div>
    </div>
  </header>
</template>
