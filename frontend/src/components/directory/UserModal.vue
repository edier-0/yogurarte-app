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
  AtSign,
  Lock,
  KeyRound,
  Shield,
  Crown,
  HardHat,
  ShoppingBag,
  Truck,
  Phone,
  Mail,
  Smartphone,
  X,
  AlertCircle,
  Save,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { toast } from 'vue-sonner';

export interface UserItem {
  id: number;
  name: string;
  username: string;
  role: string;
  phone?: string | null;
  email?: string | null;
  bankInfo?: string | null;
  isActive: boolean;
  createdAt?: string;
}

const props = defineProps<{
  open: boolean;
  userToEdit?: UserItem | null;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'saved'): void;
}>();

const name = ref('');
const username = ref('');
const password = ref('');
const pin = ref('1234');
const role = ref('VENTAS');
const phone = ref('');
const email = ref('');
const bankInfo = ref('');
const isActive = ref(true);

const showPassword = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');

const isEditing = computed(() => !!props.userToEdit?.id);

const availableRoles = [
  { value: 'ADMIN', label: 'Admin', desc: 'Acceso Total', icon: Shield, color: 'amber' },
  { value: 'SOCIO', label: 'Socio', desc: 'Socio / Dueño', icon: Crown, color: 'purple' },
  { value: 'OPERADOR', label: 'Operador', desc: 'Producción / Planta', icon: HardHat, color: 'brand' },
  { value: 'VENTAS', label: 'Ventas', desc: 'Pedidos y CRM', icon: ShoppingBag, color: 'emerald' },
  { value: 'DOMICILIARIO', label: 'Reparto', desc: 'Rutas y Entregas', icon: Truck, color: 'blue' },
];

watch(
  () => [props.open, props.userToEdit],
  ([isOpen]) => {
    if (isOpen) {
      errorMessage.value = '';
      showPassword.value = false;
      if (props.userToEdit) {
        name.value = props.userToEdit.name || '';
        username.value = props.userToEdit.username || '';
        password.value = ''; // En edición se deja vacío si no se desea cambiar
        pin.value = '1234';
        role.value = props.userToEdit.role || 'VENTAS';
        phone.value = props.userToEdit.phone || '';
        email.value = props.userToEdit.email || '';
        bankInfo.value = props.userToEdit.bankInfo || '';
        isActive.value = props.userToEdit.isActive !== false;
      } else {
        name.value = '';
        username.value = '';
        password.value = '';
        pin.value = '1234';
        role.value = 'VENTAS';
        phone.value = '';
        email.value = '';
        bankInfo.value = '';
        isActive.value = true;
      }
    }
  },
  { immediate: true }
);

const isFormValid = computed(() => {
  const hasName = name.value.trim().length > 0;
  const hasUsername = username.value.trim().length >= 3;
  if (!isEditing.value) {
    return hasName && hasUsername && password.value.trim().length >= 4;
  }
  return hasName && hasUsername;
});

function handleClose() {
  emit('update:open', false);
}

