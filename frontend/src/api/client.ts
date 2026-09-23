import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';
import { toast } from 'vue-sonner';
import { isTokenExpired, purgeAuthStorage } from '@/utils/jwt';

/**
 * Cliente HTTP centralizado para la API modular de YogurArte
 * Configurado con baseURL '/api' y blindaje de tokens JWT
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor de Petición: Validación de expiración e inyección de token Bearer
apiClient.interceptors.request.use(
  (config) => {
    try {
      const isPublicEndpoint =
        config.url?.includes('/auth/login') ||
        config.url?.includes('/users/login') ||
        config.url?.includes('/auth/public-list') ||
        config.url?.includes('/users/public-list') ||
        config.url?.includes('/auth/forgot-password') ||
        config.url?.includes('/users/forgot-password') ||
        config.url?.includes('/auth/reset-password') ||
        config.url?.includes('/users/reset-password');

      if (isPublicEndpoint) {
        return config;
      }

      const token =
        localStorage.getItem('yogurarte_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('auth_token');

      if (token) {
        // Si el token almacenado está expirado, purgar de inmediato y bloquear la petición
        if (isTokenExpired(token)) {
          purgeAuthStorage();
          toast.error('Sesión Caducada', {
            description: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
          });

          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }

          return Promise.reject(
            new axios.Cancel('Petición bloqueada: El token JWT está expirado.')
          );
        }

        if (config.headers) {
          config.headers.Authorization = `Bearer ${token.trim()}`;
        }
      }
    } catch (err) {
      console.warn('Error al verificar token en petición:', err);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Respuesta: captura de 401/403, purga forzada y redirección a /login
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<{ message?: string; error?: string; code?: string; details?: any }>) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const data = error.response?.data;
    const url = error.config?.url || '';

    const isLoginEndpoint = url.includes('/login');

    // 1. Manejo estricto de 401 Unauthorized y 403 Forbidden
    if ((status === 401 || status === 403) && !isLoginEndpoint) {
      purgeAuthStorage();

      const message =
        status === 401
          ? 'Tu sesión ha caducado o no tienes autorización. Redirigiendo a inicio de sesión...'
          : 'Acceso denegado: no tienes permisos para acceder a este recurso.';

      toast.error(status === 401 ? 'Sesión Caducada' : 'Acceso Denegado', {
        description: message,
        duration: 4000,
      });

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }

    // 2. Mensajes informativos para otros errores
    const defaultMessage =
      data?.error ||
      data?.message ||
      (status === 404
        ? 'Recurso no encontrado.'
        : status && status >= 500
        ? 'Error interno del servidor. Inténtalo más tarde.'
        : error.message || 'Error de comunicación con el servidor.');

    toast.error('Error de Operación', {
      description: defaultMessage,
      duration: 4000,
    });

    return Promise.reject(error);
  }
);

/**
 * Wrappers tipados convenientes
 */
export const http = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.get(url, config).then((res) => res.data),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.post(url, data, config).then((res) => res.data),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.put(url, data, config).then((res) => res.data),
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.delete(url, config).then((res) => res.data),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.patch(url, data, config).then((res) => res.data),
};

export default apiClient;
