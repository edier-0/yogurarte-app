<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { refDebounced } from '@vueuse/core';
import {
  MessageCircle,
  Gift,
  BookOpen,
  CalendarClock,
  Send,
  Search,
  RefreshCw,
  QrCode,
  PhoneCall,
  ShoppingBag,
  Package,
  Zap,
  ArrowLeft,
  CheckCheck,
  MapPin,
  Plus,
  UserCheck,
  GitMerge,
} from 'lucide-vue-next';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
} from 'reka-ui';
import { http } from '@/api/client';
import { getSocket } from '@/api/socket';
import { toast } from 'vue-sonner';
import { useProductionStore } from '@/stores/production.store';
import CrmQrModal from '@/components/operations/crm/CrmQrModal.vue';
import QuickRepliesModal from '@/components/operations/crm/QuickRepliesModal.vue';
import OrderFormModal from '@/components/operations/OrderFormModal.vue';
import LoyaltyTab from '@/components/operations/crm/LoyaltyTab.vue';
import TemplatesTab from '@/components/operations/crm/TemplatesTab.vue';
import RecurringTab from '@/components/operations/crm/RecurringTab.vue';
import MergeChatModal from '@/components/operations/crm/MergeChatModal.vue';
import ClientChatInfo from '@/components/operations/crm/ClientChatInfo.vue';
import RecurringEditModal from '@/components/operations/crm/RecurringEditModal.vue';

export interface ChatMessageItem {
  id: number;
  conversationId: number;
  messageId: string;
  fromMe: boolean;
  senderName?: string | null;
  messageType: string;
  text?: string | null;
  mediaUrl?: string | null;
  status: string;
  timestamp: string;
}

export interface ChatConversationItem {
  id: number;
  remoteJid: string;
  phoneNumber: string;
  contactName?: string | null;
  profilePicUrl?: string | null;
  unreadCount: number;
  lastMessageText?: string | null;
  lastMessageTimestamp?: string | null;
  lastMessageFromMe: boolean;
  tag: string;
  customerId?: number | null;
  customer?: {
    id: number;
    fullName: string;
    phone: string;
    address?: string | null;
    orders?: Array<{
      id: number;
      orderNumber: string;
      totalAmount: number;
      deliveryStatus: string;
      paymentStatus: string;
      orderDate: string;
    }>;
  } | null;
}

type MainTab = 'CHATS' | 'LOYALTY' | 'TEMPLATES' | 'RECURRING';
const activeMainTab = ref<MainTab>('CHATS');

const route = useRoute();
const productionStore = useProductionStore();

// Estado de Conexión Baileys
const whatsappStatus = ref<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('DISCONNECTED');
const qrCodeDataUrl = ref<string | null>(null);
const connectedPhoneNumber = ref<string | null>(null);

// Conversaciones y mensajes
const conversations = ref<ChatConversationItem[]>([]);
const selectedConversation = ref<ChatConversationItem | null>(null);
const activeMessages = ref<ChatMessageItem[]>([]);

// Carga e inputs
const isLoadingConversations = ref(false);
const isLoadingMessages = ref(false);
const isSending = ref(false);
const messageInput = ref('');
const searchChat = ref('');
const debouncedSearch = refDebounced(searchChat, 300);

// Modales
const isQrModalOpen = ref(false);
const isQuickRepliesModalOpen = ref(false);
const isOrderModalOpen = ref(false);
const orderToPrefill = ref<any>(null);
const isMergeModalOpen = ref(false);
const isRecurringModalOpen = ref(false);
const recurringToPrefill = ref<any>(null);
const isMobileClientInfoOpen = ref(false);

// Control responsive móvil (true = viendo chat activo, false = viendo sidebar)
const isMobileChatOpen = ref(false);

const messagesContainer = ref<HTMLElement | null>(null);

// Total de mensajes no leídos global
const totalUnreadCount = computed(() => {
  return conversations.value.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
});

// Formateadores de fecha y hora
const formatMessageTime = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

const formatChatTimestamp = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return formatMessageTime(dateStr);
  }
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
  }).format(d);
};

// Desplazamiento automático al fondo del chat
function scrollToBottom(smooth = false) {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
    setTimeout(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    }, 60);
  });
}

// Carga de estado de WhatsApp
async function fetchStatus() {
  try {
    const res = await http.get<any>('/crm/status');
    if (res) {
      whatsappStatus.value = res.status || 'DISCONNECTED';
      qrCodeDataUrl.value = res.qr || null;
      connectedPhoneNumber.value = res.phoneNumber || null;
    }
  } catch {
    whatsappStatus.value = 'DISCONNECTED';
  }
}

