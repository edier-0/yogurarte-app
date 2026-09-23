<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Check,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const isSubmitting = ref(false);
const loginError = ref('');

onMounted(async () => {
  await authStore.fetchPublicUsers();
});

function selectUser(userItem: { username: string }) {
  username.value = userItem.username;
  loginError.value = '';
}

async function handleLogin() {
  if (!username.value.trim() || !password.value.trim()) {
    loginError.value = 'Por favor ingresa tu usuario y contraseña.';
    return;
  }

  isSubmitting.value = true;
  loginError.value = '';

  try {
    const res = await authStore.login(username.value.trim(), password.value.trim());
    toast.success('¡Bienvenido a YogurArte!', {
      description: `Sesión iniciada como ${res.user.name} (${res.user.role}).`,
    });

    const redirectPath = (route.query.redirect as string) || authStore.getHomeRouteForRole(res.user.role);
    router.push(redirectPath);
  } catch (err: any) {
    loginError.value =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      'Credenciales incorrectas. Verifica tu usuario y contraseña.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen w-full items-center justify-center bg-surface-light-canvas px-4 py-8 dark:bg-surface-dark-canvas sm:px-6">
    <div class="w-full max-w-md space-y-6">
      <!-- Tarjeta Institucional de Login -->
      <div class="rounded-3xl border border-surface-light-border bg-surface-light-card p-6 shadow-2xl dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-8">
        <!-- Encabezado con Logotipo YogurArte -->
        <div class="text-center">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-hero-gradient text-white shadow-card">
            <span class="text-3xl font-bold font-handwritten">Y</span>
          </div>
          <h1 class="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            YogurArte
          </h1>
          <p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Sistema Operativo Integral • Fonseca, La Guajira
          </p>
        </div>

        <!-- Selector Rápido de Usuarios Públicos -->
        <div v-if="authStore.publicUsers.length > 0" class="mt-6">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Acceso Rápido de Usuarios
          </label>
          <div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pb-1">
            <button
              v-for="u in authStore.publicUsers"
              :key="u.id"
              type="button"
              @click="selectUser(u)"
              class="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95"
              :class="[
                username.toLowerCase() === u.username.toLowerCase()
                  ? 'border-brand-800 bg-brand-50 text-brand-800 dark:border-brand-500 dark:bg-brand-950/60 dark:text-brand-300'
                  : 'border-surface-light-border bg-surface-light-canvas text-slate-700 hover:border-slate-300 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-300 dark:hover:border-slate-600'
              ]"
            >
              <Check v-if="username.toLowerCase() === u.username.toLowerCase()" class="h-3.5 w-3.5 stroke-[2.5]" />
              <User v-else class="h-3.5 w-3.5 text-slate-400 stroke-[2]" />
              <span>{{ u.name.split(' ')[0] }}</span>
              <span class="rounded px-1 text-[9px] font-extrabold uppercase opacity-80" :class="u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'">
                {{ u.role }}
              </span>
            </button>
          </div>
        </div>

        <!-- Formulario -->
        <form @submit.prevent="handleLogin" class="mt-6 space-y-4">
          <!-- Campo Usuario -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nombre de Usuario *
            </label>
            <div class="relative">
              <User class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                required
                placeholder="edier, yeilin, etc."
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-3.5 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
            </div>
          </div>

          <!-- Campo Contraseña -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Contraseña *
              </label>
              <RouterLink
                to="/recuperar"
                class="text-[11px] font-bold text-brand-800 hover:underline dark:text-brand-darkText"
              >
                ¿Olvidaste tu contraseña?
              </RouterLink>
            </div>
            <div class="relative">
              <Lock class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 stroke-[2]" />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="••••••••"
                class="w-full rounded-xl border border-surface-light-border bg-surface-light-canvas py-2.5 pl-10 pr-10 text-xs font-bold text-slate-900 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                tabindex="-1"
                :title="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
              >
                <EyeOff v-if="showPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Mensaje de Error -->
          <div
            v-if="loginError"
            class="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
          >
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>{{ loginError }}</span>
          </div>

          <!-- Botón de Envío -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-hero-gradient py-3 text-xs font-black uppercase tracking-wider text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
          >
            <LogIn class="h-4 w-4 stroke-[2.5]" />
            <span>{{ isSubmitting ? 'Iniciando sesión...' : 'Entrar al Sistema' }}</span>
          </button>
        </form>

        <!-- Enlace institucional inferior -->
        <div class="mt-6 border-t border-surface-light-border pt-4 text-center dark:border-surface-dark-border">
          <div class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <ShieldCheck class="h-3.5 w-3.5 text-emerald-500 stroke-[2]" />
            <span>Sesión protegida con cifrado JWT y Bcrypt</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
