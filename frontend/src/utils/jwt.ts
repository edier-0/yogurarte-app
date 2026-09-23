/**
 * Utilitarios Criptográficos de JWT y Validación de Expiración (Frontend)
 */

export interface JwtPayload {
  id?: number;
  name?: string;
  username?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Decodifica de forma segura el payload de un token JWT (Base64Url UTF-8)
 */
export function parseJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;

    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const decodedText = new TextDecoder('utf-8').decode(bytes);

    return JSON.parse(decodedText) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Verifica si el token JWT ha expirado comparando su campo `exp` con la hora actual
 * Si no hay token, está corrupto o ya venció, retorna `true`.
 */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;

  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }

  // Margen de seguridad de 5 segundos para compensar desfases de red
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return nowInSeconds >= payload.exp - 5;
}

/**
 * Purga absoluta de todas las llaves de autenticación y sesión en localStorage
 */
export function purgeAuthStorage(): void {
  try {
    const keysToRemove = [
      'yogurarte_token',
      'token',
      'auth_token',
      'yogurarte_user',
      'user',
    ];
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.error('Error al purgar credenciales de sesión en localStorage:', err);
  }
}
