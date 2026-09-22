<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import {
  Zap,
  Search,
  X,
  FileText,
  Check,
} from 'lucide-vue-next';
import { http } from '@/api/client';

export interface QuickReplyItem {
  id: number;
  shortcut: string;
  title: string;
  content: string;
  category: 'VENTAS' | 'PAGOS' | 'GENERAL' | 'INFO' | string;
  mediaUrl?: string | null;
}

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'select', text: string): void;
}>();

const quickReplies = ref<QuickReplyItem[]>([]);
const searchQuery = ref('');
const selectedCategory = ref<string>('ALL');
const isLoading = ref(false);

async function loadQuickReplies() {
  isLoading.value = true;
  try {
    const data = await http.get<QuickReplyItem[]>('/crm/quick-replies');
    if (Array.isArray(data)) {
      quickReplies.value = data;
    }
  } catch {
    // Interceptor
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      searchQuery.value = '';
      selectedCategory.value = 'ALL';
      loadQuickReplies();
    }
  }
);

const filteredReplies = computed(() => {
  let list = quickReplies.value;

  if (selectedCategory.value !== 'ALL') {
    list = list.filter((r) => r.category === selectedCategory.value);
  }

  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((r) => {
      const shortcut = (r.shortcut || '').toLowerCase();
      const title = (r.title || '').toLowerCase();
      const content = (r.content || '').toLowerCase();
      return shortcut.includes(q) || title.includes(q) || content.includes(q);
    });
  }

  return list;
});

function handleSelect(text: string) {
  emit('select', text);
  emit('update:open', false);
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[92vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-darkText">
              <Zap class="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                Respuestas Rápidas (Plantillas)
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Selecciona una plantilla oficial para insertar en el chat
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="emit('update:open', false)"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="mt-4 space-y-3">
          <!-- Buscador -->
          <div class="relative w-full">
            <Search class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por atajo (/sabores, /pago) o palabra clave..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
            />
          </div>

          <!-- Categorías -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            <button
              type="button"
              @click="selectedCategory = 'ALL'"
              class="shrink-0 rounded-xl px-2.5 py-1 text-xs font-extrabold transition-all"
              :class="
                selectedCategory === 'ALL'
                  ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                  : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
              "
            >
              Todas
            </button>
            <button
              v-for="cat in ['VENTAS', 'PAGOS', 'GENERAL', 'INFO']"
              :key="cat"
              type="button"
              @click="selectedCategory = cat"
              class="shrink-0 rounded-xl px-2.5 py-1 text-xs font-extrabold transition-all"
              :class="
                selectedCategory === cat
                  ? 'bg-brand-800 text-white shadow-xs dark:bg-brand-900'
                  : 'bg-surface-light-canvas text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:bg-slate-800'
              "
            >
              {{ cat }}
            </button>
          </div>

          <!-- Listado de Plantillas -->
          <div class="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            <div
              v-for="reply in filteredReplies"
              :key="reply.id"
              @click="handleSelect(reply.content)"
              class="cursor-pointer rounded-2xl border border-surface-light-border bg-surface-light-canvas p-3.5 transition-all hover:border-brand-800 hover:bg-brand-50/20 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:hover:border-brand-400 dark:hover:bg-brand-950/20 group"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="rounded-lg bg-brand-100 px-2 py-0.5 text-[11px] font-black text-brand-900 dark:bg-brand-950 dark:text-brand-darkText">
                    {{ reply.shortcut }}
                  </span>
                  <span class="text-xs font-extrabold text-slate-900 dark:text-white">
                    {{ reply.title }}
                  </span>
                </div>

                <span class="inline-flex items-center gap-1 text-[11px] font-bold text-brand-800 opacity-0 group-hover:opacity-100 transition-opacity dark:text-brand-darkText">
                  <Check class="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Usar</span>
                </span>
              </div>

              <p class="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-line font-normal">
                {{ reply.content }}
              </p>
            </div>

            <div
              v-if="filteredReplies.length === 0"
              class="py-8 text-center text-xs font-semibold text-slate-400"
            >
              <FileText class="mx-auto h-8 w-8 text-slate-300 mb-1" />
              No se encontraron plantillas para este filtro.
            </div>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
