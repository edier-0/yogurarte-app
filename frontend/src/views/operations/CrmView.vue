<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { refDebounced } from '@vueuse/core';
import {
  MessageCircle,
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
} from 'lucide-vue-next';
import { http } from '@/api/client';
import { getSocket } from '@/api/socket';
import { toast } from 'vue-sonner';
import CrmQrModal from '@/components/operations/crm/CrmQrModal.vue';
import QuickRepliesModal from '@/components/operations/crm/QuickRepliesModal.vue';
import OrderFormModal from '@/components/operations/OrderFormModal.vue';

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

const route = useRoute();

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

// Control responsive móvil (true = viendo chat activo, false = viendo sidebar)
const isMobileChatOpen = ref(false);

const messagesContainer = ref<HTMLElement | null>(null);

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

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
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
      const contactQuery = (route.query.contact as string || '').trim().toLowerCase();
      if (contactQuery && !selectedConversation.value) {
        const found = conversations.value.find((c) => {
          const name = (c.contactName || '').toLowerCase();
          const phone = (c.phoneNumber || '').toLowerCase();
          const custName = (c.customer?.fullName || '').toLowerCase();
          return name.includes(contactQuery) || phone.includes(contactQuery) || custName.includes(contactQuery);
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
      scrollToBottom();
    }
  } catch {
    activeMessages.value = [];
  } finally {
    isLoadingMessages.value = false;
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

    // Si la API responde con el mensaje creado, añadirlo de inmediato
    if (res && res.message) {
      activeMessages.value.push(res.message);
      conv.lastMessageText = textToSend;
      conv.lastMessageTimestamp = new Date().toISOString();
      conv.lastMessageFromMe = true;
      scrollToBottom();
    }
  } catch (err: any) {
    toast.error('Error al enviar mensaje', { description: err?.message });
  } finally {
    isSending.value = false;
  }
}

// Inserción de plantilla rápida
function handleApplyQuickReply(text: string) {
  messageInput.value = text;
}

// Crear pedido desde el chat
function handleOpenCreateOrder() {
  if (!selectedConversation.value) return;
  const c = selectedConversation.value;
  orderToPrefill.value = {
    customerId: c.customerId || null,
    customerName: c.customer?.fullName || c.contactName || '',
    customerPhone: c.customer?.phone || c.phoneNumber || '',
    customerAddress: c.customer?.address || '',
  };
  isOrderModalOpen.value = true;
}

// Manejadores de WebSockets
function onStatusUpdate(data: any) {
  if (data) {
    whatsappStatus.value = data.status || 'DISCONNECTED';
    qrCodeDataUrl.value = data.qr || null;
    connectedPhoneNumber.value = data.phoneNumber || null;
  }
}

function onNewMessage(payload: { conversationId: number; message: ChatMessageItem; conversation: ChatConversationItem }) {
  if (!payload) return;

  // 1. Si coincide con el chat abierto, agregar mensaje
  if (selectedConversation.value && selectedConversation.value.id === payload.conversationId) {
    activeMessages.value.push(payload.message);
    scrollToBottom();
  }

  // 2. Actualizar listado en sidebar
  const existingIndex = conversations.value.findIndex((c) => c.id === payload.conversationId);
  if (existingIndex !== -1) {
    const target = conversations.value[existingIndex];
    target.lastMessageText = payload.message.text || 'Archivo multimedia';
    target.lastMessageTimestamp = payload.message.timestamp || new Date().toISOString();
    target.lastMessageFromMe = payload.message.fromMe;
    if (selectedConversation.value?.id !== payload.conversationId && !payload.message.fromMe) {
      target.unreadCount = (target.unreadCount || 0) + 1;
    }
    // Mover al inicio de la lista
    conversations.value.splice(existingIndex, 1);
    conversations.value.unshift(target);
  } else if (payload.conversation) {
    conversations.value.unshift(payload.conversation);
  }
}

function onConversationRead(data: { conversationId: number }) {
  const conv = conversations.value.find((c) => c.id === data.conversationId);
  if (conv) {
    conv.unreadCount = 0;
  }
}

onMounted(() => {
  fetchStatus();
  fetchConversations();

  const socket = getSocket();
  socket.on('whatsapp:status', onStatusUpdate);
  socket.on('whatsapp:message', onNewMessage);
  socket.on('whatsapp:conversation_read', onConversationRead);
});

