import { createRouter, createWebHistory } from 'vue-router';
import { routes, type AllowedRole } from './routes';
import { toast } from 'vue-sonner';
import { isTokenExpired, purgeAuthStorage, parseJwtPayload } from '@/utils/jwt';
import { normalizeRole } from '@/stores/auth.store';

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

/**
 * Obtiene la ruta inicial por defecto según el rol del usuario
 */
export function getDefaultRouteForRole(role?: AllowedRole | null): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboard';
    case 'OPERADOR':
      return '/produccion/lotes';
    case 'DOMICILIARIO':
      return '/operaciones/domicilios';
    default:
      return '/login';
  }
}

// Guardia Global de Navegación y Control de Acceso por Roles (RBAC)
router.beforeEach((to, _from, next) => {
  // 1. Título dinámico de la pestaña en el navegador
  const metaTitle = to.meta?.title as string | undefined;
  if (metaTitle) {
    document.title = `${metaTitle} • YogurArte`;
  } else {
    document.title = 'YogurArte • Sistema Operativo Integral';
  }

  // 2. Comprobación Criptográfica del Token JWT y Estado de Sesión
  const rawToken =
    localStorage.getItem('yogurarte_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token');

  let token: string | null = null;
  let userRole: AllowedRole | null = null;

  if (rawToken) {
    if (isTokenExpired(rawToken)) {
      // Token expirado: purga inmediata sin permitir navegación a rutas protegidas
      purgeAuthStorage();
    } else {
      token = rawToken;

      // Obtener rol del usuario desde localStorage o desde el payload del JWT
      try {
        const rawUser = localStorage.getItem('yogurarte_user') || localStorage.getItem('user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          userRole = normalizeRole(parsed?.role);
        }
      } catch {
        userRole = null;
      }

      if (!userRole) {
        const payload = parseJwtPayload(token);
        if (payload?.role) {
          userRole = normalizeRole(payload.role);
        }
      }
    }
  }

  const isGuestOnly = to.meta?.guestOnly === true;
  const requiresAuth = to.meta?.requiresAuth === true;
  const allowedRoles = (to.meta?.roles as AllowedRole[] | undefined) || [];

  // 3. Si es ruta para invitados (Login / Recuperar) y el usuario ya está autenticado
  if (isGuestOnly && token && userRole) {
    return next(getDefaultRouteForRole(userRole));
  }

  // 4. Si la ruta requiere autenticación y no hay token válido
  if (requiresAuth && !token) {
    return next({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  }

  // 5. Verificación estricta de Roles (RBAC)
  if (requiresAuth && allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      toast.error('Acceso denegado: no tienes permisos para acceder a este módulo');
      return next(getDefaultRouteForRole(userRole));
    }
  }

  // 6. Redirección raíz '/' según estado y rol
  if (to.path === '/') {
    if (token && userRole) {
      return next(getDefaultRouteForRole(userRole));
    } else {
      return next('/login');
    }
  }

  next();
});

export default router;
