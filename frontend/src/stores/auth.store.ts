import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { http } from '@/api/client';
import { router } from '@/router';
import { toast } from 'vue-sonner';
import { parseJwtPayload, isTokenExpired, purgeAuthStorage } from '@/utils/jwt';
import { disconnectSocket } from '@/api/socket';

export type UserRole = 'ADMIN' | 'OPERADOR' | 'DOMICILIARIO';

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  phone?: string | null;
  email?: string | null;
  bankInfo?: string | null;
}

export interface PublicUserItem {
  id: number;
  name: string;
  username: string;
  role: string;
}

export interface ForgotPasswordResponse {
  status: 'admin_recovery' | 'notify_admin';
  role: string;
  username: string;
  name: string;
  emailMasked?: string;
  message: string;
  admins?: Array<{ name: string; phone: string }>;
}

/**
 * Normaliza cualquier variante de rol (ej: PRODUCCION -> OPERADOR)
 */
export function normalizeRole(rawRole?: string | null): UserRole | null {
  if (!rawRole) return null;
  const upper = rawRole.toUpperCase().trim();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'OPERADOR' || upper === 'PRODUCCION') return 'OPERADOR';
  if (upper === 'DOMICILIARIO' || upper === 'REPARTIDOR') return 'DOMICILIARIO';
  return null;
}