// Carga de conversaciones
async function fetchConversations() {
  isLoadingConversations.value = true;
  try {
    const data = await http.get<ChatConversationItem[]>('/crm/conversations');
    if (Array.isArray(data)) {
      conversations.value = data;

      // Si viene por query param (?contact=...), autoseleccionar
      const contactQuery = ((route.query.contact as string) || '').trim().toLowerCase();
      if (contactQuery && !selectedConversation.value) {
        const found = conversations.value.find((c) => {
          const name = (c.contactName || '').toLowerCase();
          const phone = (c.phoneNumber || '').toLowerCase();
          const custName = (c.customer?.fullName || '').toLowerCase();
          return (
            name.includes(contactQuery) ||
            phone.includes(contactQuery) ||
            custName.includes(contactQuery)
          );
        });
        if (found) {
          selectConversation(found);
        }
      }
    }
  } catch {
    // Interceptor
  } finally {
    isLoadingConversations.value = false;
  }
}

// Carga de mensajes para una conversación
async function loadMessagesForConversation(convId: number) {
  isLoadingMessages.value = true;
  try {
    const msgs = await http.get<ChatMessageItem[]>(`/crm/conversations/${convId}/messages`);
    if (Array.isArray(msgs)) {
      activeMessages.value = msgs;
      scrollToBottom(false);
    }
  } catch {
    activeMessages.value = [];
  } finally {
    isLoadingMessages.value = false;
    scrollToBottom(false);
    try {
      await http.post(`/crm/conversations/${convId}/read`);
    } catch {
      // ignore
    }
  }
}

// Selección de conversación
function selectConversation(conv: ChatConversationItem) {
  selectedConversation.value = conv;
  conv.unreadCount = 0;
  isMobileChatOpen.value = true;
  loadMessagesForConversation(conv.id);
}

// Conversaciones filtradas en la barra lateral
const filteredConversations = computed(() => {
  const q = debouncedSearch.value.trim().toLowerCase();
  if (!q) return conversations.value;

  return conversations.value.filter((c) => {
    const name = (c.contactName || '').toLowerCase();
    const phone = (c.phoneNumber || '').toLowerCase();
    const lastMsg = (c.lastMessageText || '').toLowerCase();
    const custName = (c.customer?.fullName || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || lastMsg.includes(q) || custName.includes(q);
  });
});

// Enviar mensaje de texto
async function handleSendMessage() {
  if (!messageInput.value.trim() || !selectedConversation.value || isSending.value) return;

  const textToSend = messageInput.value.trim();
  const conv = selectedConversation.value;
  isSending.value = true;

  try {
    const res = await http.post<any>('/crm/send', {
      recipient: conv.remoteJid,
      text: textToSend,
      customerId: conv.customerId || undefined,
    });

    messageInput.value = '';

    // Si la API responde con el mensaje creado, añadirlo de inmediato evitando duplicados
    if (res && res.message) {
      const already = activeMessages.value.some(
        (m) => m.id === res.message.id || (m.messageId && m.messageId === res.message.messageId)
      );
      if (!already) {
        activeMessages.value.push(res.message);
      }
      conv.lastMessageText = textToSend;
      conv.lastMessageTimestamp = new Date().toISOString();
      conv.lastMessageFromMe = true;
      scrollToBottom(true);
    }
  } catch (err: any) {
    toast.error('Error al enviar mensaje', { description: err?.message });
  } finally {
    isSending.value = false;
  }
}

// Interpolación dinámica de variables para respuestas rápidas
function interpolateVariables(rawText: string): string {
  const customerName =
    selectedConversation.value?.customer?.fullName ||
    selectedConversation.value?.contactName ||
    'Cliente';

  let totalStr = '$0 COP';
  const orders = selectedConversation.value?.customer?.orders;
  if (orders && orders.length > 0) {
    const latestOrder = orders[0];
    totalStr = `$${new Intl.NumberFormat('es-CO').format(latestOrder.totalAmount)} COP`;
  }

  const flavorsList =
    productionStore.flavors.length > 0
      ? productionStore.activeFlavors.map((f) => f.name).join(', ')
      : 'Fresa, Melocotón, Mora, Guanábana, Arequipe, Natural';

  return rawText
    .replace(/\{\{\s*cliente\s*\}\}/gi, customerName)
    .replace(/\{\{\s*customer\s*\}\}/gi, customerName)
    .replace(/\{\{\s*total\s*\}\}/gi, totalStr)
    .replace(/\{\{\s*sabores\s*\}\}/gi, flavorsList);
}

// Inserción de plantilla rápida en el chat con reemplazo de variables
function handleApplyQuickReply(text: string) {
  messageInput.value = interpolateVariables(text);
}

// Crear pedido desde el chat
function handleOpenCreateOrder(overrideCustomer?: any) {
  if (!selectedConversation.value && !overrideCustomer) return;
  const c = selectedConversation.value;
  const cust = overrideCustomer || c?.customer;
  orderToPrefill.value = {
    customerId: cust?.id || c?.customerId || null,
    customerName: cust?.fullName || c?.contactName || '',
    customerPhone: cust?.phone || c?.phoneNumber || '',
    customerAddress: cust?.address || '',
  };
  isOrderModalOpen.value = true;
}

// Abrir modal de compra recurrente prellenado
function handleOpenRecurring(cust?: any) {
  const targetCust = cust || selectedConversation.value?.customer;
  if (!targetCust) {
    toast.error('Debes vincular un cliente primero para programar compras frecuentes');
    return;
  }
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 15);
  recurringToPrefill.value = {
    customerId: targetCust.id,
    customer: {
      id: targetCust.id,
      fullName: targetCust.fullName,
      phone: targetCust.phone,
      address: targetCust.address,
    },
    frequencyDays: 15,
    preferredFlavor: productionStore.activeFlavors[0]?.name || 'Fresa',
    bottleSize: '1L',
    quantity: 1,
    nextDate: nextWeek.toISOString().split('T')[0],
    isActive: true,
  };
  isRecurringModalOpen.value = true;
}

