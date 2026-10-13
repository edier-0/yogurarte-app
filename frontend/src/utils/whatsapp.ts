/**
 * Utilidad universal para generar enlaces de WhatsApp con soporte 100% confiable
 * para números de teléfono (locales y con código de país), nombres de usuario (@usuario)
 * y emojis UTF-8 intactos.
 */

export interface ContactInfo {
  identifier: string;
  isUsername: boolean;
  displayLabel: string;
}

/**
 * Limpia y normaliza cualquier identificador de contacto (teléfono o username).
 */
export function cleanContact(contact?: string | null): string {
  if (!contact) return '';
  return String(contact)
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u00A0]/g, '')
    .trim();
}

/**
 * Determina si un contacto es un nombre de usuario de WhatsApp (@username o alias alfanumérico)
 * en lugar de un número telefónico tradicional.
 */
export function isWhatsAppUsername(contact?: string | null): boolean {
  const cleaned = cleanContact(contact);
  if (!cleaned) return false;
  if (cleaned.startsWith('@')) return true;

  // Si no empieza con @ pero no tiene suficientes dígitos telefónicos (< 7) y tiene letras
  const digits = cleaned.replace(/\D/g, '');
  const hasLetters = /[a-zA-Z]/.test(cleaned);
  return hasLetters && digits.length < 7;
}

/**
 * Construye la URL oficial de la API de WhatsApp para abrir en la app móvil o WhatsApp Web.
 * Soporta tanto números telefónicos (?phone=) como nombres de usuario (?username=).
 */
export function buildWhatsAppUrl(contact: string | null | undefined, message: string = ''): string {
  const encodedText = encodeURIComponent(message);
  const cleaned = cleanContact(contact);

  if (!cleaned) {
    return encodedText ? `https://api.whatsapp.com/send/?text=${encodedText}` : 'https://api.whatsapp.com/';
  }

  // 1. Si es nombre de usuario (@usuario o alias con letras)
  if (isWhatsAppUsername(cleaned)) {
    const cleanUsername = cleaned.replace(/^@/, '').trim();
    if (cleanUsername.length > 0) {
      return encodedText
        ? `https://api.whatsapp.com/send/?username=${encodeURIComponent(cleanUsername)}&text=${encodedText}`
        : `https://api.whatsapp.com/send/?username=${encodeURIComponent(cleanUsername)}`;
    }
  }

  // 2. Si contiene dígitos telefónicos válidos (mínimo 7 dígitos)
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length >= 7) {
    let cleanPhone = digits;
    // Si es un número colombiano celular de 10 dígitos (inicia en 3), anteponer 57
    if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
      cleanPhone = `57${cleanPhone}`;
    }
    return encodedText
      ? `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send/?phone=${cleanPhone}`;
  }

  // 3. Fallback: Si tiene letras no detectadas previamente como username
  const cleanUsernameFallback = cleaned.replace(/^@/, '').trim();
  if (cleanUsernameFallback.length > 0) {
    return encodedText
      ? `https://api.whatsapp.com/send/?username=${encodeURIComponent(cleanUsernameFallback)}&text=${encodedText}`
      : `https://api.whatsapp.com/send/?username=${encodeURIComponent(cleanUsernameFallback)}`;
  }

  return encodedText ? `https://api.whatsapp.com/send/?text=${encodedText}` : 'https://api.whatsapp.com/';
}

/**
 * Extrae de forma inteligente la información del contacto desde la conversación o cliente
 */
export function resolveContactInfo(conversation?: any, customer?: any): ContactInfo {
  const candidate =
    customer?.phone ||
    conversation?.phoneNumber ||
    (conversation?.remoteJid?.endsWith('@s.whatsapp.net')
      ? conversation.remoteJid.replace('@s.whatsapp.net', '')
      : conversation?.remoteJid) ||
    customer?.fullName ||
    conversation?.contactName ||
    '';

  const cleaned = cleanContact(candidate);
  const isUsername = isWhatsAppUsername(cleaned);

  let displayLabel = cleaned;
  if (isUsername && !displayLabel.startsWith('@')) {
    displayLabel = `@${displayLabel}`;
  }

  return {
    identifier: cleaned,
    isUsername,
    displayLabel,
  };
}

/**
 * Abre el chat de WhatsApp en una nueva pestaña del navegador o en la aplicación de escritorio/móvil
 */
export function openWhatsAppExternal(contact: string | null | undefined, message: string = ''): Window | null {
  const url = buildWhatsAppUrl(contact, message);
  return window.open(url, '_blank', 'noopener,noreferrer');
}
