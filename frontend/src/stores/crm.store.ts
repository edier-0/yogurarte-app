import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { http } from '@/api/client';
import { getSocket } from '@/api/socket';
import { toast } from 'vue-sonner';
import { isTokenExpired } from '@/utils/jwt';

export type WhatsAppSessionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

export interface SmartWhatsAppOptions {
  phone: string;
  text: string;
  customerId?: number | null;
  contactName?: string | null;
  fallbackUrl?: string | null;
}

export const useCrmStore = defineStore('crm', () => {
  const status = ref<WhatsAppSessionStatus>('DISCONNECTED');
  const qrCodeDataUrl = ref<string | null>(null);
  const connectedPhoneNumber = ref<string | null>(null);
  const isLoadingStatus = ref(false);
  const isSendingMessage = ref(false);
  let isSocketInitialized = false;

  const isWhatsAppConnected = computed(() => status.value === 'CONNECTED');

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
        status.value = res.status || 'DISCONNECTED';
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
          status.value = data.status || 'DISCONNECTED';
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
    const rawPhone = (options.phone || '').trim();
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanDigits.length === 10 ? `57${cleanDigits}` : cleanDigits;
    const textMessage = options.text.trim();

    // Asegurar que tenemos el estado más reciente si no se ha consultado
    if (status.value === 'DISCONNECTED' && !isLoadingStatus.value) {
      await fetchStatus();
    }

    // Escenario A: Sesión Interna Conectada (Baileys Online)
    if (isWhatsAppConnected.value) {
      isSendingMessage.value = true;
      try {
        const recipient = rawPhone.startsWith('@')
          ? rawPhone
          : phoneWithCountry
          ? `${phoneWithCountry}@s.whatsapp.net`
          : rawPhone;

        await http.post('/crm/send', {
          recipient,
          text: textMessage,
          customerId: options.customerId || undefined,
          contactName: options.contactName || undefined,
        });

        const targetLabel = options.contactName || rawPhone;
        toast.success(`Mensaje enviado por WhatsApp (Baileys) a ${targetLabel}`, {
          description: textMessage.length > 80 ? `${textMessage.slice(0, 80)}...` : textMessage,
        });
        return { success: true, method: 'INTERNAL' };
      } catch (err: any) {
        console.warn('Fallo el envío por Baileys interno, intentando fallback externo...', err);
        // Si falló el envío interno por desconexión repentina, continuar a fallback
      } finally {
        isSendingMessage.value = false;
      }
    }

    // Escenario B: Sesión Interna Desconectada (Fallback a wa.me)
    const fallbackUrl =
      options.fallbackUrl ||
      (phoneWithCountry
        ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(textMessage)}`
        : null);

    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank');
      toast.info('Sesión interna desconectada: abriendo WhatsApp...', {
        description: `Destinatario: ${options.contactName || rawPhone}`,
      });
      return { success: true, method: 'EXTERNAL' };
    } else {
      toast.error('No se pudo enviar el mensaje: falta un número de teléfono válido');
      return { success: false, method: 'EXTERNAL' };
    }
  }

  return {
    status,
    qrCodeDataUrl,
    connectedPhoneNumber,
    isLoadingStatus,
    isSendingMessage,
    isWhatsAppConnected,
    fetchStatus,
    initSocketListeners,
    sendSmartWhatsApp,
  };
});
