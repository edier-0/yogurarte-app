/**
 * Utilidad universal para generar enlaces de WhatsApp con soporte 100% confiable de
 * números telefónicos, nombres de usuario (@usuario) y conservación intacta de emojis UTF-8.
 */
export function buildWhatsAppUrl(contact: string | null | undefined, message: string): string {
  const rawContact = (contact || '').trim();
  const digits = rawContact.replace(/\D/g, '');
  const encodedText = encodeURIComponent(message);

  // Si tiene al menos 7 dígitos numéricos, es un número de teléfono válido
  if (digits.length >= 7) {
    let cleanPhone = digits;
    // Si tiene 10 dígitos (número celular colombiano clásico como 3024581882), anteponer 57
    if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
      cleanPhone = `57${cleanPhone}`;
    }
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }

  // Si es un nombre de usuario (ej: @edier, @yeilin) o no tiene número telefónico:
  // api.whatsapp.com/send?text=... abre WhatsApp con el mensaje y emojis listos y permite seleccionar el chat
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
