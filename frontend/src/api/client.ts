import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import { toast } from 'vue-sonner';

/**
 * Cliente HTTP centralizado para la API modular de YogurArte
 * Configurado con baseURL '/api' y proxy inverso a http://localhost:3000
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor de Petición: adjuntar token de autenticación
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token =
        localStorage.getItem('yogurarte_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('auth_token');

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token.trim()}`;
      }
    } catch {
      // Ignorar fallo de acceso a localStorage en entornos restringidos
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Respuesta: captura de errores 4xx / 5xx y alertas visuales con toast
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<{ message?: string; error?: string; details?: any }>) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const message =
      data?.error ||
      data?.message ||
      (status === 401
        ? 'Sesión expirada o no autorizada. Por favor inicia sesión.'
        : status === 403
        ? 'No tienes permisos suficientes para realizar esta acción.'
        : status === 404
        ? 'Recurso no encontrado.'
        : status && status >= 500
        ? 'Error interno del servidor. Inténtalo más tarde.'
        : error.message || 'Error de comunicación con el servidor.');

    // Notificación visual de error con Sonner
    toast.error('Error de Operación', {
      description: message,
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
