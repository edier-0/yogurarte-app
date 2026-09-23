import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';
import { toast } from 'vue-sonner';

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, behavior: 'smooth' };
  },
});

// Guardia Global de Navegación y Control de Acceso por Roles (RBAC)
router.beforeEach((to, _from, next) => {
  // 1. Título dinámico de la pestaña
  const metaTitle = to.meta?.title as string | undefined;
  if (metaTitle) {
    document.title = `${metaTitle} • YogurArte`;
  } else {
    document.title = 'YogurArte • Sistema Operativo Integral';
  }

  // 2. Comprobación de Sesión en LocalStorage
  const token =
    localStorage.getItem('yogurarte_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token');

  let userRole = 'VENTAS';
  try {
    const rawUser = localStorage.getItem('yogurarte_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.role) {
        userRole = parsed.role;
      }
    }
  } catch {
    // Si falla parseo, mantener rol por defecto
  }

  const isGuestOnly = to.meta?.guestOnly === true;
  const requiresAuth = to.meta?.requiresAuth === true;
  const allowedRoles = (to.meta?.roles as string[]) || [];

  // Función helper para resolver la ruta de inicio según el rol
  const getHomeForRole = (role: string): string => {
    switch (role) {
      case 'ADMIN':
        return '/dashboard';
      case 'PRODUCCION':
        return '/produccion/lotes';
      case 'DOMICILIARIO':
        return '/operaciones/domicilios';
      case 'VENTAS':
      default:
        return '/operaciones/pedidos';
    }
  };

  // 3. Redirección si la ruta es para invitados (Login / Recuperar) y ya está logueado
  if (isGuestOnly && token) {
    return next(getHomeForRole(userRole));
  }

  // 4. Redirección si la ruta requiere autenticación y no hay sesión activa
  if (requiresAuth && !token) {
    return next({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  }

  // 5. Verificación de Roles (RBAC)
  if (requiresAuth && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    toast.error('Acceso Restringido', {
      description: `El rol "${userRole}" no tiene permisos para acceder a ${metaTitle || 'este módulo'}.`,
    });
    return next(getHomeForRole(userRole));
  }

  // 6. Redirección de la raíz '/' según rol
  if (to.path === '/') {
    if (token) {
      return next(getHomeForRole(userRole));
    } else {
      return next('/login');
    }
  }

  next();
});

export default router;
