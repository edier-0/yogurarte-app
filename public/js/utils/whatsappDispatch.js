import { api } from '../api.js';
import { store, showToast, buildWhatsAppUrl } from '../store.js';

/**
 * Enrutador inteligente de notificaciones de WhatsApp según el rol del usuario:
 * - 👑 ADMIN / 🛍️ VENTAS: Envía directamente por la línea oficial de YogurArte (CRM Baileys)
 * - 🛵 DOMICILIARIO: Abre WhatsApp nativo en su teléfono personal (wa.me)
 * - Fallback automático a wa.me si Baileys no está conectado
 */
export async function dispatchSmartWhatsApp({
  phone,
  text,
  contactName,
  customerId,
  fallbackUrl,
  successToast = '✅ Mensaje enviado por WhatsApp oficial de YogurArte',
}) {
  const role = store.getUserRole();

  // 1. Domiciliarios siempre usan su app de WhatsApp personal para coordinar en calle
  if (role === 'DOMICILIARIO') {
    const targetUrl = fallbackUrl || buildWhatsAppUrl(phone, text);
    window.open(targetUrl, '_blank');
    return { success: true, mode: 'EXTERNAL_APP' };
  }

  // 2. Admin y Ventas: Intentar envío directo por CRM Baileys
  try {
    if (!phone && !fallbackUrl) {
      showToast('No se encontró número telefónico para enviar', 'warning');
      return { success: false };
    }

    const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
    const res = await api.sendCrmMessage(cleanPhone, text, {
      contactName,
      customerId: customerId ? Number(customerId) : undefined,
    });

    if (res && (res.messageId || res.success !== false)) {
      showToast(successToast, 'success');
      return { success: true, mode: 'CRM_OFFICIAL' };
    } else {
      throw new Error(res?.error || 'No se pudo enviar por CRM');
    }
  } catch (err) {
    console.warn('CRM WhatsApp directo no disponible, usando enlace externo de respaldo:', err);
    showToast('⚠️ WhatsApp oficial no conectado. Abriendo WhatsApp Web/Móvil...', 'info');
    const targetUrl = fallbackUrl || buildWhatsAppUrl(phone, text);
    window.open(targetUrl, '_blank');
    return { success: true, mode: 'FALLBACK' };
  }
}
