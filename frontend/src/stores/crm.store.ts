import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { http } from '@/api/client';
import { getSocket } from '@/api/socket';
import { toast } from 'vue-sonner';
import { isTokenExpired } from '@/utils/jwt';

import { buildWhatsAppUrl, isWhatsAppUsername } from '@/utils/whatsapp';

export type WhatsAppSessionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

export interface SmartWhatsAppOptions {
  phone: string;
  text: string;
  customerId?: number | null;
  contactName?: string | null;
  fallbackUrl?: string | null;
}

export interface MessagePreviewOptions {
  phone: string;
  text: string;
  contactName?: string | null;
  customerId?: number | null;
  title?: string;
  fallbackUrl?: string | null;
  onConfirm?: (editedText: string) => Promise<void> | void;
}

export interface MessagePreviewModalState extends MessagePreviewOptions {
  isOpen: boolean;
}

export const useCrmStore = defineStore('crm', () => {
  const status = ref<WhatsAppSessionStatus>('DISCONNECTED');
  const qrCodeDataUrl = ref<string | null>(null);
  const connectedPhoneNumber = ref<string | null>(null);
  const isLoadingStatus = ref(false);
  const isSendingMessage = ref(false);
  let isSocketInitialized = false;

  const messagePreview = ref<MessagePreviewModalState>({
    isOpen: false,
    phone: '',
    text: '',
    contactName: null,
    customerId: null,
    title: 'Previsualización de Mensaje WhatsApp',
    fallbackUrl: null,
  });

  const isWhatsAppConnected = computed(
    () => status.value === 'CONNECTED' || (!!connectedPhoneNumber.value && status.value !== 'DISCONNECTED')
  );

  async function fetchStatus(): Promise<WhatsAppSessionStatus> {
    const rawToken =
      localStorage.getItem('yogurarte_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token');

    // Blindaje: No disparar llamadas protegidas a /crm/status si no hay token válido
    if (!rawToken || isTokenExpired(rawToken)) {
      status.value = 'DISCONNECTED';
      return 'DISCONNECTED';
    }

    isLoadingStatus.value = true;
    try {
      const res = await http.get<{
        status: WhatsAppSessionStatus;
        qr?: string;
        phoneNumber?: string;
      }>('/crm/status');
      if (res) {
        if (res.phoneNumber && res.status !== 'DISCONNECTED') {
          status.value = 'CONNECTED';
        } else {
          status.value = res.status || 'DISCONNECTED';
        }
        qrCodeDataUrl.value = res.qr || null;
        connectedPhoneNumber.value = res.phoneNumber || null;
      }
      return status.value;
    } catch {
      status.value = 'DISCONNECTED';
      return 'DISCONNECTED';
    } finally {
      isLoadingStatus.value = false;
    }
  }

  function initSocketListeners() {
    if (isSocketInitialized) return;
    try {
      const socket = getSocket();
      socket.on('whatsapp:status', (data: any) => {
        if (data) {
          if (data.phoneNumber && data.status !== 'DISCONNECTED') {
            status.value = 'CONNECTED';
          } else {
            status.value = data.status || 'DISCONNECTED';
          }
          qrCodeDataUrl.value = data.qr || null;
          connectedPhoneNumber.value = data.phoneNumber || null;
        }
      });
      isSocketInitialized = true;
    } catch (err) {
      console.warn('No se pudo inicializar listener de status de WhatsApp en crmStore:', err);
    }
  }

  /**
   * Enrutamiento Inteligente de Mensajes de WhatsApp
   * Escenario A: Si Baileys está CONNECTED -> Envío directo por POST /api/crm/send sin pestañas externas
   * Escenario B: Si está DISCONNECTED -> Fallback a wa.me / enlace externo
   */
  async function sendSmartWhatsApp(
    options: SmartWhatsAppOptions
  ): Promise<{ success: boolean; method: 'INTERNAL' | 'EXTERNAL' }> {
    const rawContact = (options.phone || options.contactName || '').trim();
    const cleanDigits = rawContact.replace(/\D/g, '');
    const phoneWithCountry = cleanDigits.length === 10 ? `57${cleanDigits}` : cleanDigits;
    const textMessage = options.text.trim();
    let internalErrorMessage: string | null = null;

    // Asegurar que tenemos el estado más reciente si no se ha consultado
    if (status.value === 'DISCONNECTED' && !isLoadingStatus.value) {
      await fetchStatus();
    }

    // Escenario A: Sesión Interna Conectada (Baileys Online)
    if (isWhatsAppConnected.value) {
      isSendingMessage.value = true;
      try {
        const recipient = isWhatsAppUsername(rawContact)
          ? rawContact
          : phoneWithCountry
          ? `${phoneWithCountry}@s.whatsapp.net`
          : rawContact;

        await http.post('/crm/send', {
          recipient,
          text: textMessage,
          customerId: options.customerId || undefined,
          contactName: options.contactName || undefined,
        });

        const targetLabel = options.contactName || rawContact;
        toast.success(`Mensaje enviado por WhatsApp (Baileys) a ${targetLabel}`, {
          description: textMessage.length > 80 ? `${textMessage.slice(0, 80)}...` : textMessage,
        });
        return { success: true, method: 'INTERNAL' };
      } catch (err: any) {
        internalErrorMessage =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'No se pudo enviar internamente';
        console.warn('Fallo el envío por Baileys interno, intentando fallback externo...', internalErrorMessage);
      } finally {
        isSendingMessage.value = false;
      }
    }

    // Escenario B: Sesión Interna Desconectada o Fallo Interno -> Fallback a WhatsApp Web / App
    const targetForUrl = rawContact || options.phone || options.contactName || '';
    const fallbackUrl = options.fallbackUrl || buildWhatsAppUrl(targetForUrl, textMessage);

    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      if (internalErrorMessage) {
        toast.info('Abriendo en la aplicación de WhatsApp', {
          description: `${internalErrorMessage}. Se abrió WhatsApp oficial con tu mensaje.`,
        });
      } else {
        toast.info('Sesión interna desconectada: abriendo WhatsApp...', {
          description: `Destinatario: ${options.contactName || rawContact || 'Cliente'}`,
        });
      }
      return { success: true, method: 'EXTERNAL' };
    } else {
      toast.error('No se pudo enviar el mensaje: falta un contacto válido (número o @usuario)');
      return { success: false, method: 'EXTERNAL' };
    }
  }

  function openMessagePreview(options: MessagePreviewOptions) {
    messagePreview.value = {
      isOpen: true,
      phone: options.phone || '',
      text: options.text || '',
      contactName: options.contactName || null,
      customerId: options.customerId || null,
      title: options.title || 'Previsualización de Mensaje WhatsApp',
      fallbackUrl: options.fallbackUrl || null,
      onConfirm: options.onConfirm,
    };
  }

  function closeMessagePreview() {
    messagePreview.value.isOpen = false;
  }

  async function confirmAndSendPreview(editedText: string) {
    if (!messagePreview.value.isOpen) return;
    const current = { ...messagePreview.value };
    closeMessagePreview();

    if (current.onConfirm) {
      await current.onConfirm(editedText);
    } else {
      await sendSmartWhatsApp({
        phone: current.phone,
        text: editedText,
        customerId: current.customerId || undefined,
        contactName: current.contactName || undefined,
        fallbackUrl: current.fallbackUrl || undefined,
      });
    }
  }

  return {
    status,
    qrCodeDataUrl,
    connectedPhoneNumber,
    isLoadingStatus,
    isSendingMessage,
    isWhatsAppConnected,
    messagePreview,
    fetchStatus,
    initSocketListeners,
    sendSmartWhatsApp,
    openMessagePreview,
    closeMessagePreview,
    confirmAndSendPreview,
  };
});
