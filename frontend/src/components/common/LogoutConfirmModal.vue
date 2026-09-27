<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import { LogOut, X } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth.store';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const authStore = useAuthStore();

function handleConfirmLogout() {
  emit('update:open', false);
  authStore.logout();
}

function handleCancel() {
  emit('update:open', false);
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal to="body">
      <DialogOverlay class="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-[9999] w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7"
      >
        <div class="flex items-start gap-4">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-500/20"
          >
            <LogOut class="h-6 w-6 stroke-[2]" />
          </div>

          <div class="flex-1">
            <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
              ¿Cerrar Sesión?
            </DialogTitle>
            <DialogDescription class="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              ¿Estás seguro de que deseas salir del sistema de gestión de YogurArte?
            </DialogDescription>
          </div>

          <button
            type="button"
            @click="handleCancel"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Cerrar ventana"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
          <button
            type="button"
            @click="handleCancel"
            class="rounded-xl border border-surface-light-border bg-surface-light-card px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>

          <button
            type="button"
            @click="handleConfirmLogout"
            class="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          >
            <LogOut class="h-4 w-4 stroke-[2]" />
            <span>Sí, Cerrar Sesión</span>
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
