import type { RouteRecordRaw } from 'vue-router';

export type AllowedRole = 'ADMIN' | 'OPERADOR' | 'DOMICILIARIO';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    domain?: string;
    icon?: string;
    layout?: string;
    requiresAuth: boolean;
    guestOnly?: boolean;
    roles?: AllowedRole[];
  }
}

export const routes: RouteRecordRaw[] = [
  // Rutas de Autenticación (Públicas para invitados, sin layout institucional)
  {
    path: '/login',
    name: 'auth-login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      title: 'Iniciar Sesión',
      layout: 'auth',
      guestOnly: true,
      requiresAuth: false,
    },
  },
  {
    path: '/recuperar',
    alias: '/forgot-password',
    name: 'auth-forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: {
      title: 'Recuperar Contraseña',
      layout: 'auth',
      guestOnly: true,
      requiresAuth: false,
    },
  },

  // Redirección raíz
  {
    path: '/',
    redirect: '/dashboard',
    meta: {
      requiresAuth: false,
    },
  },

  // 0. Dashboard Analítico Ejecutivo (ADMIN)
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/dashboard/DashboardView.vue'),
    meta: {
      title: 'Panel Analítico',
      domain: 'Dashboard',
      icon: 'LayoutDashboard',
      requiresAuth: true,
      guestOnly: false,
      roles: ['ADMIN'],
    },
  },

  // 1. Dominio Operaciones
  {
    path: '/operaciones',
    redirect: '/operaciones/pedidos',
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: 'pedidos',
        name: 'operations-orders',
        component: () => import('@/views/operations/OrdersView.vue'),
        meta: {
          title: 'Pedidos y Ventas',
          domain: 'Operaciones',
          icon: 'ShoppingBag',
          requiresAuth: true,
          guestOnly: false,
          roles: ['ADMIN', 'OPERADOR', 'DOMICILIARIO'],
        },
      },
      {
        path: 'domicilios',
        name: 'operations-deliveries',
        component: () => import('@/views/operations/DeliveryView.vue'),
        meta: {
          title: 'Rutas de Domicilio',
          domain: 'Operaciones',
          icon: 'Bike',
          requiresAuth: true,
          guestOnly: false,
          roles: ['ADMIN', 'DOMICILIARIO'],
        },
      },
      {
        path: 'crm',
        name: 'operations-crm',
        component: () => import('@/views/operations/CrmView.vue'),
        meta: {
          title: 'CRM & WhatsApp',
          domain: 'Operaciones',
          icon: 'MessageSquare',
          requiresAuth: true,
          guestOnly: false,
          roles: ['ADMIN'],
        },
      },
    ],
  },

  // 2. Dominio Planta & Producción
  {
    path: '/produccion',
    redirect: '/produccion/lotes',
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: 'lotes',
        name: 'production-batches',
        component: () => import('@/views/production/BatchesView.vue'),
        meta: {
          title: 'Lotes y Rendimiento',
          domain: 'Planta & Producción',
          icon: 'FlaskConical',
          requiresAuth: true,
          guestOnly: false,
          roles: ['ADMIN', 'OPERADOR'],
        },
      },
      {
        path: 'inventario',
        name: 'production-inventory',
        component: () => import('@/views/production/InventoryView.vue'),
        meta: {
          title: 'Materia Prima e Insumos',
          domain: 'Planta & Producción',
          icon: 'Boxes',
          requiresAuth: true,
          guestOnly: false,
          roles: ['ADMIN', 'OPERADOR'],
        },
      },
    ],
  },

  // 3. Dominio Finanzas (Exclusivo ADMIN)
  {
    path: '/finanzas',
    redirect: '/finanzas/caja',
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: 'caja',
        name: 'finance-cash',
        component: () => import('@/views/finance/CashView.vue'),
        meta: {
          title: 'Control de Caja y Finanzas',
          domain: 'Finanzas',
          icon: 'Wallet',
          requiresAuth: true,
          guestOnly: false,
          roles: ['ADMIN'],
        },
      },
      {
        path: 'gastos',
        name: 'finance-expenses',
        component: () => import('@/views/finance/ExpensesView.vue'),
        meta: {
          title: 'Gastos y Compras',
          domain: 'Finanzas',
          icon: 'Receipt',
          requiresAuth: true,
          guestOnly: false,
          roles: ['ADMIN'],
        },
      },
    ],
  },

  // 4. Dominio Directorio (Exclusivo ADMIN)
  {
    path: '/directorio',
    redirect: '/directorio/clientes',
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: 'clientes',
        name: 'directory-customers',
        component: () => import('@/views/directory/CustomersView.vue'),
        meta: {
          title: 'Clientes Frecuentes',
          domain: 'Directorio',
          icon: 'Users',
          requiresAuth: true,
          guestOnly: false,
          roles: ['ADMIN'],
        },
      },
      {
        path: 'personal',
        name: 'directory-staff',
        component: () => import('@/views/directory/StaffView.vue'),
        meta: {
          title: 'Nómina y Personal',
          domain: 'Directorio',
          icon: 'Briefcase',
          requiresAuth: true,
          guestOnly: false,
          roles: ['ADMIN'],
        },
      },
    ],
  },

  // Ruta comodín para capturar cualquier ruta no definida
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
    meta: {
      requiresAuth: false,
    },
  },
];
