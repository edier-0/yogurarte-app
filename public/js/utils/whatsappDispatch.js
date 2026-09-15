import { api } from '../api.js';
import { store, showToast, buildWhatsAppUrl, escapeHtml } from '../store.js';

/**
 * Modal interactivo para previsualizar, editar y confirmar el envío de cualquier mensaje de WhatsApp.
 * Compatible con móviles y escritorio (PC).
 */
export function promptConfirmWhatsAppModal({ phone, text, contactName, isOfficialCrm }) {
  return new Promise((resolve) => {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
      resolve({ confirmed: true, text });
      return;
    }

    const cleanNumber = phone ? String(phone).replace(/\D/g, '') : '';
    const displayPhone = cleanNumber.length >= 10 ? `+57 ${cleanNumber.slice(-10)}` : (phone || 'Sin número');
    const displayName = contactName || 'Cliente';

    modalContainer.innerHTML = `
      <div class="modal-overlay active" id="waConfirmOverlay" style="z-index: 10500;">
        <div class="modal-card" style="max-width: 520px; width: 92%; border-radius: var(--radius-lg); box-shadow: 0 16px 36px rgba(0,0,0,0.25); overflow: hidden; animation: modalFadeIn 0.2s ease-out;">
          <div class="modal-header" style="background: #25D366; color: white; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.4rem;">💬</span>
              <div>
                <h3 class="modal-title" style="color: white; margin: 0; font-size: 1.05rem; font-weight: 800;">
                  Confirmar Envío de WhatsApp
                </h3>
                <span style="font-size: 0.75rem; color: rgba(255,255,255,0.92); font-weight: 600;">
                  ${isOfficialCrm ? '🟢 Línea Oficial YogurArte (CRM Baileys)' : '🛵 WhatsApp Personal (App Externa)'}
                </span>
              </div>
            </div>
            <button class="modal-close-btn" id="btnCancelWaClose" style="color: white; font-size: 1.3rem; border: none; background: transparent; cursor: pointer; line-height: 1;">✕</button>
          </div>

          <div class="modal-body" style="padding: 16px 18px;">
            <!-- Ficha de Destinatario -->
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <div>
                <div style="font-weight: 800; font-size: 0.92rem; color: #15803D;">
                  👤 ${escapeHtml(displayName)}
                </div>
                <div style="font-size: 0.8rem; color: #166534; font-weight: 600;">
                  📱 ${escapeHtml(displayPhone)}
                </div>
              </div>
              <span class="badge" style="background: #DCFCE7; color: #15803D; font-weight: 700; font-size: 0.72rem; border: 1px solid #86EFAC;">
                Listo para enviar
              </span>
            </div>

            <!-- Área de texto del mensaje editable -->
            <div class="form-group" style="margin-bottom: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="font-weight: 700; font-size: 0.82rem; margin: 0; color: var(--text-main);">
                  Contenido del Mensaje:
                </label>
                <small style="color: var(--text-muted); font-size: 0.72rem;">✏️ Puedes editarlo si deseas</small>
              </div>
              <textarea 
                id="waConfirmTextarea" 
                class="form-input" 
                rows="7" 
                style="width: 100%; font-size: 0.86rem; font-family: inherit; line-height: 1.45; padding: 10px; resize: vertical; box-sizing: border-box; border: 1.5px solid var(--border-color); border-radius: var(--radius-md);"
              >${escapeHtml(text || '')}</textarea>
            </div>
          </div>

          <div class="modal-footer" style="padding: 12px 18px; display: flex; justify-content: flex-end; gap: 10px; background: #F8FAFC; border-top: 1px solid var(--border-subtle);">
            <button type="button" class="btn btn-outline" id="btnCancelWaAction" style="font-weight: 700; font-size: 0.86rem; padding: 8px 16px;">
              Cancelar
            </button>
            <button type="button" class="btn btn-whatsapp" id="btnSendWaAction" style="background: #25D366; color: white; font-weight: 800; font-size: 0.86rem; padding: 8px 18px; border: none; border-radius: var(--radius-md); display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(37,211,102,0.35); cursor: pointer;">
              <span>📤 Confirmar y Enviar</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const close = () => {
      modalContainer.innerHTML = '';
      resolve({ confirmed: false });
    };

    document.getElementById('btnCancelWaClose')?.addEventListener('click', close);
    document.getElementById('btnCancelWaAction')?.addEventListener('click', close);
    document.getElementById('waConfirmOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'waConfirmOverlay') close();
    });

    document.getElementById('btnSendWaAction')?.addEventListener('click', () => {
      const finalText = document.getElementById('waConfirmTextarea')?.value || text;
      modalContainer.innerHTML = '';
      resolve({ confirmed: true, text: finalText });
    });
  });
}

/**
 * Enrutador inteligente de notificaciones de WhatsApp según el rol del usuario:
 * - Muestra modal de confirmación y previsualización editable antes de enviar
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
  skipConfirm = false,
}) {
  const role = store.getUserRole();
  const isOfficialCrm = role !== 'DOMICILIARIO';

  // 1. Mostrar modal interactivo de confirmación y edición
  let messageToSend = text || '';
  if (!skipConfirm) {
    const confirmation = await promptConfirmWhatsAppModal({
      phone,
      text: messageToSend,
      contactName,
      isOfficialCrm,
    });
    if (!confirmation || !confirmation.confirmed) {
      return { success: false, cancelled: true };
    }
    messageToSend = confirmation.text !== undefined ? confirmation.text : messageToSend;
  }

  // 2. Domiciliarios siempre usan su app de WhatsApp personal para coordinar en calle
  if (role === 'DOMICILIARIO') {
    const targetUrl = buildWhatsAppUrl(phone, messageToSend) || fallbackUrl;
    window.open(targetUrl, '_blank');
    return { success: true, mode: 'EXTERNAL_APP' };
  }

  // 3. Admin y Ventas: Envío directo por CRM Baileys
  try {
    if (!phone && !fallbackUrl) {
      showToast('No se encontró número telefónico para enviar', 'warning');
      return { success: false };
    }

    const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
    const res = await api.sendCrmMessage(cleanPhone, messageToSend, {
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
    const targetUrl = buildWhatsAppUrl(phone, messageToSend) || fallbackUrl;
    window.open(targetUrl, '_blank');
    return { success: true, mode: 'FALLBACK' };
  }
}