// Abrir modal de unificación / cambio de cliente
function handleOpenMerge(conv?: any) {
  if (conv) {
    selectedConversation.value = conv;
  }
  if (!selectedConversation.value) return;
  isMergeModalOpen.value = true;
}

// Chat unificado exitosamente
async function handleChatMerged(targetConv: any) {
  await fetchConversations();
  if (targetConv && targetConv.id) {
    const updated = conversations.value.find((c) => c.id === targetConv.id) || targetConv;
    selectConversation(updated);
  }
}

// Desvincular chat de cliente
async function handleUnlinkChat(conv: any) {
  try {
    await http.post('/crm/chats/unlink', { chatId: conv.id });
    toast.success('Chat desvinculado del cliente exitosamente');
    if (selectedConversation.value && selectedConversation.value.id === conv.id) {
      selectedConversation.value.customerId = null;
      selectedConversation.value.customer = null;
    }
    await fetchConversations();
  } catch (err: any) {
    toast.error('Error al desvincular chat', {
      description: err?.response?.data?.error || err.message,
    });
  }
}

// Manejadores de WebSockets
function onStatusUpdate(data: any) {
  if (data) {
    whatsappStatus.value = data.status || 'DISCONNECTED';
    qrCodeDataUrl.value = data.qr || null;
    connectedPhoneNumber.value = data.phoneNumber || null;
  }
}

function onNewMessage(payload: {
  conversationId?: number;
  customerId?: number | null;
  canonicalJid?: string;
  phoneNumber?: string;
  message: ChatMessageItem;
  conversation?: ChatConversationItem;
}) {
  if (!payload || !payload.message) return;

  const msg = payload.message;
  const targetConvId = payload.conversationId || msg.conversationId || payload.conversation?.id;
  const targetCustomerId = payload.customerId || payload.conversation?.customerId || null;

  // Extraer dígitos telefónicos limpios (últimos 10 dígitos)
  const rawPhone =
    payload.phoneNumber ||
    payload.conversation?.phoneNumber ||
    payload.canonicalJid ||
    (msg as any).remoteJid ||
    '';
  const phoneDigits = rawPhone.replace(/\D/g, '').slice(-10);

  // 1. Identificar si corresponde a la conversación actualmente abierta en pantalla
  const isCurrentOpen =
    selectedConversation.value &&
    (
      (targetConvId && selectedConversation.value.id === targetConvId) ||
      (targetCustomerId && selectedConversation.value.customerId && selectedConversation.value.customerId === targetCustomerId) ||
      (phoneDigits && phoneDigits.length >= 7 && (selectedConversation.value.phoneNumber || selectedConversation.value.remoteJid || '').replace(/\D/g, '').slice(-10) === phoneDigits)
    );

  if (isCurrentOpen) {
    // Deduplicación estricta en activeMessages para evitar duplicar mensajes agregados optimísticamente
    const alreadyExists = activeMessages.value.some((m) => {
      if (m.id && msg.id && m.id === msg.id) return true;
      if (m.messageId && msg.messageId && m.messageId === msg.messageId) return true;
      return false;
    });

    if (!alreadyExists) {
      activeMessages.value.push(msg);
      scrollToBottom(true);
    }
  }

  // 2. Búsqueda multi-capa en la lista de conversaciones (sidebar) para no duplicar tarjetas
  const existingIndex = conversations.value.findIndex((c) => {
    // Capa 1: Coincidencia por ID primario de BD
    if (targetConvId && c.id === targetConvId) return true;
    // Capa 2: Coincidencia por Customer ID vinculado
    if (targetCustomerId && c.customerId && c.customerId === targetCustomerId) return true;
    // Capa 3: Coincidencia por los últimos 10 dígitos del teléfono
    if (phoneDigits && phoneDigits.length >= 7) {
      const cDigits = (c.phoneNumber || c.remoteJid || '').replace(/\D/g, '').slice(-10);
      if (cDigits && cDigits === phoneDigits) return true;
    }
    return false;
  });

  if (existingIndex !== -1) {
    const target = conversations.value[existingIndex];
    // Actualizar datos del chat en caliente
    target.lastMessageText = msg.text || (msg.messageType === 'STICKER' ? '✨ Sticker' : '📷 Multimedia');
    target.lastMessageTimestamp = msg.timestamp || new Date().toISOString();
    target.lastMessageFromMe = msg.fromMe;

    // Si viene información de cliente o contacto más fresca, sincronizarla
    if (payload.conversation) {
      if (payload.conversation.customer && !target.customer) {
        target.customer = payload.conversation.customer;
      }
      if (payload.conversation.customerId && !target.customerId) {
        target.customerId = payload.conversation.customerId;
      }
      if (payload.conversation.contactName && (!target.contactName || target.contactName === target.phoneNumber)) {
        target.contactName = payload.conversation.contactName;
      }
    }

    // Si el chat NO está abierto y el mensaje es entrante (!fromMe), incrementar no leídos
    if (!isCurrentOpen && !msg.fromMe) {
      target.unreadCount = (target.unreadCount || 0) + 1;
    }

    // Subir la conversación al tope de la lista
    conversations.value.splice(existingIndex, 1);
    conversations.value.unshift(target);
  } else if (payload.conversation) {
    // Si realmente es un chat completamente nuevo que no existía en memoria
    conversations.value.unshift(payload.conversation);
  }
}

