<script setup lang="ts">
import { computed } from 'vue';
import {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from 'reka-ui';
import {
  AlertTriangle,
  Trash2,
  HelpCircle,
  X,
} from 'lucide-vue-next';
import { useConfirm } from '@/composables/useConfirm';

const { isOpen, options, handleConfirm, handleCancel } = useConfirm();

const iconComponent = computed(() => {
  if (options.value.variant === 'warning') return AlertTriangle;
  if (options.value.variant === 'info') return HelpCircle;
  return Trash2;
});

const iconStyle = computed(() => {
  if (options.value.variant === 'warning') {
    return 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20';
  }
  if (options.value.variant === 'info') {
    return 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-500/20';
  }
  return 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-500/20';
});

const confirmButtonStyle = computed(() => {
  if (options.value.variant === 'warning') {
    return 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm focus:ring-2 focus:ring-amber-500 focus:ring-offset-2';
  }
  if (options.value.variant === 'info') {
    return 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm focus:ring-2 focus:ring-purple-500 focus:ring-offset-2';
  }
  return 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-2 focus:ring-rose-500 focus:ring-offset-2';
});
</script>

<template>
  <AlertDialogRoot :open="isOpen" @update:open="(val: boolean) => !val && handleCancel()">
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <AlertDialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all focus:outline-none dark:border-slate-700/80 dark:bg-slate-900 sm:p-7"
      >
        <div class="flex items-start gap-4">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            :class="iconStyle"
          >
            <component :is="iconComponent" class="h-6 w-6 stroke-[2]" />
          </div>

          <div class="flex-1">
            <AlertDialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
              {{ options.title }}
            </AlertDialogTitle>
            <AlertDialogDescription class="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              {{ options.message }}
            </AlertDialogDescription>
          </div>

          <button
            type="button"
            @click="handleCancel"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <AlertDialogCancel
            @click="handleCancel"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/70"
          >
            {{ options.cancelText }}
          </AlertDialogCancel>

          <AlertDialogAction
            @click="handleConfirm"
            class="rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95"
            :class="confirmButtonStyle"
          >
            {{ options.confirmText }}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