export const useAuthStore = defineStore('auth', () => {
  // Inicialización segura y validación inmediata de expiración
  const rawSavedToken =
    localStorage.getItem('yogurarte_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token');

  let initialToken: string | null = null;
  let initialUser: AuthUser | null = null;

  if (rawSavedToken && !isTokenExpired(rawSavedToken)) {
    initialToken = rawSavedToken;
    const rawSavedUser = localStorage.getItem('yogurarte_user') || localStorage.getItem('user');
    if (rawSavedUser) {
      try {
        const parsed = JSON.parse(rawSavedUser);
        const normRole = normalizeRole(parsed.role);
        if (normRole) {
          initialUser = {
            ...parsed,
            role: normRole,
          };
        }
      } catch {
        initialUser = null;
      }
    }

    // Si no había user en storage pero el JWT es válido, extraer datos básicos del JWT
    if (!initialUser) {
      const payload = parseJwtPayload(rawSavedToken);
      if (payload) {
        const normRole = normalizeRole(payload.role);
        if (normRole) {
          initialUser = {
            id: payload.id || 0,
            name: payload.name || payload.username || 'Usuario',
            username: payload.username || '',
            role: normRole,
          };
        }
      }
    }
  } else if (rawSavedToken) {
    // Token expirado o corrupto detectado al inicio: purgar de inmediato
    purgeAuthStorage();
  }

  const token = ref<string | null>(initialToken);
  const user = ref<AuthUser | null>(initialUser);
  const isLoading = ref<boolean>(false);
  const publicUsers = ref<PublicUserItem[]>([]);
  const error = ref<string | null>(null);

  // Getters reactivos blindados: Erradicar fallback a roles por defecto sin autenticación
  const isAuthenticated = computed(() => {
    return !!token.value && !isTokenExpired(token.value) && !!user.value;
  });

  const userRole = computed<UserRole | null>(() => {
    if (!isAuthenticated.value || !user.value) return null;
    return user.value.role;
  });

  const isAdmin = computed(() => isAuthenticated.value && user.value?.role === 'ADMIN');
  const isOperator = computed(() => isAuthenticated.value && user.value?.role === 'OPERADOR');
  const isDriver = computed(() => isAuthenticated.value && user.value?.role === 'DOMICILIARIO');

  // Permisos granulares por dominio
  const canAccessFinance = computed(() => isAdmin.value);
  const canAccessDirectory = computed(() => isAdmin.value);
  const canAccessProduction = computed(() => isAdmin.value || isOperator.value);
  const canAccessOperations = computed(() => isAdmin.value || isDriver.value);

  /**
   * Obtiene la ruta inicial por defecto según el rol del usuario
   */
  function getHomeRouteForRole(role?: string | null): string {
    const norm = normalizeRole(role) || userRole.value;
    switch (norm) {
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

  /**
   * Carga la lista pública de usuarios activos para selector táctil
   */
  async function fetchPublicUsers() {
    try {
      const res = await http.get<PublicUserItem[]>('/auth/public-list');
      if (Array.isArray(res)) {
        publicUsers.value = res;
      }
    } catch {
      try {
        const res = await http.get<PublicUserItem[]>('/users/public-list');
        if (Array.isArray(res)) {
          publicUsers.value = res;
        }
      } catch {
        publicUsers.value = [];
      }
    }
  }

  /**
   * Iniciar sesión institucional y asentar JWT
   */
  async function login(username: string, password: string) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await http.post<{
        message: string;
        token: string;
        user: {
          id: number;
          name: string;
          username: string;
          role: string;
          phone?: string | null;
          email?: string | null;
          bankInfo?: string | null;
        };
      }>('/auth/login', { username, password });

      if (res?.token && res?.user) {
        if (isTokenExpired(res.token)) {
          throw new Error('El token emitido por el servidor ya se encuentra expirado');
        }

        const normalizedRole = normalizeRole(res.user.role) || 'OPERADOR';
        const authenticatedUser: AuthUser = {
          ...res.user,
          role: normalizedRole,
        };

        token.value = res.token;
        user.value = authenticatedUser;

        localStorage.setItem('yogurarte_token', res.token);
        localStorage.setItem('token', res.token);
        localStorage.setItem('yogurarte_user', JSON.stringify(authenticatedUser));

        return {
          ...res,
          user: authenticatedUser,
        };
      } else {
        throw new Error('Respuesta inválida del servidor de autenticación');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al iniciar sesión';
      error.value = msg;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Sincronizar y validar perfil del usuario actual desde /api/auth/me
   */
  async function fetchMe() {
    if (!token.value || isTokenExpired(token.value)) {
      logout(true);
      return null;
    }

    try {
      const res = await http.get<{ user: any }>('/auth/me');
      if (res?.user) {
        const normRole = normalizeRole(res.user.role) || 'OPERADOR';
        const syncedUser: AuthUser = {
          ...res.user,
          role: normRole,
        };
        user.value = syncedUser;
        localStorage.setItem('yogurarte_user', JSON.stringify(syncedUser));
        return syncedUser;
      }
    } catch {
      logout(true);
    }
    return null;
  }

  /**
   * Solicitar código de recuperación de contraseña
   */
  async function forgotPassword(identifier: string): Promise<ForgotPasswordResponse> {
    isLoading.value = true;
    error.value = null;
    try {
      return await http.post<ForgotPasswordResponse>('/auth/forgot-password', {
        identifier: identifier.trim(),
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al procesar solicitud';
      error.value = msg;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Restablecer contraseña con código de 6 dígitos
   */
  async function resetPassword(payload: {
    identifier: string;
    resetCode: string;
    newPassword: string;
  }) {
    isLoading.value = true;
    error.value = null;
    try {
      return await http.post<{ message: string }>('/auth/reset-password', payload);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al restablecer contraseña';
      error.value = msg;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Cierre forzado y determinístico de sesión
   * Limpia llaves en localStorage, desconecta sockets y redirige a /login
   */
  function logout(silent = false) {
    token.value = null;
    user.value = null;
    purgeAuthStorage();

    // Desconectar sockets en tiempo real
    try {
      disconnectSocket();
    } catch (err) {
      console.warn('Advertencia al desconectar socket en logout:', err);
    }

    if (!silent) {
      toast.info('Sesión Finalizada', {
        description: 'Has cerrado sesión correctamente.',
      });
    }

    if (router.currentRoute.value.path !== '/login') {
      router.push('/login');
    }
  }

  return {
    token,
    user,
    isLoading,
    publicUsers,
    error,
    isAuthenticated,
    userRole,
    isAdmin,
    isOperator,
    isDriver,
    canAccessFinance,
    canAccessDirectory,
    canAccessProduction,
    canAccessOperations,
    getHomeRouteForRole,
    fetchPublicUsers,
    login,
    fetchMe,
    forgotPassword,
    resetPassword,
    logout,
  };
});
