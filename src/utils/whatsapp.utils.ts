/**
 * Utilidad universal para generar enlaces de WhatsApp con soporte 100% confiable de
 * números telefónicos, nombres de usuario (@usuario) y conservación intacta de emojis UTF-8.
 */
export function buildWhatsAppUrl(contact: string | null | undefined, message: string): string {
  const encodedText = encodeURIComponent(message);
  if (!contact) {
    return `https://api.whatsapp.com/send/?text=${encodedText}`;
  }

  // Limpiar caracteres invisibles de Unicode (LTR, RTL, isolates, non-breaking spaces)
  const rawContact = String(contact)
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u00A0]/g, '')
    .trim();

  const digits = rawContact.replace(/\D/g, '');

  // Si tiene al menos 7 dígitos numéricos, anteponer 57 si es celular colombiano
  if (digits.length >= 7) {
    let cleanPhone = digits;
    if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
      cleanPhone = `57${cleanPhone}`;
    }
    return `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodedText}`;
  }

  // Si es un nombre de usuario (@usuario o alias):
  const cleanUsername = rawContact.replace(/^@/, '').trim();
  if (cleanUsername.length > 0) {
    return `https://api.whatsapp.com/send/?username=${cleanUsername}&text=${encodedText}`;
  }

  return `https://api.whatsapp.com/send/?text=${encodedText}`;
}
