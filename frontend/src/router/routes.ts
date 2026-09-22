import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  // Redirección raíz
  {
    path: '/',
    redirect: '/operaciones/pedidos',
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
        },
      },
    ],
  },

  // 3. Dominio Finanzas
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
        },
      },
    ],
  },

  // 4. Dominio Directorio
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
        },
      },
    ],
  },

  // Ruta comodín para capturar cualquier ruta no definida
  {
    path: '/:pathMatch(.*)*',
    redirect: '/operaciones/pedidos',
  },
];
