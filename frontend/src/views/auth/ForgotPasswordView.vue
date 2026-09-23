<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, type ForgotPasswordResponse } from '@/stores/auth.store';
import {
  ArrowLeft,
  KeyRound,
  User,
  Hash,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Send,
  Phone,
  MessageCircle,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const authStore = useAuthStore();
const router = useRouter();

// Estado del formulario
const identifier = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

// Estado de respuesta de recuperación
const recoveryData = ref<ForgotPasswordResponse | null>(null);

// Campos para reseteo directo (Solo Admin)
const resetCode = ref('');
const newPassword = ref('');
const showNewPassword = ref(false);
const resetSuccess = ref(false);

async function handleRequestCode() {
  if (!identifier.value.trim()) {
    errorMessage.value = 'Por favor ingresa tu nombre de usuario o correo.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const res = await authStore.forgotPassword(identifier.value.trim());
    recoveryData.value = res;
    if (res.status === 'admin_recovery') {
      toast.success('Código de Seguridad Enviado', {
        description: res.message,
      });
    }
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      'No se encontró ninguna cuenta asociada a este usuario o correo.';
  } finally {
    isSubmitting.value = false;
  }
}

async function handleResetPassword() {
  if (!resetCode.value.trim() || !newPassword.value.trim()) {
    errorMessage.value = 'Debes ingresar el código de verificación y la nueva contraseña.';
    return;
  }

  if (newPassword.value.trim().length < 4) {
    errorMessage.value = 'La nueva contraseña debe contener al menos 4 caracteres.';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    await authStore.resetPassword({
      identifier: identifier.value.trim(),
      resetCode: resetCode.value.trim(),
      newPassword: newPassword.value.trim(),
    });

    resetSuccess.value = true;
    toast.success('¡Contraseña Actualizada!', {
      description: 'Tu clave ha sido modificada con éxito. Ya puedes iniciar sesión.',
    });
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      'Código inválido o expirado. Por favor verifica e intenta nuevamente.';
  } finally {
    isSubmitting.value = false;
  }
}

function handleBackToLogin() {
  router.push('/login');
}
</script>

<template>
  <div class="flex min-h-screen w-full items-center justify-center bg-surface-light-canvas px-4 py-8 dark:bg-surface-dark-canvas sm:px-6">
    <div class="w-full max-w-md space-y-6">
      <div class="rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-8">
        <!-- Botón Volver -->
        <button
          type="button"
          @click="handleBackToLogin"
          class="inline-flex items-center gap-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft class="h-4 w-4" />
          <span>Volver al inicio de sesión</span>
        </button>

        <!-- Encabezado -->
        <div class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <KeyRound class="h-6 w-6 stroke-[2.2]" />
          </div>
          <h1 class="mt-3 text-xl font-black text-slate-900 dark:text-white">
            Recuperar Contraseña
          </h1>
          <p class="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Ingresa tu usuario institucional o correo para restablecer tu clave
          </p>
        </div>

        <!-- PASO 1: Ingreso de Usuario / Identificador -->
        <form
          v-if="!recoveryData && !resetSuccess"
          @submit.prevent="handleRequestCode"
          class="mt-6 space-y-4"
        >
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Usuario o Correo Electrónico *
            </label>
            <div class="relative">
              <User class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="identifier"
                type="text"
                required
                placeholder="edier, yeilin o tu correo"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <div
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-hero-gradient py-3 text-xs font-black uppercase tracking-wider text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
          >
            <Send class="h-4 w-4 stroke-[2.5]" />
            <span>{{ isSubmitting ? 'Consultando...' : 'Verificar Cuenta' }}</span>
          </button>
        </form>

        <!-- PASO 2A: Restablecimiento para Administrador -->
        <div
          v-else-if="recoveryData?.status === 'admin_recovery' && !resetSuccess"
          class="mt-6 space-y-4"
        >
          <div class="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/40 dark:bg-purple-950/20">
            <div class="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-300">
              <ShieldAlert class="h-4 w-4" />
              <span>Cuenta Administrador Identificada</span>
            </div>
            <p class="mt-1 text-xs text-purple-800 dark:text-purple-300/90 leading-relaxed">
              {{ recoveryData.message }}
            </p>
          </div>

          <form @submit.prevent="handleResetPassword" class="space-y-4">
            <!-- Código de 6 dígitos -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Código de Verificación (6 dígitos) *
              </label>
              <div class="relative">
                <Hash class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="resetCode"
                  type="text"
                  maxlength="6"
                  required
                  placeholder="123456"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-center text-base font-black tracking-widest text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
              </div>
            </div>

            <!-- Nueva Contraseña -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nueva Contraseña *
              </label>
              <div class="relative">
                <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input
                  v-model="newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  required
                  placeholder="Mínimo 4 caracteres"
                  class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-10 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
                />
                <button
                  type="button"
                  @click="showNewPassword = !showNewPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabindex="-1"
                >
                  <EyeOff v-if="showNewPassword" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              v-if="errorMessage"
              class="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
            >
              <AlertCircle class="h-4 w-4 shrink-0" />
              <span>{{ errorMessage }}</span>
            </div>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-hero-gradient py-3 text-xs font-black uppercase tracking-wider text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
            >
              <KeyRound class="h-4 w-4 stroke-[2.5]" />
              <span>{{ isSubmitting ? 'Guardando...' : 'Restablecer Contraseña' }}</span>
            </button>
          </form>
        </div>

        <!-- PASO 2B: Mensaje para Colaboradores y Domiciliarios -->
        <div
          v-else-if="recoveryData?.status === 'notify_admin' && !resetSuccess"
          class="mt-6 space-y-4"
        >
          <div class="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <h3 class="text-xs font-bold text-amber-900 dark:text-amber-300">
              Gestión Centralizada de Acceso
            </h3>
            <p class="mt-1 text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
              {{ recoveryData.message }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Contactar a los Administradores
            </p>
            <div
              v-for="admin in recoveryData.admins"
              :key="admin.phone"
              class="flex items-center justify-between rounded-xl border border-surface-light-border bg-surface-light-canvas p-3 dark:border-surface-dark-border dark:bg-surface-dark-canvas"
            >
              <div>
                <p class="text-xs font-extrabold text-slate-900 dark:text-white">
                  {{ admin.name }}
                </p>
                <p class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {{ admin.phone }}
                </p>
              </div>

              <div class="flex items-center gap-1.5">
                <a
                  :href="`https://wa.me/57${admin.phone}?text=Hola%20${encodeURIComponent(admin.name)},%20olvidé%20mi%20contraseña%20de%20YogurArte%20para%20el%20usuario%20${encodeURIComponent(recoveryData.username)}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                  title="Escribir por WhatsApp"
                >
                  <MessageCircle class="h-4 w-4" />
                </a>
                <a
                  :href="`tel:${admin.phone}`"
                  class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="Llamar"
                >
                  <Phone class="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <button
            type="button"
            @click="handleBackToLogin"
            class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Regresar al Inicio de Sesión
          </button>
        </div>

        <!-- PASO 3: Éxito en Restablecimiento -->
        <div v-else-if="resetSuccess" class="mt-6 text-center space-y-4">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 class="h-8 w-8 stroke-[2.2]" />
          </div>
          <h2 class="text-base font-extrabold text-slate-900 dark:text-white">
            ¡Contraseña Restablecida!
          </h2>
          <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
            Tu nueva credencial ya está activa. Inicia sesión con tus nuevos datos de acceso.
          </p>

          <button
            type="button"
            @click="handleBackToLogin"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-hero-gradient py-3 text-xs font-black uppercase tracking-wider text-white shadow-card transition-transform active:scale-95"
          >
            Iniciar Sesión Ahora
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