function onConversationRead(data: { conversationId: number }) {
  const conv = conversations.value.find((c) => c.id === data.conversationId);
  if (conv) {
    conv.unreadCount = 0;
  }
}

function onConversationsMerged(data: { targetId: number; sourceId: number }) {
  if (!data) return;
  conversations.value = conversations.value.filter((c) => c.id !== data.sourceId);

  if (selectedConversation.value && selectedConversation.value.id === data.sourceId) {
    const target = conversations.value.find((c) => c.id === data.targetId);
    if (target) {
      selectConversation(target);
    } else {
      fetchConversations();
    }
  }
}

function onConversationDeleted(data: { conversationId: number }) {
  if (!data) return;
  conversations.value = conversations.value.filter((c) => c.id !== data.conversationId);
  if (selectedConversation.value && selectedConversation.value.id === data.conversationId) {
    selectedConversation.value = null;
    activeMessages.value = [];
  }
}

function onConversationUnlinked(data: { conversationId: number; conversation?: any }) {
  if (!data) return;
  const conv = conversations.value.find((c) => c.id === data.conversationId);
  if (conv) {
    conv.customerId = null;
    conv.customer = null;
  }
  if (selectedConversation.value && selectedConversation.value.id === data.conversationId) {
    selectedConversation.value.customerId = null;
    selectedConversation.value.customer = null;
  }
}

function onConversationUpdated(data: { conversation: any }) {
  if (!data || !data.conversation) return;
  const updated = data.conversation;
  const idx = conversations.value.findIndex((c) => c.id === updated.id);
  if (idx !== -1) {
    conversations.value[idx] = { ...conversations.value[idx], ...updated };
  }
  if (selectedConversation.value && selectedConversation.value.id === updated.id) {
    selectedConversation.value = { ...selectedConversation.value, ...updated };
  }
}

// Navegar al chat desde otra pestaña
function handleOpenChatFromCustomer(customer: { id: number; fullName: string; phone: string }) {
  activeMainTab.value = 'CHATS';
  const cleanDigits = customer.phone.replace(/\D/g, '');
  const found = conversations.value.find((c) => {
    return (
      c.customerId === customer.id ||
      c.phoneNumber.includes(cleanDigits) ||
      (c.contactName && c.contactName.toLowerCase().includes(customer.fullName.toLowerCase()))
    );
  });
  if (found) {
    selectConversation(found);
  } else {
    searchChat.value = customer.fullName;
  }
}

onMounted(() => {
  fetchStatus();
  fetchConversations();
  if (productionStore.flavors.length === 0) {
    productionStore.fetchFlavors();
  }

  const socket = getSocket();
  socket.on('whatsapp:status', onStatusUpdate);
  socket.on('whatsapp:message', onNewMessage);
  socket.on('whatsapp:conversation_read', onConversationRead);
  socket.on('whatsapp:conversations_merged', onConversationsMerged);
  socket.on('whatsapp:conversation_deleted', onConversationDeleted);
  socket.on('whatsapp:conversation_unlinked', onConversationUnlinked);
  socket.on('whatsapp:conversation_updated', onConversationUpdated);
});