onUnmounted(() => {
  const socket = getSocket();
  socket.off('whatsapp:status', onStatusUpdate);
  socket.off('whatsapp:message', onNewMessage);
  socket.off('whatsapp:conversation_read', onConversationRead);
});
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Header Principal y Banner de Estado Baileys -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          CRM & WhatsApp Baileys
        </h1>
        <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Mensajería omnicanal en tiempo real, respuestas rápidas y pedidos desde el chat
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

    <!-- Contenedor Principal del CRM (Grilla 2 Columnas / Responsive Móvil) -->
    <div class="h-[calc(100vh-14rem)] min-h-[520px] rounded-3xl border border-surface-light-border bg-surface-light-card shadow-card dark:border-surface-dark-border dark:bg-surface-dark-card overflow-hidden grid grid-cols-1 md:grid-cols-12">
      <!-- SIDEBAR DE CHATS (Columna 4 de 12 en desktop) -->
      <div
        class="border-r border-surface-light-border dark:border-surface-dark-border flex flex-col h-full md:col-span-4 lg:col-span-4"
        :class="{ 'hidden md:flex': isMobileChatOpen }"
      >
        <!-- Buscador de Chats -->
        <div class="p-3 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-canvas/40 dark:bg-surface-dark-canvas/40">
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

        <!-- Lista de Conversaciones con v-auto-animate -->
        <div v-auto-animate class="flex-1 overflow-y-auto divide-y divide-surface-light-border/60 dark:divide-surface-dark-border/60">
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

      <!-- VENTANA DE CHAT ACTIVA (Columna 8 de 12 en desktop) -->
      <div
        class="flex flex-col h-full md:col-span-8 lg:col-span-8 bg-surface-light-canvas/20 dark:bg-surface-dark-canvas/20"
        :class="{ 'hidden md:flex': !isMobileChatOpen }"
      >
        <!-- CASO 1: HAY CHAT SELECCIONADO -->
        <template v-if="selectedConversation">
          <!-- Cabecera del Chat -->
          <div class="p-3.5 sm:p-4 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card flex items-center justify-between gap-2">
            <div class="flex items-center gap-3">
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

              <div>
                <h3 class="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
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

                  <span v-if="selectedConversation.customer?.address" class="hidden sm:inline-flex items-center gap-1 truncate max-w-[200px]">
                    <MapPin class="h-3 w-3 stroke-[2] text-slate-400" />
                    <span>{{ selectedConversation.customer.address }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Botón Rápido + Crear Pedido -->
            <button
              type="button"
              @click="handleOpenCreateOrder"
              class="inline-flex items-center gap-1.5 rounded-xl bg-hero-gradient px-3 py-1.5 text-xs font-extrabold text-white shadow-xs transition-transform active:scale-95 shrink-0"
            >
              <Plus class="h-3.5 w-3.5 stroke-[2.5]" />
              <span class="hidden sm:inline">Crear Pedido</span>
              <span class="sm:hidden">Pedido</span>
            </button>
          </div>

          <!-- Área de Mensajes (Scrollable) -->
          <div
            ref="messagesContainer"
            class="flex-1 overflow-y-auto p-4 space-y-3"
          >
            <!-- Skeleton o Loader -->
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

          <!-- Barra de Input y Acciones de Envío -->
          <div class="p-3 border-t border-surface-light-border dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card">
            <form @submit.prevent="handleSendMessage" class="flex items-center gap-2">
              <!-- Botón de Plantillas / Respuestas Rápidas -->
              <button
                type="button"
                @click="isQuickRepliesModalOpen = true"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-light-border bg-surface-light-canvas text-brand-800 hover:bg-brand-50 dark:border-surface-dark-border dark:bg-surface-dark-canvas dark:text-brand-darkText dark:hover:bg-brand-950/40 transition-colors"
                title="Respuestas rápidas"
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
          <div class="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
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
    </div>

    <!-- Modal de Vinculación y Código QR -->
    <CrmQrModal
      v-model:open="isQrModalOpen"
      :status="whatsappStatus"
      :qr="qrCodeDataUrl"
      :phone-number="connectedPhoneNumber"
      @refresh="fetchStatus"
    />

    <!-- Modal de Respuestas Rápidas / Plantillas -->
    <QuickRepliesModal
      v-model:open="isQuickRepliesModalOpen"
      @select="handleApplyQuickReply"
    />

    <!-- Modal de Creación de Pedido desde el Chat -->
    <OrderFormModal
      v-model:open="isOrderModalOpen"
      :order-to-edit="orderToPrefill"
      @saved="fetchConversations"
    />
  </div>
</template>
