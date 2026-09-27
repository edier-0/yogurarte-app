<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'reka-ui';
import {
  LayoutDashboard,
  ShoppingBag,
  Bike,
  MessageCircle,
  FlaskConical,
  Boxes,
  Wallet,
  Receipt,
  Users,
  Briefcase,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth.store';
import LogoutConfirmModal from '@/components/common/LogoutConfirmModal.vue';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
}>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isLogoutModalOpen = ref(false);

const userInitials = computed(() => {
  const name = authStore.user?.name;
  if (!name) return 'YA';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
});

const isItemActive = (path: string) => {
  return route.path === path || (path !== '/' && route.path.startsWith(path));
};

function handleNavigate(path: string) {
  emit('update:open', false);
  router.push(path);
}

function handleOpenLogout() {
  emit('update:open', false);
  isLogoutModalOpen.value = true;
}
</script>

<template>
  <div>
    <DialogRoot :open="open" @update:open="(val: boolean) => emit('update:open', val)">
      <DialogPortal to="body">
        <!-- Backdrop oscuro translúcido -->
        <DialogOverlay
          class="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        />

        <!-- Contenedor Lateral Deslizante (Sheet / Drawer) -->
        <DialogContent
          class="fixed inset-y-0 left-0 z-[9995] flex w-[85%] max-w-xs flex-col border-r border-surface-light-border bg-surface-light-card shadow-2xl transition-transform duration-300 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card"
        >
          <DialogTitle class="sr-only">Menú de Navegación del Sistema</DialogTitle>
          <DialogDescription class="sr-only">
            Estructura completa de módulos operativos, productivos y administrativos de YogurArte
          </DialogDescription>

          <!-- Cabecera del Drawer con Marca y Perfil -->
          <div
            class="flex items-center justify-between border-b border-surface-light-border p-4 dark:border-surface-dark-border"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-hero-gradient text-white shadow-card"
              >
                <span class="text-xl font-bold font-handwritten">Y</span>
              </div>
              <div>
                <span class="block text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                  YogurArte
                </span>
                <span class="block text-[10px] font-bold text-brand-800 dark:text-brand-darkText">
                  Sistema Operativo Integral
                </span>
              </div>
            </div>

            <!-- Botón Cerrar Drawer -->
            <button
              type="button"
              @click="emit('update:open', false)"
              class="flex h-8 w-8 items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-canvas text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Cerrar menú"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Tarjeta de Usuario Activo -->
          <div
            class="mx-3 mt-3 flex items-center justify-between rounded-2xl border border-surface-light-border bg-surface-light-canvas p-3 dark:border-surface-dark-border dark:bg-surface-dark-canvas"
          >
            <div class="flex items-center gap-2.5">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 font-bold text-brand-800 shadow-xs dark:border-brand-900 dark:bg-brand-950 dark:text-brand-300"
              >
                <span class="text-xs font-black">{{ userInitials }}</span>
              </div>
              <div class="min-w-0">
                <p class="truncate text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                  {{ authStore.user?.name || 'Usuario' }}
                </p>
                <span
                  class="mt-0.5 inline-block rounded bg-brand-50 px-1.5 py-0.2 text-[9px] font-black uppercase text-brand-800 dark:bg-brand-950 dark:text-brand-300"
                >
                  {{ authStore.user?.role || 'Invitado' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Lista de Navegación con Scroll Independiente -->
          <nav class="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            <!-- 1. MÉTRICAS -->
            <div v-if="authStore.isAdmin" class="space-y-1">
              <span
                class="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                Métricas
              </span>
              <button
                type="button"
                @click="handleNavigate('/dashboard')"
                class="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all text-left"
                :class="[
                  isItemActive('/dashboard')
                    ? 'bg-brand-50 text-brand-800 shadow-xs dark:bg-brand-darkSurface dark:text-brand-darkText'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <LayoutDashboard
                    class="h-4 w-4 shrink-0 transition-colors"
                    :class="
                      isItemActive('/dashboard')
                        ? 'text-brand-800 dark:text-brand-darkText'
                        : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500'
                    "
                  />
                  <span>Panel Analítico</span>
                </div>
                <span
                  class="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-black uppercase text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                >
                  KPIs
                </span>
              </button>
            </div>

            <!-- 2. OPERACIONES -->
            <div class="space-y-1">
              <span
                class="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                Operaciones
              </span>
              <button
                type="button"
                @click="handleNavigate('/operaciones/pedidos')"
                class="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left"
                :class="[
                  isItemActive('/operaciones/pedidos')
                    ? 'bg-brand-50 text-brand-800 shadow-xs dark:bg-brand-darkSurface dark:text-brand-darkText'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <ShoppingBag class="h-4 w-4 shrink-0" />
                  <span>Pedidos y Ventas</span>
                </div>
                <span
                  class="rounded-full bg-accent-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white"
                >
                  Hoy
                </span>
              </button>

              <button
                v-if="authStore.isAdmin || authStore.isDriver"
                type="button"
                @click="handleNavigate('/operaciones/domicilios')"
                class="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left"
                :class="[
                  isItemActive('/operaciones/domicilios')
                    ? 'bg-brand-50 text-brand-800 shadow-xs dark:bg-brand-darkSurface dark:text-brand-darkText'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <Bike class="h-4 w-4 shrink-0" />
                  <span>Rutas de Domicilio</span>
                </div>
              </button>

              <button
                v-if="authStore.isAdmin"
                type="button"
                @click="handleNavigate('/operaciones/crm')"
                class="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left"
                :class="[
                  isItemActive('/operaciones/crm')
                    ? 'bg-brand-50 text-brand-800 shadow-xs dark:bg-brand-darkSurface dark:text-brand-darkText'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <MessageCircle class="h-4 w-4 shrink-0" />
                  <span>CRM WhatsApp</span>
                </div>
                <span
                  class="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white"
                >
                  En Vivo
                </span>
              </button>
            </div>

            <!-- 3. PLANTA & PRODUCCIÓN -->
            <div v-if="authStore.isAdmin || authStore.isOperator" class="space-y-1">
              <span
                class="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                Planta & Producción
              </span>
              <button
                type="button"
                @click="handleNavigate('/produccion/lotes')"
                class="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left"
                :class="[
                  isItemActive('/produccion/lotes')
                    ? 'bg-brand-50 text-brand-800 shadow-xs dark:bg-brand-darkSurface dark:text-brand-darkText'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <FlaskConical class="h-4 w-4 shrink-0" />
                  <span>Lotes y Rendimiento</span>
                </div>
                <ChevronRight class="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              </button>

              <button
                type="button"
                @click="handleNavigate('/produccion/inventario')"
                class="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left"
                :class="[
                  isItemActive('/produccion/inventario')
                    ? 'bg-brand-50 text-brand-800 shadow-xs dark:bg-brand-darkSurface dark:text-brand-darkText'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <Boxes class="h-4 w-4 shrink-0" />
                  <span>Materia Prima e Insumos</span>
                </div>
                <ChevronRight class="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              </button>
            </div>

            <!-- 4. FINANZAS -->
            <div v-if="authStore.isAdmin" class="space-y-1">
              <span
                class="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                Finanzas
              </span>
              <button
                type="button"
                @click="handleNavigate('/finanzas/caja')"
                class="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left"
                :class="[
                  isItemActive('/finanzas/caja')
                    ? 'bg-brand-50 text-brand-800 shadow-xs dark:bg-brand-darkSurface dark:text-brand-darkText'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <Wallet class="h-4 w-4 shrink-0" />
                  <span>Control de Caja</span>
                </div>
                <ChevronRight class="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              </button>

              <button
                type="button"
                @click="handleNavigate('/finanzas/gastos')"
                class="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left"
                :class="[
                  isItemActive('/finanzas/gastos')
                    ? 'bg-brand-50 text-brand-800 shadow-xs dark:bg-brand-darkSurface dark:text-brand-darkText'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <Receipt class="h-4 w-4 shrink-0" />
                  <span>Gastos y Compras</span>
                </div>
                <ChevronRight class="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              </button>
            </div>

            <!-- 5. DIRECTORIO & GESTIÓN -->
            <div v-if="authStore.isAdmin" class="space-y-1">
              <span
                class="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                Directorio & Gestión
              </span>
              <button
                type="button"
                @click="handleNavigate('/directorio/clientes')"
                class="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left"
                :class="[
                  isItemActive('/directorio/clientes')
                    ? 'bg-brand-50 text-brand-800 shadow-xs dark:bg-brand-darkSurface dark:text-brand-darkText'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <Users class="h-4 w-4 shrink-0" />
                  <span>Clientes Frecuentes</span>
                </div>
                <ChevronRight class="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              </button>

              <button
                type="button"
                @click="handleNavigate('/directorio/personal')"
                class="group flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-left"
                :class="[
                  isItemActive('/directorio/personal')
                    ? 'bg-brand-50 text-brand-800 shadow-xs dark:bg-brand-darkSurface dark:text-brand-darkText'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
                ]"
              >
                <div class="flex items-center gap-2.5">
                  <Briefcase class="h-4 w-4 shrink-0" />
                  <span>Nómina y Personal</span>
                </div>
                <ChevronRight class="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              </button>
            </div>
          </nav>

          <!-- Pie del Menú con Cerrar Sesión -->
          <div
            class="border-t border-surface-light-border p-3 dark:border-surface-dark-border"
          >
            <button
              type="button"
              @click="handleOpenLogout"
              class="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-extrabold text-rose-700 shadow-xs transition-transform active:scale-95 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
            >
              <LogOut class="h-4 w-4 stroke-[2]" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Modal Accesible Reka UI para Confirmación de Cierre de Sesión -->
    <LogoutConfirmModal v-model:open="isLogoutModalOpen" />
  </div>
</template>