onUnmounted(() => {
  const socket = getSocket();
  socket.off('whatsapp:status', onStatusUpdate);
  socket.off('whatsapp:message', onNewMessage);
  socket.off('whatsapp:conversation_read', onConversationRead);
  socket.off('whatsapp:conversations_merged', onConversationsMerged);
  socket.off('whatsapp:conversation_deleted', onConversationDeleted);
  socket.off('whatsapp:conversation_unlinked', onConversationUnlinked);
  socket.off('whatsapp:conversation_updated', onConversationUpdated);
});
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Header Principal y Banner de Estado Baileys -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          CRM & Operaciones Comerciales
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Mensajería omnicanal WhatsApp, programa de fidelización 10+1 y compras recurrentes
        </p>
      </div>

      <!-- Banner de Estado de Conexión Baileys -->
      <div class="flex items-center gap-2">
        <!-- Badge de Estado Dinámico -->
        <div
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black shadow-xs"
          :class="
            whatsappStatus === 'CONNECTED'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : whatsappStatus === 'CONNECTING'
              ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
          "
        >
          <span
            class="h-2 w-2 rounded-full"
            :class="
              whatsappStatus === 'CONNECTED'
                ? 'bg-emerald-500 animate-pulse'
                : whatsappStatus === 'CONNECTING'
                ? 'bg-amber-500 animate-ping'
                : 'bg-rose-500'
            "
          />
          <span v-if="whatsappStatus === 'CONNECTED'">
            Conectado {{ connectedPhoneNumber ? `(+${connectedPhoneNumber})` : '' }}
          </span>
          <span v-else-if="whatsappStatus === 'CONNECTING'">
            Conectando...
          </span>
          <span v-else>
            Desconectado
          </span>
        </div>

        <!-- Botón Ver QR o Estado -->
        <button
          type="button"
          @click="isQrModalOpen = true"
          class="inline-flex items-center gap-1.5 rounded-xl border border-surface-light-border bg-surface-light-card px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          title="Ver código QR y estado"
        >
          <QrCode class="h-3.5 w-3.5 stroke-[2]" />
          <span>Vincular / QR</span>
        </button>

        <button
          type="button"
          @click="fetchConversations"
          :disabled="isLoadingConversations"
          class="inline-flex items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-card p-2 text-slate-600 shadow-xs hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800"
          title="Refrescar conversaciones"
        >
          <RefreshCw class="h-3.5 w-3.5 stroke-[2]" :class="{ 'animate-spin': isLoadingConversations }" />
        </button>
      </div>
    </div>

    <!-- Barra de Pestañas Superiores Estilizada en Reka UI (Slate/Marfil) -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      <button
        type="button"
        @click="activeMainTab = 'CHATS'"
        class="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all"
        :class="
          activeMainTab === 'CHATS'
            ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
            : 'bg-surface-light-card text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800'
        "
      >
        <MessageCircle class="h-4 w-4 stroke-[2]" />
        <span>WhatsApp & Chats</span>
        <span
          v-if="totalUnreadCount > 0"
          class="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-black text-white"
        >
          {{ totalUnreadCount }}
        </span>
      </button>

      <button
        type="button"
        @click="activeMainTab = 'LOYALTY'"
        class="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all"
        :class="
          activeMainTab === 'LOYALTY'
            ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
            : 'bg-surface-light-card text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800'
        "
      >
        <Gift class="h-4 w-4 stroke-[2]" />
        <span>Fidelización (10+1)</span>
      </button>

      <button
        type="button"
        @click="activeMainTab = 'TEMPLATES'"
        class="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all"
        :class="
          activeMainTab === 'TEMPLATES'
            ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
            : 'bg-surface-light-card text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800'
        "
      >
        <BookOpen class="h-4 w-4 stroke-[2]" />
        <span>Plantillas Rápidas</span>
      </button>

      <button
        type="button"
        @click="activeMainTab = 'RECURRING'"
        class="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all"
        :class="
          activeMainTab === 'RECURRING'
            ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
            : 'bg-surface-light-card text-slate-600 hover:bg-slate-100 dark:bg-surface-dark-card dark:text-slate-300 dark:hover:bg-slate-800'
        "
      >
        <CalendarClock class="h-4 w-4 stroke-[2]" />
        <span>Compras Recurrentes</span>
      </button>
    </div>

    <!-- ========================================== -->
    <!-- CONTENIDO PESTAÑA 1: WHATSAPP & CHATS     -->
    <!-- ========================================== -->
    <div
      v-if="activeMainTab === 'CHATS'"
      class="h-[calc(100vh-14rem)] min-h-[580px] max-h-[860px] rounded-3xl border border-surface-light-border bg-surface-light-card shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card overflow-hidden grid grid-cols-1 md:grid-cols-12"
    >
      <!-- SIDEBAR DE CHATS (Columna 3 de 12 en desktop) -->
      <div
        class="border-r border-surface-light-border dark:border-surface-dark-border flex flex-col h-full min-h-0 overflow-hidden md:col-span-4 lg:col-span-3 xl:col-span-3"
        :class="{ 'hidden md:flex': isMobileChatOpen }"
      >
        <!-- Buscador de Chats (shrink-0) -->
        <div class="shrink-0 p-3 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-canvas/40 dark:bg-surface-dark-canvas/40">
          <div class="relative w-full">
            <Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 stroke-[2]" />
            <input
              v-model="searchChat"
              type="text"
              placeholder="Buscar por contacto o @username..."
              class="w-full rounded-xl border border-surface-light-border bg-surface-light-card py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white"
            />
          </div>
        </div>

        <!-- Lista de Conversaciones (flex-1 min-h-0 overflow-y-auto) -->
        <div v-auto-animate class="flex-1 min-h-0 overflow-y-auto divide-y divide-surface-light-border/60 dark:divide-surface-dark-border/60">
          <div
            v-for="conv in filteredConversations"
            :key="conv.id"
            @click="selectConversation(conv)"
            class="flex items-center gap-3 p-3.5 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 relative"
            :class="{
              'bg-brand-50/50 dark:bg-brand-950/30 border-l-4 border-l-brand-800 dark:border-l-brand-400':
                selectedConversation?.id === conv.id,
            }"
          >
            <!-- Avatar con Iniciales -->
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black text-xs shadow-xs text-white"
              :class="
                conv.customer
                  ? 'bg-hero-gradient'
                  : 'bg-slate-700 dark:bg-slate-800'
              "
            >
              {{ ((conv.customer?.fullName || conv.contactName || conv.phoneNumber).charAt(0) || 'C').toUpperCase() }}
            </div>

            <!-- Contenido del Chat -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1">
                <h4 class="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {{ conv.customer?.fullName || conv.contactName || conv.phoneNumber }}
                </h4>
                <span class="text-[10px] font-bold text-slate-400 shrink-0">
                  {{ formatChatTimestamp(conv.lastMessageTimestamp) }}
                </span>
              </div>

              <!-- Último Mensaje y Tags -->
              <div class="mt-0.5 flex items-center justify-between gap-1">
                <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  <span v-if="conv.lastMessageFromMe" class="font-bold text-brand-800 dark:text-brand-darkText">Tú: </span>
                  {{ conv.lastMessageText || 'Sin mensajes' }}
                </p>

                <!-- Badge de No Leídos -->
                <span
                  v-if="conv.unreadCount > 0"
                  class="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-black text-white"
                >
                  {{ conv.unreadCount }}
                </span>
              </div>

              <!-- Chip Visual de Pedidos / Estado del Contacto -->
              <div class="mt-1.5 flex items-center gap-1.5">
                <span
                  v-if="conv.customer?.orders && conv.customer.orders.some(o => o.deliveryStatus !== 'DELIVERED')"
                  class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                >
                  <Package class="h-2.5 w-2.5 stroke-[2.5]" />
                  <span>Pedido Activo</span>
                </span>
                <span
                  v-else-if="conv.customer"
                  class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                >
                  <ShoppingBag class="h-2.5 w-2.5 stroke-[2]" />
                  <span>Cliente ({{ conv.customer.orders?.length || 0 }} pedidos)</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                >
                  {{ conv.tag || 'Prospecto' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Estado Vacío en Sidebar -->
          <div
            v-if="filteredConversations.length === 0"
            class="py-16 text-center text-xs font-semibold text-slate-400 p-4"
          >
            <MessageCircle class="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
            No se encontraron conversaciones.
          </div>
        </div>
      </div>

      <!-- VENTANA DE CHAT ACTIVA (Columna flexible en desktop) -->
      <div
        class="flex flex-col h-full min-h-0 overflow-hidden md:col-span-8 bg-surface-light-canvas/20 dark:bg-surface-dark-canvas/20"
        :class="[
          { 'hidden md:flex': !isMobileChatOpen },
          selectedConversation ? 'lg:col-span-5 xl:col-span-6' : 'lg:col-span-9 xl:col-span-9'
        ]"
      >
        <!-- CASO 1: HAY CHAT SELECCIONADO -->
        <template v-if="selectedConversation">
          <!-- Cabecera del Chat (shrink-0 fija) -->
          <div class="shrink-0 p-3.5 sm:p-4 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <!-- Botón Volver en Móvil -->
              <button
                type="button"
                @click="isMobileChatOpen = false"
                class="md:hidden rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft class="h-5 w-5" />
              </button>

              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-hero-gradient font-black text-xs text-white shadow-xs">
                {{ ((selectedConversation.customer?.fullName || selectedConversation.contactName || selectedConversation.phoneNumber).charAt(0) || 'C').toUpperCase() }}
              </div>

              <div class="min-w-0">
                <h3 class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                  <span>{{ selectedConversation.customer?.fullName || selectedConversation.contactName || selectedConversation.phoneNumber }}</span>
                </h3>

                <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <a
                    :href="`tel:${selectedConversation.customer?.phone || selectedConversation.phoneNumber}`"
                    class="font-bold hover:text-brand-800 dark:hover:text-brand-darkText inline-flex items-center gap-1"
                  >
                    <PhoneCall class="h-3 w-3 stroke-[2]" />
                    <span>{{ selectedConversation.customer?.phone || selectedConversation.phoneNumber }}</span>
                  </a>

                  <span v-if="selectedConversation.customer?.address" class="hidden sm:inline-flex items-center gap-1 truncate max-w-[140px] xl:max-w-[200px]">
                    <MapPin class="h-3 w-3 stroke-[2] text-slate-400 shrink-0" />
                    <span class="truncate">{{ selectedConversation.customer.address }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Botonera del Header del Chat -->
            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Botón Info Cliente en móvil/tablet -->
              <button
                type="button"
                @click="isMobileClientInfoOpen = true"
                class="lg:hidden inline-flex items-center gap-1 rounded-xl border border-surface-light-border bg-surface-light-card px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-xs"
                title="Ver datos del cliente y fidelización"
              >
                <UserCheck class="h-3.5 w-3.5 text-brand-800 dark:text-brand-darkText" />
                <span class="hidden xs:inline text-[11px]">Cliente</span>
              </button>

              <!-- Botón Unificar / Cambiar Cliente -->
              <button
                type="button"
                @click="handleOpenMerge()"
                class="inline-flex items-center gap-1 rounded-xl border border-surface-light-border bg-surface-light-card px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-xs"
                title="Cambiar o unificar cliente"
              >
                <GitMerge class="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span class="hidden sm:inline text-[11px]">Unificar</span>
              </button>

              <!-- Botón Rápido + Crear Pedido -->
              <button
                type="button"
                @click="handleOpenCreateOrder()"
                class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-3 py-1.5 text-xs font-extrabold text-white shadow-xs transition-transform active:scale-95 shrink-0"
              >
                <Plus class="h-3.5 w-3.5 stroke-[2.5]" />
                <span class="hidden sm:inline">Crear Pedido</span>
                <span class="sm:hidden">Pedido</span>
              </button>
            </div>
          </div>

          <!-- Área de Mensajes (flex-1 min-h-0 overflow-y-auto) -->
          <div
            ref="messagesContainer"
            class="flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
          >
            <!-- Loader -->
            <div v-if="isLoadingMessages" class="py-12 text-center text-xs font-semibold text-slate-400">
              <RefreshCw class="mx-auto h-5 w-5 animate-spin mb-1 text-slate-400" />
              Cargando mensajes...
            </div>

            <div
              v-for="msg in activeMessages"
              :key="msg.id"
              class="flex flex-col"
            >
              <!-- Burbuja Saliente (fromMe) -->
              <div
                v-if="msg.fromMe"
                class="ml-auto bg-brand-800 text-white rounded-2xl rounded-tr-xs p-3 max-w-[85%] sm:max-w-[75%] shadow-sm"
              >
                <p class="text-xs whitespace-pre-line leading-relaxed font-medium">
                  {{ msg.text }}
                </p>
                <div class="mt-1 flex items-center justify-end gap-1 text-[10px] text-brand-200">
                  <span>{{ formatMessageTime(msg.timestamp) }}</span>
                  <CheckCheck class="h-3 w-3 stroke-[2]" />
                </div>
              </div>

              <!-- Burbuja Entrante (!fromMe) -->
              <div
                v-else
                class="mr-auto bg-surface-light-card border border-surface-light-border text-slate-900 dark:border-surface-dark-border dark:bg-surface-dark-card dark:text-white rounded-2xl rounded-tl-xs p-3 max-w-[85%] sm:max-w-[75%] shadow-sm"
              >
                <p class="text-xs whitespace-pre-line leading-relaxed font-medium">
                  {{ msg.text }}
                </p>
                <div class="mt-1 text-left text-[10px] text-slate-400">
                  <span>{{ formatMessageTime(msg.timestamp) }}</span>
                </div>
              </div>
            </div>

            <div
              v-if="!isLoadingMessages && activeMessages.length === 0"
              class="py-16 text-center text-xs font-semibold text-slate-400"
            >
              <MessageCircle class="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
              Inicia la conversación enviando un mensaje o una plantilla rápida.
            </div>
          </div>

          <!-- Barra de Input y Acciones de Envío (shrink-0 fija) -->
          <div class="shrink-0 p-3 border-t border-surface-light-border dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card">
            <form @submit.prevent="handleSendMessage" class="flex items-center gap-2">
              <!-- Botón de Plantillas / Respuestas Rápidas -->
              <button
                type="button"
                @click="isQuickRepliesModalOpen = true"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-canvas text-brand-800 hover:bg-brand-50 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-brand-darkText dark:hover:bg-brand-950/40 transition-colors"
                title="Respuestas rápidas institucionales"
              >
                <Zap class="h-4 w-4 stroke-[2]" />
              </button>

              <!-- Input de Texto -->
              <input
                v-model="messageInput"
                type="text"
                placeholder="Escribe un mensaje de WhatsApp (Enter para enviar)..."
                class="flex-1 rounded-xl border border-surface-light-border bg-surface-light-canvas px-4 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-brand-800 focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-white"
              />

              <!-- Botón de Envío -->
              <button
                type="submit"
                :disabled="!messageInput.trim() || isSending"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-hero-gradient text-white shadow-card transition-transform active:scale-95 disabled:opacity-50"
                title="Enviar mensaje"
              >
                <Send class="h-4 w-4 stroke-[2]" :class="{ 'animate-pulse': isSending }" />
              </button>
            </form>
          </div>
        </template>

        <!-- CASO 2: NINGÚN CHAT SELECCIONADO (Estado Vacío) -->
        <template v-else>
          <div class="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-800 dark:bg-brand-950/50 dark:text-brand-darkText mb-3 shadow-inner">
              <MessageCircle class="h-8 w-8 stroke-[1.5]" />
            </div>
            <h3 class="text-base font-extrabold text-slate-800 dark:text-slate-200">
              Bandeja de Conversaciones CRM
            </h3>
            <p class="mt-1 text-xs max-w-sm font-medium">
              Selecciona un chat del panel lateral para responder mensajes, consultar pedidos o enviar despachos de yogur.
            </p>
          </div>
        </template>
      </div>

      <!-- PANEL LATERAL DE INFORMACIÓN Y ACCIONES DEL CLIENTE (Columna 3 de 12 en desktop) -->
      <div
        v-if="selectedConversation"
        class="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col h-full min-h-0 border-l border-surface-light-border dark:border-surface-dark-border overflow-hidden"
      >
        <ClientChatInfo
          :conversation="selectedConversation"
          @open-recurring="handleOpenRecurring"
          @open-merge="handleOpenMerge"
          @unlink="handleUnlinkChat"
          @create-order="handleOpenCreateOrder"
        />
      </div>
    </div>

    <!-- ========================================== -->
    <!-- CONTENIDO PESTAÑA 2: FIDELIZACIÓN (10+1)  -->
    <!-- ========================================== -->
    <div v-else-if="activeMainTab === 'LOYALTY'">
      <LoyaltyTab @open-chat="handleOpenChatFromCustomer" />
    </div>

    <!-- ========================================== -->
    <!-- CONTENIDO PESTAÑA 3: PLANTILLAS RÁPIDAS   -->
    <!-- ========================================== -->
    <div v-else-if="activeMainTab === 'TEMPLATES'">
      <TemplatesTab />
    </div>

    <!-- ========================================== -->
    <!-- CONTENIDO PESTAÑA 4: COMPRAS RECURRENTES  -->
    <!-- ========================================== -->
    <div v-else-if="activeMainTab === 'RECURRING'">
      <RecurringTab />
    </div>

    <!-- Modales Globales del CRM -->
    <CrmQrModal
      v-model:open="isQrModalOpen"
      :status="whatsappStatus"
      :qr="qrCodeDataUrl"
      :phone-number="connectedPhoneNumber"
      @refresh="fetchStatus"
    />

    <QuickRepliesModal
      v-model:open="isQuickRepliesModalOpen"
      @select="handleApplyQuickReply"
    />

    <OrderFormModal
      v-model:open="isOrderModalOpen"
      :order-to-edit="orderToPrefill"
      @saved="fetchConversations"
    />

    <MergeChatModal
      v-model:open="isMergeModalOpen"
      :source-chat="selectedConversation"
      @merged="handleChatMerged"
    />

    <RecurringEditModal
      v-model:open="isRecurringModalOpen"
      :schedule-to-edit="recurringToPrefill"
      @saved="fetchConversations"
    />

    <!-- Drawer / Modal Móvil de Información del Cliente -->
    <DialogRoot :open="isMobileClientInfoOpen" @update:open="(val: boolean) => isMobileClientInfoOpen = val">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" />
        <DialogContent
          class="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-surface-light-border bg-surface-light-card p-0 shadow-2xl transition-all focus:outline-none dark:border-surface-dark-border dark:bg-surface-dark-card lg:hidden flex flex-col"
        >
          <ClientChatInfo
            v-if="selectedConversation"
            :conversation="selectedConversation"
            :show-close-button="true"
            @open-recurring="handleOpenRecurring"
            @open-merge="handleOpenMerge"
            @unlink="handleUnlinkChat"
            @create-order="handleOpenCreateOrder"
            @close="isMobileClientInfoOpen = false"
          />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
