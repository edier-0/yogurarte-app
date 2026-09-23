import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  // Rutas de Autenticación (Públicas, sin layout de navegación)
  {
    path: '/login',
    name: 'auth-login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      title: 'Iniciar Sesión',
      layout: 'auth',
      guestOnly: true,
    },
  },
  {
    path: '/recuperar',
    name: 'auth-forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: {
      title: 'Recuperar Contraseña',
      layout: 'auth',
      guestOnly: true,
    },
  },

  // Redirección raíz
  {
    path: '/',
    redirect: '/dashboard',
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
      roles: ['ADMIN'],
    },
  },

  // 1. Dominio Operaciones
  {
    path: '/operaciones',
    redirect: '/operaciones/pedidos',
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
          roles: ['ADMIN', 'VENTAS', 'DOMICILIARIO', 'PRODUCCION'],
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
          roles: ['ADMIN', 'VENTAS', 'DOMICILIARIO'],
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
          roles: ['ADMIN', 'VENTAS'],
        },
      },
    ],
  },

  // 2. Dominio Planta & Producción
  {
    path: '/produccion',
    redirect: '/produccion/lotes',
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
          roles: ['ADMIN', 'PRODUCCION'],
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
          roles: ['ADMIN', 'PRODUCCION'],
        },
      },
    ],
  },

  // 3. Dominio Finanzas (Exclusivo ADMIN)
  {
    path: '/finanzas',
    redirect: '/finanzas/caja',
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
          roles: ['ADMIN'],
        },
      },
    ],
  },

  // 4. Dominio Directorio (Exclusivo ADMIN)
  {
    path: '/directorio',
    redirect: '/directorio/clientes',
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
          roles: ['ADMIN'],
        },
      },
    ],
  },

  // Ruta comodín para capturar cualquier ruta no definida
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];
