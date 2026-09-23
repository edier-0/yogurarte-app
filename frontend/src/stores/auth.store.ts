import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { http } from '@/api/client';
import { router } from '@/router';
import { toast } from 'vue-sonner';

export type UserRole = 'ADMIN' | 'PRODUCCION' | 'VENTAS' | 'DOMICILIARIO';

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

export const useAuthStore = defineStore('auth', () => {
  // Inicialización de estado desde localStorage
  const savedToken = localStorage.getItem('yogurarte_token') || localStorage.getItem('token');
  const savedUser = localStorage.getItem('yogurarte_user');

  const token = ref<string | null>(savedToken);
  const user = ref<AuthUser | null>(savedUser ? JSON.parse(savedUser) : null);
  const isLoading = ref<boolean>(false);
  const publicUsers = ref<PublicUserItem[]>([]);
  const error = ref<string | null>(null);

  // Getters reactivos de autenticación y roles
  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed<UserRole>(() => (user.value?.role as UserRole) || 'VENTAS');

  const isAdmin = computed(() => user.value?.role === 'ADMIN');
  const isOperator = computed(() => user.value?.role === 'PRODUCCION');
  const isDriver = computed(() => user.value?.role === 'DOMICILIARIO');
  const isSales = computed(() => user.value?.role === 'VENTAS');

  // Permisos granulares por dominio
  const canAccessFinance = computed(() => user.value?.role === 'ADMIN');
  const canAccessDirectory = computed(() => user.value?.role === 'ADMIN');
  const canAccessProduction = computed(() => ['ADMIN', 'PRODUCCION'].includes(user.value?.role || ''));
  const canAccessOperations = computed(() =>
    ['ADMIN', 'VENTAS', 'DOMICILIARIO', 'PRODUCCION'].includes(user.value?.role || '')
  );

  /**
   * Obtiene la ruta inicial por defecto según el rol del usuario
   */
  function getHomeRouteForRole(role?: string): string {
    const currentRole = role || user.value?.role;
    switch (currentRole) {
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
  }

  /**
   * Carga la lista pública de usuarios activos para acceso rápido
   */
  async function fetchPublicUsers() {
    try {
      const res = await http.get<PublicUserItem[]>('/auth/public-list');
      if (Array.isArray(res)) {
        publicUsers.value = res;
      }
    } catch {
      // Fallback a endpoint alterno si aplica
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
   * Iniciar sesión institucional
   */
  async function login(username: string, password: string) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await http.post<{
        message: string;
        token: string;
        user: AuthUser;
      }>('/auth/login', { username, password });

      if (res?.token && res?.user) {
        token.value = res.token;
        user.value = res.user;

        localStorage.setItem('yogurarte_token', res.token);
        localStorage.setItem('token', res.token);
        localStorage.setItem('yogurarte_user', JSON.stringify(res.user));

        return res;
      } else {
        throw new Error('Respuesta inválida del servidor de autenticación');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Error al iniciar sesión';
      error.value = msg;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Validar y refrescar perfil actual
   */
  async function fetchMe() {
    if (!token.value) return null;
    try {
      const res = await http.get<{ user: AuthUser }>('/auth/me');
      if (res?.user) {
        user.value = res.user;
        localStorage.setItem('yogurarte_user', JSON.stringify(res.user));
        return res.user;
      }
    } catch {
      logout();
    }
    return null;
  }

  /**
   * Solicitar recuperación de contraseña
   */
  async function forgotPassword(identifier: string): Promise<ForgotPasswordResponse> {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await http.post<ForgotPasswordResponse>('/auth/forgot-password', {
        identifier: identifier.trim(),
      });
      return res;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Error al procesar solicitud';
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
      const res = await http.post<{ message: string }>('/auth/reset-password', payload);
      return res;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Error al restablecer contraseña';
      error.value = msg;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Cerrar sesión y limpiar credenciales
   */
  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('yogurarte_token');
    localStorage.removeItem('token');
    localStorage.removeItem('yogurarte_user');
    toast.info('Sesión Finalizada', {
      description: 'Has cerrado sesión correctamente.',
    });
    router.push('/login');
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
    isSales,
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
