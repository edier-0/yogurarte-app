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
  User,
  Phone,
  MapPin,
  FileText,
  X,
  AlertCircle,
  Save,
  UserPlus,
} from 'lucide-vue-next';
import { useDirectoryStore, type CustomerItem } from '@/stores/directory.store';

const props = defineProps<{
  open: boolean;
  customerToEdit?: CustomerItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const directoryStore = useDirectoryStore();

const fullName = ref('');
const phone = ref('');
const address = ref('');
const neighborhood = ref('');
const notes = ref('');

const isSubmitting = ref(false);
const errorMessage = ref('');

const isEditing = computed(() => !!props.customerToEdit?.id);

// Sincronizar datos al abrir modal
watch(
  () => [props.open, props.customerToEdit],
  ([isOpen]) => {
    if (isOpen) {
      errorMessage.value = '';
      if (props.customerToEdit) {
        fullName.value = props.customerToEdit.fullName || '';
        phone.value = props.customerToEdit.phone || '';
        address.value = props.customerToEdit.address || '';
        neighborhood.value = props.customerToEdit.neighborhood || '';
        notes.value = props.customerToEdit.notes || '';
      } else {
        fullName.value = '';
        phone.value = '';
        address.value = 'Fonseca';
        neighborhood.value = '';
        notes.value = '';
      }
    }
  },
  { immediate: true }
);

const isFormValid = computed(() => {
  return fullName.value.trim().length > 0 && phone.value.trim().length > 0;
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value) {
    errorMessage.value = 'Nombre completo y teléfono/contacto son obligatorios.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await directoryStore.saveCustomer({
      id: props.customerToEdit?.id,
      fullName: fullName.value,
      phone: phone.value,
      address: address.value,
      neighborhood: neighborhood.value,
      notes: notes.value,
    });

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al guardar datos del cliente';
  } finally {
    isSubmitting.value = false;
  }
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
              <UserPlus v-if="!isEditing" class="h-5 w-5 stroke-[2.5]" />
              <User v-else class="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                {{ isEditing ? 'Editar Cliente' : 'Registrar Nuevo Cliente' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Directorio y fidelización de clientes de YogurArte
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="handleClose"
            class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="mt-5 space-y-4">
          <!-- Nombre Completo -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nombre Completo *
            </label>
            <div class="relative">
              <User class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="fullName"
                type="text"
                placeholder="Ej: Carmen Gómez"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Teléfono / WhatsApp -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Teléfono o Contacto WhatsApp *
            </label>
            <div class="relative">
              <Phone class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="phone"
                type="text"
                placeholder="3001234567 o @usuario"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
            <p class="mt-1 text-[11px] font-medium text-slate-400">
              Acepta números telefónicos colombianos (10 dígitos) o identificadores con @.
            </p>
          </div>

          <!-- Dirección y Barrio -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Dirección / Ubicación
              </label>
              <div class="relative">
                <MapPin class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="address"
                  type="text"
                  placeholder="Calle 12 # 4-50"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Barrio / Sector
              </label>
              <input
                v-model="neighborhood"
                type="text"
                placeholder="Centro, El Carmen..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Notas y Preferencias -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notas o Preferencias de Sabor
            </label>
            <div class="relative">
              <FileText class="absolute left-3.5 top-3 h-4 w-4 text-slate-400 stroke-[2]" />
              <textarea
                v-model="notes"
                rows="2"
                placeholder="Ej: Prefiere yogur de melocotón con poca azúcar, entrega en la tarde..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Mensaje de Error -->
          <div
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Botones de Acción -->
          <div class="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              @click="handleClose"
              class="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="!isFormValid || isSubmitting"
              class="inline-flex items-center gap-2 rounded-xl bg-hero-gradient px-5 py-2.5 text-xs font-extrabold text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <Save class="h-4 w-4 stroke-[2.5]" />
              <span>{{ isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Registrar Cliente') }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