async function handleSubmit() {
  if (!isFormValid.value || isSubmitting.value) return;

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    if (isEditing.value && props.userToEdit?.id) {
      const payload: Record<string, any> = {
        name: name.value.trim(),
        username: username.value.trim().toLowerCase(),
        role: role.value,
        pin: pin.value.trim() || '1234',
        phone: phone.value.trim() || null,
        email: email.value.trim().toLowerCase() || null,
        bankInfo: bankInfo.value.trim() || null,
        isActive: isActive.value,
      };

      if (password.value.trim().length > 0) {
        payload.password = password.value.trim();
      }

      await http.put(`/users/${props.userToEdit.id}`, payload);
      toast.success(`Usuario "${name.value}" actualizado correctamente`);
    } else {
      const payload = {
        name: name.value.trim(),
        username: username.value.trim().toLowerCase(),
        password: password.value.trim(),
        pin: pin.value.trim() || '1234',
        role: role.value,
        phone: phone.value.trim() || null,
        email: email.value.trim().toLowerCase() || null,
        bankInfo: bankInfo.value.trim() || null,
        isActive: isActive.value,
      };

      await http.post('/users', payload);
      toast.success(`Usuario "${name.value}" creado exitosamente`);
    }

    emit('saved');
    handleClose();
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      'Ocurrió un error al procesar la solicitud';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(val: boolean) => !val && handleClose()">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity" />

      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-7 max-h-[92vh] overflow-y-auto [scrollbar-width:thin]"
      >
        <!-- Cabecera -->
        <div class="flex items-start justify-between gap-3 border-b border-surface-light-border pb-4 dark:border-surface-dark-border">
          <div class="flex items-center gap-3">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs"
              :class="isEditing ? 'bg-amber-600' : 'bg-hero-gradient'"
            >
              <UserPlus v-if="!isEditing" class="h-5 w-5 stroke-[2.5]" />
              <Shield v-else class="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle class="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                {{ isEditing ? 'Editar Usuario del Sistema' : 'Nuevo Usuario del Sistema' }}
              </DialogTitle>
              <DialogDescription class="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {{ isEditing ? 'Modifica credenciales, rol y estado de la cuenta' : 'Registra una nueva cuenta con rol y credenciales de acceso' }}
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            @click="handleClose"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Formulario -->
        <form @submit.prevent="handleSubmit" class="mt-5 space-y-4">
          <!-- Nombre Completo y Usuario -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre Completo *
              </label>
              <div class="relative">
                <User class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="name"
                  type="text"
                  placeholder="Ej: Yeilin Gómez"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Usuario (Login) *
              </label>
              <div class="relative">
                <AtSign class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="username"
                  type="text"
                  placeholder="ej: yeilin"
                  required
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white lowercase"
                />
              </div>
            </div>
          </div>

          <!-- Selector de Rol del Sistema -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Rol y Nivel de Acceso *
            </label>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                v-for="r in availableRoles"
                :key="r.value"
                type="button"
                @click="role = r.value"
                class="flex flex-col items-start rounded-2xl border p-2.5 text-left transition-all"
                :class="
                  role === r.value
                    ? 'border-brand-800 bg-brand-50/70 shadow-xs dark:border-brand-600 dark:bg-brand-950/40'
                    : 'border-surface-light-border bg-surface-light-canvas hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas'
                "
              >
                <div class="flex items-center gap-1.5 w-full justify-between">
                  <div class="flex items-center gap-1.5">
                    <component
                      :is="r.icon"
                      class="h-4 w-4 stroke-[2]"
                      :class="role === r.value ? 'text-brand-800 dark:text-brand-darkText' : 'text-slate-400'"
                    />
                    <span
                      class="text-xs font-black"
                      :class="role === r.value ? 'text-brand-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'"
                    >
                      {{ r.label }}
                    </span>
                  </div>
                  <CheckCircle2
                    v-if="role === r.value"
                    class="h-3.5 w-3.5 text-brand-800 dark:text-brand-darkText"
                  />
                </div>
                <span class="mt-1 text-[10px] font-semibold text-slate-400">
                  {{ r.desc }}
                </span>
              </button>
            </div>
          </div>

          <!-- Contraseña y PIN -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {{ isEditing ? 'Nueva Contraseña (opcional)' : 'Contraseña de Acceso *' }}
              </label>
              <div class="relative">
                <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  :placeholder="isEditing ? 'Sin cambios' : 'Mínimo 4 caracteres'"
                  :required="!isEditing"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-10 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <EyeOff v-if="showPassword" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                PIN Rápido (4 dígitos)
              </label>
              <div class="relative">
                <KeyRound class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="pin"
                  type="text"
                  maxlength="6"
                  placeholder="1234"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>
          </div>

          <!-- Teléfono y Correo -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Teléfono
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
                Correo Electrónico
              </label>
              <div class="relative">
                <Mail class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="email"
                  type="email"
                  placeholder="usuario@yogurarte.com"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>
          </div>

          <!-- Información Bancaria / Nequi -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Datos de Pago / Nequi / Cuenta
            </label>
            <div class="relative">
              <Smartphone class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="bankInfo"
                type="text"
                placeholder="Ej: Nequi 3147464663"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Estado de la Cuenta (Activo / Inactivo) -->
          <div class="flex items-center justify-between rounded-2xl border border-surface-light-border bg-surface-light-canvas p-3 dark:border-surface-dark-border dark:bg-surface-dark-canvas">
            <div>
              <span class="block text-xs font-bold text-slate-900 dark:text-white">
                Cuenta Activa
              </span>
              <span class="block text-[11px] font-semibold text-slate-400">
                {{ isActive ? 'El usuario puede autenticarse y operar el sistema' : 'El acceso de este usuario está suspendido' }}
              </span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="isActive"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-800"></div>
            </label>
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
          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-light-border dark:border-surface-dark-border">
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
              <span>{{ isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Usuario') }}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
