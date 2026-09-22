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
  Crown,
  HardHat,
  BadgeDollarSign,
  Smartphone,
  X,
  AlertCircle,
  Save,
  UserPlus,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';

export interface StaffMemberItem {
  id: number;
  fullName: string;
  phone?: string | null;
  role?: string | null;
  type: 'SOCIO' | 'EMPLEADO';
  paymentScheme: string;
  defaultRate: number;
  bankInfo?: string | null;
  isActive: boolean;
  payments?: Array<{
    id: number;
    amount: number;
    netAmount: number;
    paymentDate: string;
    paymentType: string;
  }>;
}

const props = defineProps<{
  open: boolean;
  staffToEdit?: StaffMemberItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const fullName = ref('');
const phone = ref('');
const role = ref('Colaborador de Producción');
const type = ref<'SOCIO' | 'EMPLEADO'>('EMPLEADO');
const paymentScheme = ref('JORNAL');
const defaultRate = ref<number | ''>(50000);
const bankInfo = ref('');

const isSubmitting = ref(false);
const errorMessage = ref('');

const isEditing = computed(() => !!props.staffToEdit?.id);

watch(
  () => [props.open, props.staffToEdit],
  ([isOpen]) => {
    if (isOpen) {
      errorMessage.value = '';
      if (props.staffToEdit) {
        fullName.value = props.staffToEdit.fullName || '';
        phone.value = props.staffToEdit.phone || '';
        role.value = props.staffToEdit.role || 'Colaborador';
        type.value = props.staffToEdit.type || 'EMPLEADO';
        paymentScheme.value = props.staffToEdit.paymentScheme || 'JORNAL';
        defaultRate.value = props.staffToEdit.defaultRate ?? 50000;
        bankInfo.value = props.staffToEdit.bankInfo || '';
      } else {
        fullName.value = '';
        phone.value = '';
        role.value = 'Colaborador de Producción';
        type.value = 'EMPLEADO';
        paymentScheme.value = 'JORNAL';
        defaultRate.value = 50000;
        bankInfo.value = '';
      }
    }
  },
  { immediate: true }
);

const isFormValid = computed(() => {
  return fullName.value.trim().length > 0;
});

function handleClose() {
  emit('update:open', false);
  errorMessage.value = '';
}

async function handleSubmit() {
  if (!isFormValid.value) {
    errorMessage.value = 'El nombre completo es obligatorio.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const payload = {
      fullName: fullName.value.trim(),
      phone: phone.value.trim() || null,
      role: role.value.trim() || 'Colaborador',
      type: type.value,
      paymentScheme: paymentScheme.value,
      defaultRate: Number(defaultRate.value) || 0,
      bankInfo: bankInfo.value.trim() || null,
    };

    if (props.staffToEdit?.id) {
      await http.put(`/staff/${props.staffToEdit.id}`, payload);
      toast.success('Integrante Actualizado', {
        description: `Se guardaron los datos de ${payload.fullName}.`,
      });
    } else {
      await http.post('/staff', payload);
      toast.success('Integrante Registrado', {
        description: `${payload.fullName} ha sido añadido al equipo de YogurArte.`,
      });
    }

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al guardar el integrante';
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
                {{ isEditing ? 'Editar Integrante' : 'Registrar Nuevo Integrante' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Equipo de colaboradores, socios y tarifas operativas
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
          <!-- Tipo de Integrante (Socio vs Colaborador) -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tipo de Integrante *
            </label>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                @click="type = 'EMPLEADO'"
                class="flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-extrabold transition-all"
                :class="
                  type === 'EMPLEADO'
                    ? 'border-brand-800 bg-brand-50 text-brand-800 shadow-xs dark:border-brand-400 dark:bg-brand-950/40 dark:text-brand-darkText'
                    : 'border-surface-light-border bg-surface-light-canvas text-slate-600 hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400'
                "
              >
                <HardHat class="h-4 w-4 stroke-[2]" />
                <span>Colaborador</span>
              </button>

              <button
                type="button"
                @click="type = 'SOCIO'"
                class="flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-extrabold transition-all"
                :class="
                  type === 'SOCIO'
                    ? 'border-amber-600 bg-amber-50 text-amber-700 shadow-xs dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-surface-light-border bg-surface-light-canvas text-slate-600 hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400'
                "
              >
                <Crown class="h-4 w-4 stroke-[2]" />
                <span>Socio / Dueño</span>
              </button>
            </div>
          </div>

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
                placeholder="Ej: José Martínez"
                required
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Teléfono y Rol -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Teléfono de Contacto
              </label>
              <div class="relative">
                <Phone class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="phone"
                  type="text"
                  placeholder="3001234567"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cargo u Ocupación
              </label>
              <input
                v-model="role"
                type="text"
                placeholder="Ej: Maestro Yogurtero, Domiciliario"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Esquema de Pago y Tarifa Base -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Esquema de Pago
              </label>
              <select
                v-model="paymentScheme"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              >
                <option value="JORNAL">Jornal Diario de Producción</option>
                <option value="POR_ENTREGA">Por Entrega / Domicilio</option>
                <option value="FIJO">Fijo Quincenal / Mensual</option>
                <option value="LIBRE">Libre / Retiro Por Necesidad</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tarifa Base sugerida ($ COP)
              </label>
              <div class="relative">
                <BadgeDollarSign class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model.number="defaultRate"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="50000"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-extrabold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>
          </div>

          <!-- Información Bancaria / Nequi Personal -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Datos para Pago (Nequi / Bancolombia / Efectivo)
            </label>
            <div class="relative">
              <Smartphone class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="bankInfo"
                type="text"
                placeholder="Ej: Nequi 3123456789 a nombre de ..."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Error Alert -->
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
              <span>{{ isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Registrar Integrante') }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
