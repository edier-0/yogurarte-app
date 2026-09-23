<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
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
  CheckCircle2,
} from 'lucide-vue-next';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  roles?: string[];
}

interface NavSection {
  domain: string;
  roles?: string[];
  items: NavItem[];
}

const route = useRoute();
const authStore = useAuthStore();

const rawSections: NavSection[] = [
  {
    domain: 'Operaciones',
    roles: ['ADMIN', 'OPERADOR', 'DOMICILIARIO'],
    items: [
      {
        id: 'orders',
        label: 'Pedidos y Ventas',
        path: '/operaciones/pedidos',
        icon: ShoppingBag,
        badge: 'Hoy',
        badgeColor: 'bg-accent-500 text-white',
        roles: ['ADMIN', 'OPERADOR', 'DOMICILIARIO'],
      },
      {
        id: 'delivery',
        label: 'Domicilios de Hoy',
        path: '/operaciones/domicilios',
        icon: Bike,
        roles: ['ADMIN', 'DOMICILIARIO'],
      },
      {
        id: 'crm',
        label: 'CRM WhatsApp',
        path: '/operaciones/crm',
        icon: MessageCircle,
        badge: 'En Vivo',
        badgeColor: 'bg-emerald-500 text-white',
        roles: ['ADMIN'],
      },
    ],
  },
  {
    domain: 'Planta & Producción',
    roles: ['ADMIN', 'OPERADOR'],
    items: [
      { id: 'batches', label: 'Lotes y Rendimiento', path: '/produccion/lotes', icon: FlaskConical },
      { id: 'inventory', label: 'Materia Prima e Insumos', path: '/produccion/inventario', icon: Boxes },
    ],
  },
  {
    domain: 'Finanzas',
    roles: ['ADMIN'],
    items: [
      { id: 'cash', label: 'Control de Caja', path: '/finanzas/caja', icon: Wallet },
      { id: 'expenses', label: 'Gastos y Compras', path: '/finanzas/gastos', icon: Receipt },
    ],
  },
  {
    domain: 'Directorio',
    roles: ['ADMIN'],
    items: [
      { id: 'customers', label: 'Clientes Frecuentes', path: '/directorio/clientes', icon: Users },
      { id: 'staff', label: 'Nómina y Personal', path: '/directorio/personal', icon: Briefcase },
    ],
  },
];

const currentRole = computed(() => authStore.userRole);

// Secciones filtradas estrictamente por RBAC
const visibleSections = computed(() => {
  if (!currentRole.value) return [];
  const role = currentRole.value;

  return rawSections
    .filter((sec) => !sec.roles || sec.roles.includes(role))
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((sec) => sec.items.length > 0);
});

const currentPath = computed(() => route.path);

const isItemActive = (itemPath: string) => {
  return currentPath.value === itemPath || (itemPath !== '/' && currentPath.value.startsWith(itemPath));
};
</script>

<template>
  <aside
    class="hidden w-64 flex-col border-r border-surface-light-border bg-surface-light-card transition-colors dark:border-surface-dark-border dark:bg-surface-dark-card lg:flex"
  >
    <!-- Brand Header -->
    <div class="flex h-16 items-center gap-3 border-b border-surface-light-border px-5 dark:border-surface-dark-border">
      <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-hero-gradient text-white shadow-card">
        <span class="text-xl font-bold font-handwritten">Y</span>
      </div>
      <div>
        <span class="block text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
          YogurArte
        </span>
        <span class="block text-[11px] font-semibold text-brand-800 dark:text-brand-darkText">
          Fonseca • Artesanal
        </span>
      </div>
    </div>

    <!-- Navigation List -->
    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      <!-- Item Principal: Panel Analítico (Solo ADMIN) -->
      <div v-if="authStore.isAdmin" class="space-y-1">
        <RouterLink
          to="/dashboard"
          class="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all"
          :class="[
            isItemActive('/dashboard')
              ? 'bg-brand-50 text-brand-800 shadow-sm dark:bg-brand-darkSurface dark:text-brand-darkText'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
          ]"
        >
          <div class="flex items-center gap-2.5">
            <LayoutDashboard
              class="h-4 w-4 transition-colors"
              :class="isItemActive('/dashboard') ? 'text-brand-800 dark:text-brand-darkText' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'"
            />
            <span>Panel Analítico</span>
          </div>
          <span class="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-black uppercase text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            KPIs
          </span>
        </RouterLink>
      </div>

      <!-- Secciones dinámicas por Dominio -->
      <div v-for="section in visibleSections" :key="section.domain" class="space-y-1">
        <h3 class="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {{ section.domain }}
        </h3>
        
        <div class="space-y-0.5">
          <RouterLink
            v-for="item in section.items"
            :key="item.id"
            :to="item.path"
            class="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all"
            :class="[
              isItemActive(item.path)
                ? 'bg-brand-50 text-brand-800 shadow-sm dark:bg-brand-darkSurface dark:text-brand-darkText'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
            ]"
          >
            <div class="flex items-center gap-2.5">
              <component
                :is="item.icon"
                class="h-4 w-4 transition-colors"
                :class="isItemActive(item.path) ? 'text-brand-800 dark:text-brand-darkText' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'"
              />
              <span>{{ item.label }}</span>
            </div>

            <span
              v-if="item.badge"
              class="rounded-full px-2 py-0.5 text-[10px] font-extrabold"
              :class="item.badgeColor || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'"
            >
              {{ item.badge }}
            </span>
          </RouterLink>
        </div>
      </div>
    </nav>

    <!-- Footer System Status -->
    <div class="border-t border-surface-light-border p-4 dark:border-surface-dark-border">
      <div class="flex items-center justify-between rounded-xl bg-surface-light-canvas p-2.5 dark:bg-surface-dark-canvas">
        <div class="flex items-center gap-2">
          <span class="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300">RBAC Activo</span>
        </div>
        <div class="flex items-center gap-1 text-[10px] font-bold text-slate-400">
          <CheckCircle2 class="h-3.5 w-3.5 text-emerald-500 stroke-[2]" />
          <span>Seguro</span>
        </div>
      </div>
    </div>
  </aside>
</template>
