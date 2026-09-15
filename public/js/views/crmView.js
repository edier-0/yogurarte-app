import { api } from '../api.js';
import { formatCOP, formatDate, formatDateTime, showToast, store, escapeHtml, buildWhatsAppUrl } from '../store.js';
import { dispatchSmartWhatsApp } from '../utils/whatsappDispatch.js';
import { openOrderModal } from './ordersView.js';
import { renderPaginationHtml, attachPaginationEvents } from '../components/pagination.js';

let crmCurrentSubmodule = 'chats'; // 'chats' | 'loyalty' | 'recurring' | 'quickReplies'
let currentActiveConvId = null;
let cachedConversations = [];
let cachedMessages = [];
let activeCustomer = null;
let socketInstance = null;
let searchQuery = '';
let currentTagFilter = 'ALL';
let wpStatus = { status: 'DISCONNECTED', qr: null, phoneNumber: null, user: null };
let qrModalInterval = null;
let hasMoreOldMessages = true;
let isLoadingOldMessages = false;
let cachedQuickReplies = [];

// Estado de paginación para Fidelización
let loyaltyCurrentPage = 1;
let loyaltySearchQuery = '';

/**
 * Inicializar o reutilizar la conexión Socket.IO
 */
function initSocket() {
  if (socketInstance) return socketInstance;
  if (typeof window.io === 'undefined') {
    console.warn('Socket.IO client not loaded');
    return null;
  }

  socketInstance = window.io();

  socketInstance.on('connect', () => {
    console.log('⚡ Conectado al servidor de WebSockets (CRM)');
  });

  socketInstance.on('whatsapp:status', (statusData) => {
    wpStatus = statusData;
    updateStatusUI();
    updateQRModalContent();
  });

  socketInstance.on('whatsapp:message', (payload) => {
    const { conversation, message } = payload;

    // Actualizar lista de conversaciones en memoria
    const existingIndex = cachedConversations.findIndex((c) => c.id === conversation.id);
    if (existingIndex >= 0) {
      cachedConversations[existingIndex] = {
        ...cachedConversations[existingIndex],
        ...conversation,
      };
    } else {
      cachedConversations.unshift(conversation);
    }

    // Reordenar por último mensaje
    cachedConversations.sort(
      (a, b) =>
        new Date(b.lastMessageTimestamp || 0).getTime() -
        new Date(a.lastMessageTimestamp || 0).getTime()
    );

    // Si el chat actual está abierto y corresponde a este mensaje
    if (currentActiveConvId === conversation.id) {
      if (!cachedMessages.some((m) => m.id === message.id)) {
        cachedMessages.push(message);
        appendMessageToChat(message);
        scrollToBottom();
      }
      if (!message.fromMe) {
        api.markCrmConversationAsRead(conversation.id).catch(console.error);
      }
    } else if (!message.fromMe) {
      const senderName = conversation.contactName || conversation.phoneNumber || 'Cliente';
      showToast(
        `💬 Mensaje de ${senderName}: ${escapeHtml(
          message.text || (message.messageType === 'STICKER' ? '✨ Sticker' : 'Archivo adjunto')
        )}`,
        'info'
      );
    }

    if (crmCurrentSubmodule === 'chats') {
      renderConversationList();
    }
  });

  socketInstance.on('whatsapp:media_updated', (payload) => {
    const { messageId, mediaUrl, mediaMimeType } = payload;
    const msg = cachedMessages.find((m) => m.messageId === messageId);
    if (msg) {
      msg.mediaUrl = mediaUrl;
      if (mediaMimeType) msg.mediaMimeType = mediaMimeType;

      const placeholderEl = document.querySelector(`[data-media-msg-id="${messageId}"]`);
      if (placeholderEl) {
        if (msg.messageType === 'STICKER') {
          placeholderEl.outerHTML = `
            <div class="crm-sticker-wrapper" data-media-msg-id="${messageId}">
              <img src="${mediaUrl}" alt="Sticker" class="crm-sticker-img loaded" loading="lazy" decoding="async" />
            </div>
          `;
        } else if (msg.messageType === 'IMAGE') {
          placeholderEl.outerHTML = `
            <img src="${mediaUrl}" alt="Foto" class="crm-msg-image loaded" loading="lazy" decoding="async" data-media-msg-id="${messageId}" onclick="window.open('${mediaUrl}', '_blank')" />
          `;
        } else if (msg.messageType === 'AUDIO') {
          placeholderEl.outerHTML = `
            <div class="crm-audio-player" data-media-msg-id="${messageId}">
              <audio controls preload="metadata" style="max-width: 220px; height: 36px;">
                <source src="${mediaUrl}" type="${mediaMimeType || 'audio/ogg'}" />
              </audio>
            </div>
          `;
        }
      }
    }
  });

  socketInstance.on('whatsapp:conversation_read', ({ conversationId }) => {
    const conv = cachedConversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.unreadCount = 0;
      if (crmCurrentSubmodule === 'chats') renderConversationList();
    }
  });

  return socketInstance;
}

/**
 * Renderizado principal de la vista CRM con navegación de 4 submódulos
 */
export async function renderCrm(container) {
  initSocket();

  container.innerHTML = `
    <!-- Barra de Submódulos CRM -->
    <div class="crm-submodule-nav" id="crmSubmoduleNav">
      <button class="crm-submodule-btn ${crmCurrentSubmodule === 'chats' ? 'active' : ''}" data-sub="chats">
        💬 Bandeja de Chats
      </button>
      <button class="crm-submodule-btn ${crmCurrentSubmodule === 'loyalty' ? 'active' : ''}" data-sub="loyalty">
        🎁 Fidelización (10+1)
      </button>
      <button class="crm-submodule-btn ${crmCurrentSubmodule === 'recurring' ? 'active' : ''}" data-sub="recurring">
        🔁 Compras Frecuentes
      </button>
      <button class="crm-submodule-btn ${crmCurrentSubmodule === 'quickReplies' ? 'active' : ''}" data-sub="quickReplies">
        ⚡ Plantillas Rápidas
      </button>
    </div>

    <!-- Contenedor Dinámico de Submódulos -->
    <div id="crmSubmoduleContainer" style="width: 100%;">
      <!-- Submódulo inyectado dinámicamente -->
    </div>
  `;

  // Attach submodule navigation listeners
  container.querySelectorAll('#crmSubmoduleNav .crm-submodule-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('#crmSubmoduleNav .crm-submodule-btn').forEach((b) => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      crmCurrentSubmodule = e.currentTarget.dataset.sub;
      loadSubmoduleView(container);
    });
  });

  await loadSubmoduleView(container);
}

/**
 * Enrutador de submódulos del CRM
 */
async function loadSubmoduleView(container) {
  const subContainer = container.querySelector('#crmSubmoduleContainer');
  if (!subContainer) return;

  if (crmCurrentSubmodule === 'chats') {
    await renderChatsSubmodule(subContainer);
  } else if (crmCurrentSubmodule === 'loyalty') {
    await renderLoyaltySubmodule(subContainer);
  } else if (crmCurrentSubmodule === 'recurring') {
    await renderRecurringSubmodule(subContainer);
  } else if (crmCurrentSubmodule === 'quickReplies') {
    await renderQuickRepliesSubmodule(subContainer);
  }
}

// ==========================================
// 💬 SUBMÓDULO 1: BANDEJA DE CHATS Y WHATSAPP
// ==========================================

async function renderChatsSubmodule(container) {
  container.innerHTML = `
    <div class="crm-layout" id="crmLayout">
      <!-- SIDEBAR IZQUIERDO: LISTA DE CONVERSACIONES -->
      <aside class="crm-conversations-sidebar">
        <div class="crm-sidebar-header">
          <div class="crm-status-bar">
            <div id="crmStatusBadge" class="crm-status-indicator disconnected">
              <span class="crm-status-dot"></span>
              <span id="crmStatusLabel">Desconectado</span>
            </div>
            <button class="btn btn-sm btn-outline" id="btnWhatsAppConnect" style="font-size: 0.78rem; padding: 5px 12px; font-weight: 700;">
              📱 Conectar / QR
            </button>
          </div>

          <div style="display: flex; gap: 8px; align-items: center; width: 100%; margin-bottom: 8px;">
            <div class="search-box input-with-icon" style="flex: 1; min-width: 0;">
              <span class="input-icon">🔍</span>
              <input 
                type="text" 
                id="crmSearchInput" 
                class="form-input" 
                placeholder="Buscar chat o teléfono..." 
                value="${searchQuery}"
                style="height: 36px; font-size: 0.86rem; width: 100%;"
              />
            </div>
            <button class="btn btn-sm btn-primary" id="btnStartNewChat" title="Iniciar chat con cualquier número" style="font-weight: 800; font-size: 0.8rem; padding: 0 10px; height: 36px; display: flex; align-items: center; gap: 4px; white-space: nowrap; flex-shrink: 0;">
              <span>➕</span> <span>Nuevo</span>
            </button>
          </div>

          <!-- Filtro de Etiquetas / Embudo -->
          <div style="display: flex; gap: 4px; overflow-x: auto; width: 100%; padding-bottom: 2px; scrollbar-width: none;">
            <button class="filter-chip ${currentTagFilter === 'ALL' ? 'active' : ''}" data-tag="ALL" style="font-size: 0.72rem; padding: 2px 8px;">Todos</button>
            <button class="filter-chip ${currentTagFilter === 'NUEVO' ? 'active' : ''}" data-tag="NUEVO" style="font-size: 0.72rem; padding: 2px 8px;">🆕 Nuevos</button>
            <button class="filter-chip ${currentTagFilter === 'INTERESADO' ? 'active' : ''}" data-tag="INTERESADO" style="font-size: 0.72rem; padding: 2px 8px;">⭐ Interesados</button>
            <button class="filter-chip ${currentTagFilter === 'PEDIDO_ACTIVO' ? 'active' : ''}" data-tag="PEDIDO_ACTIVO" style="font-size: 0.72rem; padding: 2px 8px;">🥛 Pedidos</button>
            <button class="filter-chip ${currentTagFilter === 'CLIENTE_FRECUENTE' ? 'active' : ''}" data-tag="CLIENTE_FRECUENTE" style="font-size: 0.72rem; padding: 2px 8px;">👑 Fieles</button>
          </div>
        </div>

        <ul class="crm-conv-list" id="crmConvList">
          <li style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
            Cargando conversaciones... ⏳
          </li>
        </ul>
      </aside>

      <!-- PANEL CENTRAL: CHAT ACTIVO -->
      <section class="crm-chat-panel" id="crmChatPanel">
        <div id="crmEmptyState" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 20px; color: var(--text-muted);">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">💬</div>
          <h3 style="font-weight: 800; color: var(--text-main); margin-bottom: 6px;">Centro de Mensajería YogurArte</h3>
          <p style="font-size: 0.88rem; max-width: 380px; line-height: 1.4; margin-bottom: 16px;">
            Selecciona una conversación de la izquierda o haz clic en <strong>➕ Nuevo</strong> para escribir a un cliente.
          </p>
          <button class="btn btn-primary" id="btnEmptyStateNewChat" style="font-weight: 800; padding: 10px 18px;">
            ➕ Iniciar Nuevo Chat de WhatsApp
          </button>
        </div>

        <div id="crmActiveChatContainer" style="display: none; height: 100%; flex-direction: column;">
          <!-- Encabezado del Chat -->
          <div class="crm-chat-header">
            <div class="crm-chat-header-left">
              <button class="crm-btn-back" id="btnBackToConvList" title="Volver a chats">
                ←
              </button>
              <div id="crmChatHeaderDetails" style="display: flex; align-items: center; gap: 10px; cursor: pointer; min-width: 0;" title="Ver ficha y pedidos del cliente">
                <div class="crm-conv-avatar" id="activeChatAvatar">?</div>
                <div style="min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <h4 class="crm-chat-title" id="activeChatName">Nombre del Cliente</h4>
                    <span id="activeChatTagBadge" class="crm-tag-badge NUEVO">🆕 Nuevo</span>
                  </div>
                  <div class="crm-chat-subtitle" id="activeChatPhone">+57 000 000 0000</div>
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
              <button class="btn btn-sm btn-outline crm-header-status-btn" id="btnWpStatusChatHeader" title="Estado de WhatsApp">
                <span class="crm-status-dot" id="crmHeaderStatusDot"></span>
                <span class="crm-header-status-text" id="crmHeaderStatusText">Sesión</span>
              </button>
              <button class="btn btn-sm btn-primary" id="btnFastOrder" style="font-weight: 800; font-size: 0.8rem; padding: 6px 10px;">
                🥛 Pedido
              </button>
              <button class="btn btn-sm btn-outline" id="btnToggleCustomerDrawer" title="Ver ficha del cliente" style="padding: 6px 10px; font-weight: 700;">
                👤
              </button>
            </div>
          </div>

          <!-- Mensajes -->
          <div class="crm-chat-messages" id="crmChatMessages"></div>

          <!-- Área de Composición y Respuestas Rápidas -->
          <div class="crm-input-wrapper">
            <!-- Barra de atajos dinámicos -->
            <div class="crm-quick-replies-bar" id="crmQuickChipsBar">
              <!-- Cargados dinámicamente -->
            </div>

            <form id="crmSendForm" class="crm-composer-row">
              <textarea 
                id="crmMsgInput" 
                class="crm-input-textarea" 
                rows="1" 
                placeholder="Escribe un mensaje o usa un atajo (/sabores, /precios, /pago)..." 
                required
              ></textarea>
              <button type="submit" class="crm-btn-send" id="btnSendCrmMsg" title="Enviar mensaje">
                ➤
              </button>
            </form>
          </div>
        </div>
      </section>

      <!-- OVERLAY PARA CERRAR SIDEBAR EN MÓVIL AL TOCAR AFUERA -->
      <div class="crm-customer-sidebar-overlay" id="crmCustomerSidebarOverlay"></div>

      <!-- SIDEBAR DERECHO: DETALLES DEL CLIENTE, FIDELIZACIÓN Y PEDIDOS -->
      <aside class="crm-customer-sidebar" id="crmCustomerSidebar">
        <div class="crm-customer-sidebar-header">
          <h4 style="font-weight: 800; margin: 0; font-size: 0.95rem; color: var(--primary);">
            👤 Ficha del Cliente
          </h4>
          <button class="crm-btn-close-customer-sidebar" id="btnCloseCustomerDrawer" title="Cerrar detalles">✕</button>
        </div>

        <div class="crm-customer-sidebar-body" id="crmCustomerBody">
          <!-- Inyectado dinámicamente -->
        </div>
      </aside>
    </div>
  `;

  // Attach event listeners for chats submodule
  attachChatSubmoduleEvents(container);

  // Cargar estado de WhatsApp y respuestas rápidas
  try {
    const [statusData, quickReplies] = await Promise.all([
      api.getWhatsAppStatus(),
      api.getCrmQuickReplies(),
    ]);
    wpStatus = statusData;
    cachedQuickReplies = quickReplies || [];
    updateStatusUI();
    renderQuickChips();
  } catch (err) {
    console.error('Error loading CRM initial data:', err);
  }

  // Cargar lista de conversaciones
  await loadConversations();
}

/**
 * Renderizar chips de respuestas rápidas sobre el input
 */
function renderQuickChips() {
  const bar = document.getElementById('crmQuickChipsBar');
  if (!bar) return;

  if (cachedQuickReplies.length === 0) {
    bar.innerHTML = `
      <button type="button" class="crm-quick-chip" data-shortcut="/sabores">🥛 Sabores</button>
      <button type="button" class="crm-quick-chip" data-shortcut="/precios">💰 Precios</button>
      <button type="button" class="crm-quick-chip" data-shortcut="/pago">💳 Nequi/Pago</button>
      <button type="button" class="crm-quick-chip" data-shortcut="/saludo">👋 Saludo</button>
      <button type="button" class="crm-quick-chip" data-shortcut="/fidelizacion">🎁 10+1 Gratis</button>
    `;
  } else {
    bar.innerHTML = cachedQuickReplies
      .map(
        (r) => `
      <button type="button" class="crm-quick-chip" data-shortcut="${escapeHtml(r.shortcut)}" title="${escapeHtml(r.title)}">
        ⚡ ${escapeHtml(r.shortcut)}
      </button>
    `
      )
      .join('');
  }

  bar.querySelectorAll('.crm-quick-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const shortcut = chip.dataset.shortcut;
      const found = cachedQuickReplies.find((q) => q.shortcut === shortcut);
      const input = document.getElementById('crmMsgInput');
      if (input) {
        if (found) {
          input.value = found.content;
        } else if (shortcut === '/sabores') {
          input.value = '🥛 *Sabores Artesanales YogurArte:*\n• Fresa 🍓\n• Mora 🫐\n• Melocotón 🍑\n• Guanábana 🍈\n• Arequipe 🍯\n• Natural 🍶\n\n¿Cuál te gustaría encargar?';
        } else if (shortcut === '/precios') {
          input.value = '💰 *Precios Oficiales YogurArte:*\n• Botella 1 Litro: $12.000 COP\n• Botella 2 Litros: $22.000 COP\n\n🛵 Domicilio en todo Fonseca.';
        } else if (shortcut === '/pago') {
          input.value = '💳 *Cuentas para Pago:*\n• Nequi: 3024581882\n• Bancolombia: A nombre de Edier / YogurArte\n\nPor favor nos envías el comprobante. ¡Gracias!';
        } else if (shortcut === '/saludo') {
          input.value = '👋 ¡Hola! Bienvenido a *YogurArte*, tu yogur artesanal 100% natural en Fonseca. ¿En qué te podemos consentir hoy?';
        } else if (shortcut === '/fidelizacion') {
          input.value = '🎁 ¡En *YogurArte* premiamos tu fidelidad! Por cada 10 botellas que compres, ¡te regalamos 1 botella de 1 Litro totalmente gratis! 🥛✨';
        }
        input.focus();
      }
    });
  });
}

/**
 * Asignar eventos del submódulo de chats
 */
function attachChatSubmoduleEvents(container) {
  // Búsqueda en chats
  const searchInput = container.querySelector('#crmSearchInput');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    loadConversations();
  });

  // Filtros de etiqueta de embudo
  container.querySelectorAll('.filter-chip[data-tag]').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      container.querySelectorAll('.filter-chip[data-tag]').forEach((c) => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentTagFilter = e.currentTarget.dataset.tag;
      loadConversations();
    });
  });

  // Botón nuevo chat
  container.querySelector('#btnStartNewChat')?.addEventListener('click', openNewChatModal);
  container.querySelector('#btnEmptyStateNewChat')?.addEventListener('click', openNewChatModal);

  // Botón conectar / QR
  container.querySelector('#btnWhatsAppConnect')?.addEventListener('click', openQRModal);
  container.querySelector('#btnWpStatusChatHeader')?.addEventListener('click', openQRModal);

  // Volver a la lista en móvil
  container.querySelector('#btnBackToConvList')?.addEventListener('click', () => {
    document.getElementById('crmLayout')?.classList.remove('viewing-chat');
  });

  // Toggle drawer de cliente en móvil/desktop (compatible con mobile-open y overlay active)
  const toggleCustomerDrawer = (forceState = null) => {
    const sidebar = document.getElementById('crmCustomerSidebar');
    const overlay = document.getElementById('crmCustomerSidebarOverlay');
    if (!sidebar || !overlay) return;

    const shouldOpen = forceState !== null ? forceState : !sidebar.classList.contains('mobile-open');
    if (shouldOpen) {
      sidebar.classList.add('mobile-open');
      overlay.classList.add('active');
    } else {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    }
  };

  container.querySelector('#btnToggleCustomerDrawer')?.addEventListener('click', () => toggleCustomerDrawer());
  container.querySelector('#crmChatHeaderDetails')?.addEventListener('click', () => toggleCustomerDrawer(true));
  container.querySelector('#btnCloseCustomerDrawer')?.addEventListener('click', () => toggleCustomerDrawer(false));
  container.querySelector('#crmCustomerSidebarOverlay')?.addEventListener('click', () => toggleCustomerDrawer(false));

  // Botón crear pedido rápido desde chat
  container.querySelector('#btnFastOrder')?.addEventListener('click', () => {
    const conv = cachedConversations.find((c) => c.id === currentActiveConvId);
    if (!conv) return;

    openOrderModal({
      customer: conv.customer
        ? { fullName: conv.customer.fullName, phone: conv.customer.phone, address: conv.customer.address }
        : { fullName: conv.contactName || '', phone: conv.phoneNumber || '', address: 'Fonseca' },
      customerId: conv.customerId || null,
      deliveryAddress: conv.customer?.address || 'Fonseca',
      isNewForCustomer: true,
    });
  });

  // Enviar mensaje
  container.querySelector('#crmSendForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('crmMsgInput');
    const text = input.value.trim();
    if (!text || !currentActiveConvId) return;

    const conv = cachedConversations.find((c) => c.id === currentActiveConvId);
    if (!conv) return;

    input.value = '';
    input.focus();

    try {
      const res = await api.sendCrmMessage(conv.remoteJid, text, {
        contactName: conv.contactName,
        customerId: conv.customerId,
      });

      if (res && res.message) {
        cachedMessages.push(res.message);
        appendMessageToChat(res.message);
        scrollToBottom();
      }
    } catch (err) {
      showToast(err.message || 'Error al enviar mensaje', 'danger');
    }
  });

  // Scroll infinito hacia arriba para cargar historial antiguo
  const messagesBox = container.querySelector('#crmChatMessages');
  messagesBox?.addEventListener('scroll', async () => {
    if (messagesBox.scrollTop === 0 && hasMoreOldMessages && !isLoadingOldMessages && cachedMessages.length > 0) {
      isLoadingOldMessages = true;
      const oldestMsg = cachedMessages[0];
      const prevScrollHeight = messagesBox.scrollHeight;

      try {
        const olderMessages = await api.getCrmMessages(currentActiveConvId, {
          limit: 50,
          beforeId: oldestMsg.id,
        });

        if (olderMessages && olderMessages.length > 0) {
          cachedMessages = [...olderMessages, ...cachedMessages];
          renderMessagesList(false);
          messagesBox.scrollTop = messagesBox.scrollHeight - prevScrollHeight;
        } else {
          hasMoreOldMessages = false;
        }
      } catch (err) {
        console.error('Error loading older messages:', err);
      } finally {
        isLoadingOldMessages = false;
      }
    }
  });
}

/**
 * Cargar y renderizar lista de conversaciones
 */
async function loadConversations() {
  const listEl = document.getElementById('crmConvList');
  if (!listEl) return;

  try {
    cachedConversations = await api.getCrmConversations(searchQuery, currentTagFilter);
    renderConversationList();
  } catch (err) {
    console.error('Error fetching CRM conversations:', err);
    listEl.innerHTML = `
      <li style="padding: 24px 16px; text-align: center; color: var(--danger); font-size: 0.88rem;">
        Error al cargar conversaciones ⚠️
      </li>
    `;
  }
}

function renderConversationList() {
  const listEl = document.getElementById('crmConvList');
  if (!listEl) return;

  if (cachedConversations.length === 0) {
    listEl.innerHTML = `
      <li style="padding: 36px 16px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
        No hay conversaciones en esta sección 📭
      </li>
    `;
    return;
  }

  listEl.innerHTML = cachedConversations
    .map((c) => {
      const isActive = c.id === currentActiveConvId;
      const name = c.contactName || (c.customer ? c.customer.fullName : c.phoneNumber || 'Desconocido');
      const initial = name.charAt(0).toUpperCase();
      const timeStr = c.lastMessageTimestamp ? formatConvTime(c.lastMessageTimestamp) : '';
      
      // Limpiar texto de vista previa para evitar saltos de línea y longitud desmedida
      const rawPreview = c.lastMessageText || 'Sin mensajes';
      const cleanPreview = rawPreview
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      const unreadBadge = c.unreadCount > 0 ? `<span class="crm-conv-unread">${c.unreadCount}</span>` : '';
      const tag = c.tag || 'NUEVO';

      let tagLabel = '🆕 Nuevo';
      if (tag === 'INTERESADO') tagLabel = '⭐ Interesado';
      if (tag === 'PEDIDO_ACTIVO') tagLabel = '🥛 Pedido';
      if (tag === 'CLIENTE_FRECUENTE') tagLabel = '👑 Fiel';
      if (tag === 'SEGUIMIENTO') tagLabel = '🔔 Seguimiento';

      return `
      <li class="crm-conv-item ${isActive ? 'active' : ''}" data-conv-id="${c.id}">
        <div class="crm-conv-avatar">${initial}</div>
        <div class="crm-conv-info">
          <div class="crm-conv-header-row">
            <span class="crm-conv-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
            <span class="crm-conv-time">${timeStr}</span>
          </div>
          <div class="crm-conv-preview-row">
            <span class="crm-conv-preview" title="${escapeHtml(cleanPreview)}">${c.lastMessageFromMe ? '<span class="crm-preview-check">✓</span> ' : ''}${escapeHtml(cleanPreview)}</span>
            <div class="crm-conv-badges">
              <span class="crm-tag-badge ${tag}" style="font-size: 0.65rem; padding: 1px 5px;">${tagLabel}</span>
              ${unreadBadge}
            </div>
          </div>
        </div>
      </li>
    `;
    })
    .join('');

  listEl.querySelectorAll('.crm-conv-item').forEach((item) => {
    item.addEventListener('click', () => {
      const convId = Number(item.dataset.convId);
      selectConversation(convId);
    });
  });
}

/**
 * Seleccionar y abrir un chat
 */
async function selectConversation(convId) {
  currentActiveConvId = convId;
  hasMoreOldMessages = true;
  isLoadingOldMessages = false;

  const conv = cachedConversations.find((c) => c.id === convId);
  if (!conv) return;

  conv.unreadCount = 0;
  renderConversationList();

  // Cambiar vista en móvil
  const layout = document.getElementById('crmLayout');
  layout?.classList.add('viewing-chat');

  const emptyState = document.getElementById('crmEmptyState');
  const activeContainer = document.getElementById('crmActiveChatContainer');
  if (emptyState) emptyState.style.display = 'none';
  if (activeContainer) activeContainer.style.display = 'flex';

  const name = conv.contactName || (conv.customer ? conv.customer.fullName : conv.phoneNumber || 'Desconocido');
  const titleEl = document.getElementById('activeChatName');
  const phoneEl = document.getElementById('activeChatPhone');
  const avatarEl = document.getElementById('activeChatAvatar');
  const tagBadgeEl = document.getElementById('activeChatTagBadge');

  if (titleEl) titleEl.textContent = name;
  if (phoneEl) phoneEl.textContent = conv.phoneNumber ? `+${conv.phoneNumber}` : conv.remoteJid;
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();

  const tag = conv.tag || 'NUEVO';
  if (tagBadgeEl) {
    tagBadgeEl.className = `crm-tag-badge ${tag}`;
    let tagLabel = '🆕 Nuevo';
    if (tag === 'INTERESADO') tagLabel = '⭐ Interesado';
    if (tag === 'PEDIDO_ACTIVO') tagLabel = '🥛 Pedido Activo';
    if (tag === 'CLIENTE_FRECUENTE') tagLabel = '👑 Cliente Fiel';
    if (tag === 'SEGUIMIENTO') tagLabel = '🔔 Seguimiento';
    tagBadgeEl.textContent = tagLabel;
  }

  // Cargar ficha de cliente lateral
  renderCustomerDetails(conv);

  // Cargar mensajes
  const messagesBox = document.getElementById('crmChatMessages');
  if (messagesBox) {
    messagesBox.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Cargando historial de mensajes... ⏳</div>';
  }

  try {
    cachedMessages = await api.getCrmMessages(convId, { limit: 50 });
    renderMessagesList(true);
  } catch (err) {
    console.error('Error loading messages:', err);
    if (messagesBox) {
      messagesBox.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger);">Error al cargar mensajes ⚠️</div>';
    }
  }
}

/**
 * Renderizar mensajes dentro del chat
 */
function renderMessagesList(autoScrollToBottom = true) {
  const box = document.getElementById('crmChatMessages');
  if (!box) return;

  if (cachedMessages.length === 0) {
    box.innerHTML = `
      <div style="text-align: center; padding: 30px 10px; color: var(--text-muted); font-size: 0.88rem;">
        No hay mensajes previos en esta conversación.<br>¡Escribe el primer mensaje para comenzar! 👋✨
      </div>
    `;
    return;
  }

  box.innerHTML = cachedMessages.map((m) => renderSingleMessageHtml(m)).join('');

  if (autoScrollToBottom) {
    scrollToBottom();
  }
}

function appendMessageToChat(message) {
  const box = document.getElementById('crmChatMessages');
  if (!box) return;

  const msgHtml = renderSingleMessageHtml(message);
  box.insertAdjacentHTML('beforeend', msgHtml);
}

function renderSingleMessageHtml(m) {
  const isMe = m.fromMe;
  const timeStr = m.timestamp ? formatMsgTime(m.timestamp) : '';
  let contentHtml = '';

  if (m.messageType === 'IMAGE') {
    if (m.mediaUrl) {
      contentHtml = `
        <img src="${m.mediaUrl}" alt="Foto" class="crm-msg-image loaded" loading="lazy" decoding="async" data-media-msg-id="${m.messageId}" onclick="window.open('${m.mediaUrl}', '_blank')" />
      `;
    } else {
      contentHtml = `<div class="crm-msg-placeholder" data-media-msg-id="${m.messageId}">📷 Foto (Cargando...)</div>`;
    }
  } else if (m.messageType === 'AUDIO') {
    if (m.mediaUrl) {
      contentHtml = `
        <div class="crm-audio-player" data-media-msg-id="${m.messageId}">
          <audio controls preload="metadata" style="max-width: 220px; height: 36px;">
            <source src="${m.mediaUrl}" type="${m.mediaMimeType || 'audio/ogg'}" />
          </audio>
        </div>
      `;
    } else {
      contentHtml = `<div class="crm-msg-placeholder" data-media-msg-id="${m.messageId}">🎵 Nota de voz</div>`;
    }
  } else if (m.messageType === 'STICKER') {
    if (m.mediaUrl) {
      contentHtml = `
        <div class="crm-sticker-wrapper" data-media-msg-id="${m.messageId}">
          <img src="${m.mediaUrl}" alt="Sticker" class="crm-sticker-img loaded" loading="lazy" decoding="async" />
        </div>
      `;
    } else {
      contentHtml = `<div class="crm-msg-placeholder" data-media-msg-id="${m.messageId}">✨ Sticker</div>`;
    }
  }

  if (m.text) {
    contentHtml += `<div class="crm-msg-text">${formatWhatsAppText(m.text)}</div>`;
  }

  return `
    <div class="crm-msg-row ${isMe ? 'outgoing' : 'incoming'}">
      <div class="crm-msg-bubble ${isMe ? 'outgoing' : 'incoming'}">
        ${contentHtml}
        <div class="crm-msg-meta">
          <span class="crm-msg-time">${timeStr}</span>
          ${isMe ? '<span class="crm-msg-check" title="Entregado">✓✓</span>' : ''}
        </div>
      </div>
    </div>
  `;
}

function scrollToBottom() {
  const box = document.getElementById('crmChatMessages');
  if (box) {
    box.scrollTop = box.scrollHeight;
  }
}

/**
 * Renderizar la ficha del cliente en el lateral derecho
 */
function renderCustomerDetails(conv) {
  const body = document.getElementById('crmCustomerBody');
  if (!body) return;

  const customer = conv.customer;
  const tag = conv.tag || 'NUEVO';

  // Cálculo de fidelización
  let loyaltyHtml = '';
  if (customer) {
    const orders = customer.orders || [];
    const totalBottles = orders.reduce((sum, o) => sum + (o.quantityBottles || 1), 0);
    const redeemed = customer.loyaltyRedeemedCount || 0;
    const netBottles = Math.max(0, totalBottles - redeemed * 10);
    const currentCycle = netBottles % 10;
    const rewardsAvailable = Math.floor(netBottles / 10);
    const progressPercent = Math.min(100, Math.round((currentCycle / 10) * 100));

    loyaltyHtml = `
      <div style="background: #FAF5FF; border: 1.5px solid #D8B4FE; border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 0.82rem; font-weight: 800; color: #7E22CE;">🎁 Fidelización (10+1)</span>
          <span style="font-size: 0.76rem; font-weight: 800; color: #7E22CE;">${currentCycle} / 10 Botellas</span>
        </div>
        <div class="crm-progress-track" style="margin-bottom: 8px;">
          <div class="crm-progress-fill ${rewardsAvailable > 0 ? 'ready' : ''}" style="width: ${progressPercent}%;"></div>
        </div>
        ${
          rewardsAvailable > 0
            ? `
          <div style="display: flex; gap: 6px; align-items: center; justify-content: space-between;">
            <span style="font-size: 0.76rem; font-weight: 800; color: #15803D;">⭐ ¡${rewardsAvailable}L Gratis Disponible!</span>
            <button class="btn btn-sm btn-accent" id="btnRedeemLoyaltyChat" style="font-size: 0.72rem; padding: 3px 8px; font-weight: 800;">
              🎁 Canjear Premio
            </button>
          </div>
        `
            : `
          <div style="font-size: 0.72rem; color: #6B21A8; text-align: center;">
            Faltan <strong>${10 - currentCycle} botellas</strong> para ganar 1L gratis
          </div>
        `
        }
      </div>
    `;
  }

  body.innerHTML = `
    <!-- Selector de Etiqueta de Embudo -->
    <div style="margin-bottom: 12px;">
      <label style="font-size: 0.74rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Etiqueta / Estado</label>
      <select id="crmTagSelect" class="orders-select-item" style="height: 34px; font-size: 0.82rem; font-weight: 700; width: 100%; margin-top: 4px;">
        <option value="NUEVO" ${tag === 'NUEVO' ? 'selected' : ''}>🆕 Nuevo Contacto</option>
        <option value="INTERESADO" ${tag === 'INTERESADO' ? 'selected' : ''}>⭐ Interesado</option>
        <option value="PEDIDO_ACTIVO" ${tag === 'PEDIDO_ACTIVO' ? 'selected' : ''}>🥛 Pedido en Proceso</option>
        <option value="CLIENTE_FRECUENTE" ${tag === 'CLIENTE_FRECUENTE' ? 'selected' : ''}>👑 Cliente Frecuente</option>
        <option value="SEGUIMIENTO" ${tag === 'SEGUIMIENTO' ? 'selected' : ''}>🔔 En Seguimiento</option>
      </select>
    </div>

    ${loyaltyHtml}

    ${
      customer
        ? `
      <div style="background: var(--bg-app); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
        <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
          ${escapeHtml(customer.fullName)}
        </div>
        <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 2px;">
          📞 ${escapeHtml(customer.phone)}
        </div>
        <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">
          📍 ${escapeHtml(customer.address || 'Fonseca')}
        </div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-outline" id="btnScheduleRecurringFromChat" style="font-size: 0.74rem; padding: 4px 8px; font-weight: 700; color: #0369A1; border-color: #BAE6FD;">
            🔁 Programar Compra Frecuente
          </button>
        </div>
      </div>

      <!-- Pedidos Recientes -->
      <div style="font-size: 0.82rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">
        Últimos Pedidos
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${
          customer.orders && customer.orders.length > 0
            ? customer.orders
                .map(
                  (o) => `
            <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: var(--primary);">${escapeHtml(o.orderNumber)}</strong>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${formatDate(o.deliveryDate || o.orderDate || new Date())}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 800; color: #15803D;">${formatCOP(o.totalAmount)}</div>
                <span class="badge ${o.paymentStatus === 'PAID' ? 'badge-success' : 'badge-danger'}" style="font-size: 0.65rem;">
                  ${o.paymentStatus === 'PAID' ? 'Al Día' : 'Pendiente'}
                </span>
              </div>
            </div>
          `
                )
                .join('')
            : '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 12px;">Sin pedidos registrados aún</div>'
        }
      </div>
    `
        : `
      <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: var(--radius-md); padding: 12px; text-align: center;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #B45309; margin-bottom: 6px;">
          Número no vinculado a un cliente
        </div>
        <p style="font-size: 0.78rem; color: #92400E; margin-bottom: 10px;">
          Vincula esta conversación con un cliente existente o regístralo para activar el programa de fidelización y pedidos frecuentes.
        </p>
        <button class="btn btn-sm btn-primary" id="btnLinkCustomerChat" style="font-size: 0.78rem; font-weight: 700; width: 100%;">
          🤝 Vincular con Cliente
        </button>
      </div>
    `
    }
  `;

  // Cambiar etiqueta de conversación
  body.querySelector('#crmTagSelect')?.addEventListener('change', async (e) => {
    const newTag = e.target.value;
    try {
      await api.updateCrmConversationTag(conv.id, newTag);
      conv.tag = newTag;
      renderConversationList();
      const badge = document.getElementById('activeChatTagBadge');
      if (badge) {
        badge.className = `crm-tag-badge ${newTag}`;
        let tagLabel = '🆕 Nuevo';
        if (newTag === 'INTERESADO') tagLabel = '⭐ Interesado';
        if (newTag === 'PEDIDO_ACTIVO') tagLabel = '🥛 Pedido Activo';
        if (newTag === 'CLIENTE_FRECUENTE') tagLabel = '👑 Cliente Fiel';
        if (newTag === 'SEGUIMIENTO') tagLabel = '🔔 Seguimiento';
        badge.textContent = tagLabel;
      }
      showToast('Etiqueta actualizada exitosamente ✨', 'success');
    } catch (err) {
      showToast('Error al actualizar etiqueta', 'danger');
    }
  });

  // Botón canjear premio desde chat
  body.querySelector('#btnRedeemLoyaltyChat')?.addEventListener('click', () => {
    if (customer) {
      openOrderModal({
        customer: { fullName: customer.fullName, phone: customer.phone, address: customer.address },
        customerId: customer.id,
        deliveryAddress: customer.address,
        isNewForCustomer: true,
        isLoyaltyReward: true,
        discount: 12000,
        notes: '[🎁 Recompensa 10+1: 1L Gratis Canjeado]',
      });
    }
  });

  // Botón programar compra frecuente desde chat
  body.querySelector('#btnScheduleRecurringFromChat')?.addEventListener('click', () => {
    if (customer) {
      openRecurringModal(null, customer);
    }
  });

  // Botón vincular cliente
  body.querySelector('#btnLinkCustomerChat')?.addEventListener('click', () => {
    openLinkCustomerModal(conv);
  });
}

// ==========================================
// 🎁 SUBMÓDULO 2: FIDELIZACIÓN (10+1 GRATIS) CON PAGINACIÓN
// ==========================================

async function renderLoyaltySubmodule(container) {
  loyaltyCurrentPage = 1;

  container.innerHTML = `
    <div style="background: #FFFFFF; border-radius: var(--radius-lg); border: 1px solid var(--border-color); padding: 18px; box-shadow: var(--shadow-sm);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
        <div>
          <h3 style="font-weight: 800; color: var(--primary); margin: 0; font-size: 1.15rem;">
            🎁 Programa de Fidelización "10 + 1 Yogur Gratis"
          </h3>
          <p style="font-size: 0.84rem; color: var(--text-muted); margin: 4px 0 0 0;">
            Recompensa automática: por cada 10 botellas compradas, el cliente gana 1 botella de 1L totalmente gratis.
          </p>
        </div>
        <div class="search-box input-with-icon" style="min-width: 240px;">
          <span class="input-icon">🔍</span>
          <input type="text" id="loyaltySearchInput" class="form-input" placeholder="Buscar cliente..." value="${loyaltySearchQuery}" style="height: 38px;" />
        </div>
      </div>

      <div id="loyaltyListContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px;">
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          Cargando datos de fidelización... ⏳
        </div>
      </div>

      <!-- Contenedor de Paginación -->
      <div id="loyaltyPaginationWrapper" style="width: 100%;"></div>
    </div>
  `;

  const searchInput = container.querySelector('#loyaltySearchInput');
  searchInput?.addEventListener('input', (e) => {
    loyaltySearchQuery = e.target.value;
    loyaltyCurrentPage = 1;
    loadLoyaltyList(container);
  });

  await loadLoyaltyList(container);
}

async function loadLoyaltyList(container) {
  const listEl = container.querySelector('#loyaltyListContainer');
  const paginationWrapper = container.querySelector('#loyaltyPaginationWrapper');
  if (!listEl) return;

  try {
    const res = await api.getCrmLoyalty(loyaltySearchQuery, loyaltyCurrentPage, 12);
    const data = Array.isArray(res) ? res : res.customers || [];
    const pagination = res.pagination || {
      page: loyaltyCurrentPage,
      limit: 12,
      totalItems: data.length,
      totalPages: Math.ceil(data.length / 12) || 1,
    };

    if (!data || data.length === 0) {
      listEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          No se encontraron clientes registrados en el programa 📭
        </div>
      `;
      if (paginationWrapper) paginationWrapper.innerHTML = '';
      return;
    }

    listEl.innerHTML = data
      .map((c) => {
        const hasReward = c.hasAvailableReward;
        return `
        <div class="crm-loyalty-card" style="${hasReward ? 'border-color: #86EFAC; background: #F0FDF4;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <strong style="font-size: 0.95rem; color: var(--text-main);">${escapeHtml(c.fullName)}</strong>
              <div style="font-size: 0.78rem; color: var(--text-muted);">📞 ${escapeHtml(c.phone)}</div>
            </div>
            ${
              hasReward
                ? `<span style="background: #15803D; color: #FFFFFF; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 999px;">⭐ ¡${c.rewardsAvailable}L GRATIS!</span>`
                : `<span style="background: #EDE9FE; color: #6D28D9; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 999px;">${c.currentCycleBottles}/10</span>`
            }
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.76rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">
              <span>Progreso de Ciclo</span>
              <span>${c.currentCycleBottles} de 10 botellas</span>
            </div>
            <div class="crm-progress-track">
              <div class="crm-progress-fill ${hasReward ? 'ready' : ''}" style="width: ${c.progressPercent}%;"></div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 8px;">
            <span>Total Compradas: <strong>${c.totalBottles}</strong></span>
            <span>Premios Canjeados: <strong>${c.redeemedCount}</strong></span>
          </div>

          <div style="display: flex; gap: 6px; margin-top: 4px;">
            ${
              hasReward
                ? `
              <button class="btn btn-sm btn-accent btn-redeem-card" data-id="${c.id}" data-name="${escapeHtml(c.fullName)}" data-phone="${escapeHtml(c.phone)}" data-address="${escapeHtml(c.address || 'Fonseca')}" style="flex: 1; font-weight: 800; font-size: 0.78rem;">
                🎉 Canjear 1L Gratis
              </button>
            `
                : `
              <button class="btn btn-sm btn-outline btn-notify-loyalty-card" data-name="${escapeHtml(c.fullName)}" data-phone="${escapeHtml(c.phone)}" data-bottles="${c.currentCycleBottles}" style="flex: 1; font-size: 0.76rem; font-weight: 700; color: #7E22CE; border-color: #D8B4FE;">
                💬 Avisar Progreso por WhatsApp
              </button>
            `
            }
          </div>
        </div>
      `;
      })
      .join('');

    // Renderizar paginación
    if (paginationWrapper) {
      paginationWrapper.innerHTML = renderPaginationHtml({
        currentPage: pagination.page,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        pageSize: pagination.limit,
        itemName: 'clientes',
        paginationId: 'loyaltyPaginationControls',
      });

      attachPaginationEvents(
        paginationWrapper,
        'loyaltyPaginationControls',
        (newPage) => {
          loyaltyCurrentPage = newPage;
          loadLoyaltyList(container);
        },
        container
      );
    }

    // Attach card actions
    listEl.querySelectorAll('.btn-redeem-card').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const { id, name, phone, address } = e.currentTarget.dataset;
        openOrderModal({
          customer: { fullName: name, phone, address },
          customerId: Number(id),
          deliveryAddress: address,
          isNewForCustomer: true,
          isLoyaltyReward: true,
          discount: 12000,
          notes: '[🎁 Recompensa 10+1: 1L Gratis Canjeado]',
        });
      });
    });

    listEl.querySelectorAll('.btn-notify-loyalty-card').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const { name, phone, bottles } = e.currentTarget.dataset;
        const faltan = 10 - Number(bottles);
        const msg = `¡Hola *${name}*! 🥛✨ En *YogurArte* premiamos tu preferencia. Llevas *${bottles} de 10 botellas* acumuladas. ¡Solo te faltan *${faltan} botellas* para ganar tu próximo yogur de 1 Litro totalmente gratis! 🍓🎁 ¿Te gustaría encargar hoy?`;
        await dispatchSmartWhatsApp({
          phone,
          text: msg,
          successToast: '✅ Recordatorio de fidelización enviado',
        });
      });
    });
  } catch (err) {
    console.error('Error fetching loyalty overview:', err);
    listEl.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--danger);">
        Error al cargar programa de fidelización ⚠️
      </div>
    `;
    if (paginationWrapper) paginationWrapper.innerHTML = '';
  }
}

// ==========================================
// 🔁 SUBMÓDULO 3: COMPRAS FRECUENTES
// ==========================================

async function renderRecurringSubmodule(container) {
  container.innerHTML = `
    <div style="background: #FFFFFF; border-radius: var(--radius-lg); border: 1px solid var(--border-color); padding: 18px; box-shadow: var(--shadow-sm);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
        <div>
          <h3 style="font-weight: 800; color: var(--primary); margin: 0; font-size: 1.15rem;">
            🔁 Compras Frecuentes y Recordatorios Automáticos
          </h3>
          <p style="font-size: 0.84rem; color: var(--text-muted); margin: 4px 0 0 0;">
            Programa entregas rutinarias (cada 7, 15 o 30 días) y avisa o crea el pedido de tus clientes con 1 solo clic.
          </p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <select id="recurringFilterSelect" class="orders-select-item" style="height: 38px; font-weight: 700;">
            <option value="ALL">📋 Todas las Programaciones</option>
            <option value="TODAY">🚨 Para Hoy / Vencidas</option>
            <option value="UPCOMING">📅 Próximos 3 Días</option>
          </select>
          <button class="btn btn-primary" id="btnNewRecurringSchedule" style="font-weight: 800; height: 38px; white-space: nowrap;">
            + Programar Compra Frecuente
          </button>
        </div>
      </div>

      <div id="recurringListContainer" class="crm-recurring-grid">
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          Cargando programaciones... ⏳
        </div>
      </div>
    </div>
  `;

  const filterSelect = container.querySelector('#recurringFilterSelect');
  filterSelect?.addEventListener('change', (e) => {
    loadRecurringList(container, e.target.value);
  });

  container.querySelector('#btnNewRecurringSchedule')?.addEventListener('click', () => {
    openRecurringModal();
  });

  await loadRecurringList(container);
}

async function loadRecurringList(container, filter = 'ALL') {
  const listEl = container.querySelector('#recurringListContainer');
  if (!listEl) return;

  try {
    const schedules = await api.getCrmRecurring(filter);

    if (!schedules || schedules.length === 0) {
      listEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          No hay compras frecuentes programadas en esta vista 📭
        </div>
      `;
      return;
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    listEl.innerHTML = schedules
      .map((s) => {
        const nextDateStr = String(s.nextDate).slice(0, 10);
        const isDue = nextDateStr <= todayStr;
        const customer = s.customer;

        return `
        <div class="crm-recurring-card ${isDue ? 'is-due' : ''}">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <div>
                <strong style="font-size: 0.95rem; color: var(--text-main);">${escapeHtml(customer?.fullName || 'Cliente')}</strong>
                <div style="font-size: 0.78rem; color: var(--text-muted);">📞 ${escapeHtml(customer?.phone || '')}</div>
              </div>
              <span style="background: ${isDue ? '#DC2626' : '#EDE9FE'}; color: ${isDue ? '#FFFFFF' : '#6D28D9'}; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 999px;">
                ${isDue ? '🚨 Toca Hoy' : `Cada ${s.frequencyDays} días`}
              </span>
            </div>

            <div style="background: rgba(0,0,0,0.03); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 0.82rem; margin-bottom: 8px;">
              <div>🥛 <strong>${s.quantity}x Botella ${s.bottleSize} (${escapeHtml(s.preferredFlavor)})</strong></div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                Próxima entrega: <strong>${formatDate(s.nextDate)}</strong>
              </div>
              ${s.notes ? `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; font-style: italic;">📝 ${escapeHtml(s.notes)}</div>` : ''}
            </div>
          </div>

          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn btn-sm btn-whatsapp btn-remind-recurring" data-id="${s.id}" data-name="${escapeHtml(customer?.fullName || '')}" data-phone="${escapeHtml(customer?.phone || '')}" data-flavor="${escapeHtml(s.preferredFlavor)}" data-size="${s.bottleSize}" data-qty="${s.quantity}" style="flex: 1; font-weight: 700; font-size: 0.76rem;">
              💬 Recordar WhatsApp
            </button>
            <button class="btn btn-sm btn-primary btn-trigger-recurring" data-id="${s.id}" style="flex: 1; font-weight: 800; font-size: 0.76rem;">
              🥛 Crear Pedido
            </button>
            <button class="btn btn-sm btn-outline btn-delete-recurring" data-id="${s.id}" title="Eliminar programación" style="color: var(--danger); padding: 4px 8px;">
              🗑️
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    // Attach actions
    listEl.querySelectorAll('.btn-remind-recurring').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const { name, phone, flavor, size, qty } = e.currentTarget.dataset;
        const msg = `¡Hola *${name}*! 🥛🍓 Te saludamos de *YogurArte*. Hoy te corresponde tu entrega habitual de *${qty}x Botella ${size} de ${flavor}*. ¿Te lo preparamos para envío hoy? ✨🛵`;
        await dispatchSmartWhatsApp({
          phone,
          text: msg,
          successToast: '✅ Recordatorio de compra frecuente enviado',
        });
      });
    });

    listEl.querySelectorAll('.btn-trigger-recurring').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        try {
          const res = await api.triggerCrmRecurringOrder(id);
          showToast(`¡${res.message || 'Pedido creado exitosamente'}! 🥛✨`, 'success');
          loadRecurringList(container, filter);
        } catch (err) {
          showToast(err.message || 'Error al crear pedido', 'danger');
        }
      });
    });

    listEl.querySelectorAll('.btn-delete-recurring').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.currentTarget.dataset.id);
        if (confirm('¿Deseas eliminar esta programación de compra frecuente?')) {
          try {
            await api.deleteCrmRecurring(id);
            showToast('Programación eliminada exitosamente', 'success');
            loadRecurringList(container, filter);
          } catch (err) {
            showToast('Error al eliminar', 'danger');
          }
        }
      });
    });
  } catch (err) {
    console.error('Error loading recurring schedules:', err);
    listEl.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--danger);">
        Error al cargar compras frecuentes ⚠️
      </div>
    `;
  }
}

// ==========================================
// ⚡ SUBMÓDULO 4: PLANTILLAS Y RESPUESTAS
// ==========================================

async function renderQuickRepliesSubmodule(container) {
  container.innerHTML = `
    <div style="background: #FFFFFF; border-radius: var(--radius-lg); border: 1px solid var(--border-color); padding: 18px; box-shadow: var(--shadow-sm);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
        <div>
          <h3 style="font-weight: 800; color: var(--primary); margin: 0; font-size: 1.15rem;">
            ⚡ Plantillas y Respuestas Rápidas
          </h3>
          <p style="font-size: 0.84rem; color: var(--text-muted); margin: 4px 0 0 0;">
            Crea atajos para responder en 1 solo clic dudas frecuentes sobre precios, sabores, medios de pago y catálogos.
          </p>
        </div>
        <button class="btn btn-primary" id="btnNewQuickReply" style="font-weight: 800; height: 38px;">
          + Nueva Plantilla
        </button>
      </div>

      <div id="quickRepliesListContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px;">
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          Cargando plantillas... ⏳
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btnNewQuickReply')?.addEventListener('click', () => {
    openQuickReplyModal();
  });

  await loadQuickRepliesList(container);
}

async function loadQuickRepliesList(container) {
  const listEl = container.querySelector('#quickRepliesListContainer');
  if (!listEl) return;

  try {
    const replies = await api.getCrmQuickReplies();
    cachedQuickReplies = replies || [];

    if (cachedQuickReplies.length === 0) {
      listEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
          No hay plantillas creadas aún. Haz clic en <strong>+ Nueva Plantilla</strong>.
        </div>
      `;
      return;
    }

    listEl.innerHTML = cachedQuickReplies
      .map(
        (r) => `
      <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; box-shadow: var(--shadow-sm);">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="font-size: 0.92rem; color: var(--primary);">${escapeHtml(r.title)}</strong>
            <span style="background: #EDE9FE; color: #6D28D9; font-weight: 800; font-size: 0.72rem; padding: 2px 7px; border-radius: 4px;">
              ${escapeHtml(r.shortcut)}
            </span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-main); white-space: pre-line; background: var(--bg-app); padding: 8px 10px; border-radius: var(--radius-sm); line-height: 1.4; max-height: 140px; overflow-y: auto;">
            ${escapeHtml(r.content)}
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px dashed var(--border-color); padding-top: 10px; margin-top: auto;">
          <button type="button" class="btn btn-sm btn-outline btn-edit-reply" data-id="${r.id}" style="font-size: 0.82rem; padding: 6px 12px; font-weight: 700; min-height: 36px; display: inline-flex; align-items: center; gap: 4px;">
            ✏️ Editar
          </button>
          <button type="button" class="btn btn-sm btn-outline btn-delete-reply" data-id="${r.id}" style="font-size: 0.82rem; padding: 6px 12px; color: var(--danger); font-weight: 700; min-height: 36px; display: inline-flex; align-items: center; gap: 4px;">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    `
      )
      .join('');

    listEl.querySelectorAll('.btn-edit-reply').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = Number(e.currentTarget.dataset.id);
        const reply = cachedQuickReplies.find((r) => r.id === id);
        if (reply) openQuickReplyModal(reply);
      });
    });

    listEl.querySelectorAll('.btn-delete-reply').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = Number(e.currentTarget.dataset.id);
        if (confirm('¿Deseas eliminar esta plantilla rápida?')) {
          try {
            await api.deleteCrmQuickReply(id);
            showToast('Plantilla eliminada exitosamente', 'success');
            loadQuickRepliesList(container);
          } catch (err) {
            showToast('Error al eliminar plantilla', 'danger');
          }
        }
      });
    });
  } catch (err) {
    console.error('Error loading quick replies:', err);
    listEl.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--danger);">
        Error al cargar plantillas ⚠️
      </div>
    `;
  }
}

// ==========================================
// 🛠️ MODALES (QR, NUEVO CHAT, RECURRENTES, PLANTILLAS, VINCULAR CLIENTE)
// ==========================================

function openQRModal() {
  const modalContainer = document.getElementById('modalContainer');
  if (!modalContainer) return;

  const closeQRModal = () => {
    modalContainer.innerHTML = '';
    modalContainer.style.display = '';
    if (qrModalInterval) clearInterval(qrModalInterval);
  };

  modalContainer.innerHTML = `
    <div class="modal-overlay active modal-backdrop" id="crmQrModalOverlay">
      <div class="modal-card" style="max-width: 420px; text-align: center;">
        <div class="modal-header">
          <h3 class="modal-title" style="font-size: 1.1rem; font-weight: 800;">📱 Conexión de WhatsApp</h3>
          <button type="button" class="modal-close-btn" id="btnCloseQrModal">✕</button>
        </div>
        <div class="modal-body" id="crmQrModalBody">
          <div style="padding: 20px;">Cargando estado... ⏳</div>
        </div>
      </div>
    </div>
  `;

  updateQRModalContent();

  if (qrModalInterval) clearInterval(qrModalInterval);
  qrModalInterval = setInterval(async () => {
    try {
      wpStatus = await api.getWhatsAppStatus();
      updateStatusUI();
      updateQRModalContent();
    } catch (e) {}
  }, 4000);

  modalContainer.querySelector('#btnCloseQrModal')?.addEventListener('click', closeQRModal);
  modalContainer.querySelector('#crmQrModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'crmQrModalOverlay') closeQRModal();
  });
}

function updateQRModalContent() {
  const body = document.getElementById('crmQrModalBody');
  if (!body) return;

  if (wpStatus.status === 'CONNECTED') {
    body.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <div style="font-size: 3.5rem; margin-bottom: 10px;">🟢</div>
        <h4 style="font-weight: 800; color: #15803D; margin-bottom: 6px;">¡WhatsApp Conectado!</h4>
        <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px;">
          Línea oficial activa: <strong>${wpStatus.phoneNumber || wpStatus.user?.id || 'YogurArte'}</strong>
        </p>
        <button class="btn btn-outline" id="btnModalWpLogout" style="color: var(--danger); border-color: var(--danger); font-weight: 700;">
          Desconectar Sesión
        </button>
      </div>
    `;
    body.querySelector('#btnModalWpLogout')?.addEventListener('click', async () => {
      if (confirm('¿Deseas cerrar la sesión de WhatsApp de YogurArte?')) {
        await api.logoutWhatsApp();
        wpStatus.status = 'DISCONNECTED';
        updateStatusUI();
        updateQRModalContent();
      }
    });
  } else if (wpStatus.qr) {
    body.innerHTML = `
      <div style="padding: 10px; text-align: center;">
        <p style="font-size: 0.84rem; color: var(--text-main); margin-bottom: 12px;">
          Abre <strong>WhatsApp</strong> en tu teléfono > Menú / Ajustes > <strong>Dispositivos vinculados</strong> y escanea este código:
        </p>
        <div style="background: #FFFFFF; padding: 12px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #E2E8F0;">
          <img src="${wpStatus.qr}" alt="Código QR WhatsApp" style="width: 220px; height: 220px; display: block;" />
        </div>
        <div style="margin-top: 14px;">
          <button class="btn btn-sm btn-outline" id="btnRefreshQr" style="font-size: 0.8rem; font-weight: 700;">
            🔄 Regenerar QR
          </button>
        </div>
      </div>
    `;
    body.querySelector('#btnRefreshQr')?.addEventListener('click', async () => {
      showToast('Regenerando código QR...', 'info');
      await api.refreshCrmQR();
    });
  } else {
    body.innerHTML = `
      <div style="padding: 24px; text-align: center;">
        <div style="font-size: 2.8rem; margin-bottom: 10px;">⏳</div>
        <h4 style="font-weight: 800; color: var(--text-main); margin-bottom: 6px;">Iniciando WhatsApp...</h4>
        <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 16px;">
          Generando código de vinculación seguro. Un momento por favor...
        </p>
        <button class="btn btn-sm btn-primary" id="btnForceStartWp">
          🔄 Generar Código QR
        </button>
      </div>
    `;
    body.querySelector('#btnForceStartWp')?.addEventListener('click', async () => {
      await api.refreshCrmQR();
    });
  }
}

function updateStatusUI() {
  const badge = document.getElementById('crmStatusBadge');
  const label = document.getElementById('crmStatusLabel');
  const headerBtn = document.getElementById('btnWpStatusChatHeader');
  const headerDot = document.getElementById('crmHeaderStatusDot');
  const headerText = document.getElementById('crmHeaderStatusText');

  const status = wpStatus.status;

  if (badge && label) {
    badge.className = `crm-status-indicator ${status.toLowerCase()}`;
    if (status === 'CONNECTED') label.textContent = 'En Línea';
    else if (status === 'CONNECTING') label.textContent = 'Conectando...';
    else label.textContent = 'Desconectado';
  }

  if (headerBtn) {
    headerBtn.className = `btn btn-sm btn-outline crm-header-status-btn ${status.toLowerCase()}`;
  }

  if (headerText) {
    if (status === 'CONNECTED') headerText.textContent = 'En Línea';
    else if (status === 'CONNECTING') headerText.textContent = 'Conectando';
    else headerText.textContent = 'Desconectado';
  }
}

function openNewChatModal() {
  const modalContainer = document.getElementById('modalContainer');
  if (!modalContainer) return;

  const closeNewChatModal = () => {
    modalContainer.innerHTML = '';
    modalContainer.style.display = '';
  };

  modalContainer.innerHTML = `
    <div class="modal-overlay active modal-backdrop" id="crmNewChatModalOverlay">
      <div class="modal-card" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title" style="font-size: 1.05rem; font-weight: 800;">➕ Iniciar Nuevo Chat</h3>
          <button type="button" class="modal-close-btn" id="btnCloseNewChatModal">✕</button>
        </div>
        <form id="formNewChat" style="padding: 16px;">
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 0.8rem;">Número de WhatsApp *</label>
            <input type="tel" id="newChatPhone" class="form-input" placeholder="Ej: 3001234567" required style="font-weight: 700;" />
          </div>
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-size: 0.8rem;">Nombre del Contacto (Opcional)</label>
            <input type="text" id="newChatName" class="form-input" placeholder="Ej: María Gómez" />
          </div>
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="font-size: 0.8rem;">Primer Mensaje</label>
            <textarea id="newChatInitialMsg" class="form-input" rows="2" placeholder="¡Hola! Te saludamos de YogurArte..."></textarea>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="btn btn-outline" id="btnCancelNewChat">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 800;">🚀 Enviar y Abrir Chat</button>
          </div>
        </form>
      </div>
    </div>
  `;

  modalContainer.querySelector('#btnCloseNewChatModal')?.addEventListener('click', closeNewChatModal);
  modalContainer.querySelector('#btnCancelNewChat')?.addEventListener('click', closeNewChatModal);
  modalContainer.querySelector('#crmNewChatModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'crmNewChatModalOverlay') closeNewChatModal();
  });

  modalContainer.querySelector('#formNewChat')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('newChatPhone').value.trim();
    const name = document.getElementById('newChatName').value.trim();
    const initialMsg = document.getElementById('newChatInitialMsg').value.trim() || '¡Hola! Te saludamos de YogurArte 🥛✨';

    try {
      const res = await api.sendCrmMessage(phone, initialMsg, { contactName: name });
      closeNewChatModal();
      showToast('¡Chat iniciado exitosamente! ✨', 'success');
      await loadConversations();
      if (res && res.conversation) {
        selectConversation(res.conversation.id);
      }
    } catch (err) {
      showToast(err.message || 'Error al iniciar chat', 'danger');
    }
  });
}

function openRecurringModal(schedule = null, prefillCustomer = null) {
  const modalContainer = document.getElementById('modalContainer');
  if (!modalContainer) return;

  const isEdit = !!schedule;

  const closeRecModal = () => {
    modalContainer.innerHTML = '';
    modalContainer.style.display = '';
  };

  modalContainer.innerHTML = `
    <div class="modal-overlay active modal-backdrop" id="crmRecModalOverlay">
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="modal-title" style="font-size: 1.05rem; font-weight: 800;">
            ${isEdit ? '✏️ Editar Compra Frecuente' : '🔁 Programar Compra Frecuente'}
          </h3>
          <button type="button" class="modal-close-btn" id="btnCloseRecModal">✕</button>
        </div>
        <form id="formRecurringSchedule" style="padding: 16px;">
          ${
            !isEdit && !prefillCustomer
              ? `
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label" style="font-size: 0.8rem;">Seleccionar Cliente *</label>
              <select id="recCustomerId" class="orders-select-item" required style="width: 100%; height: 38px;">
                <option value="">Cargando clientes...</option>
              </select>
            </div>
          `
              : ''
          }

          <div class="form-row" style="margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem;">Frecuencia *</label>
              <select id="recFrequencyDays" class="orders-select-item" style="width: 100%; height: 38px; font-weight: 700;">
                <option value="7" ${schedule?.frequencyDays === 7 ? 'selected' : ''}>Cada 7 días (Semanal)</option>
                <option value="15" ${schedule?.frequencyDays === 15 || !schedule ? 'selected' : ''}>Cada 15 días (Quincenal)</option>
                <option value="30" ${schedule?.frequencyDays === 30 ? 'selected' : ''}>Cada 30 días (Mensual)</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem;">Tamaño Envase *</label>
              <select id="recBottleSize" class="orders-select-item" style="width: 100%; height: 38px; font-weight: 700;">
                <option value="1L" ${schedule?.bottleSize === '1L' || !schedule ? 'selected' : ''}>1 Litro ($12.000)</option>
                <option value="2L" ${schedule?.bottleSize === '2L' ? 'selected' : ''}>2 Litros ($22.000)</option>
              </select>
            </div>
          </div>

          <div class="form-row" style="margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem;">Sabor Habitual *</label>
              <input type="text" id="recFlavor" class="form-input" value="${schedule?.preferredFlavor || 'Fresa'}" required style="font-weight: 700;" />
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem;">Cantidad *</label>
              <input type="number" id="recQuantity" class="form-input" min="1" value="${schedule?.quantity || 1}" required style="font-weight: 700;" />
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 0.8rem;">Próxima Fecha de Entrega *</label>
            <input type="date" id="recNextDate" class="form-input" value="${schedule?.nextDate ? String(schedule.nextDate).slice(0, 10) : new Date().toISOString().slice(0, 10)}" required style="font-weight: 700;" />
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="font-size: 0.8rem;">Notas / Indicaciones</label>
            <input type="text" id="recNotes" class="form-input" value="${schedule?.notes || ''}" placeholder="Ej: Entregar después de las 3 PM" />
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="btn btn-outline" id="btnCancelRec">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 800;">
              💾 ${isEdit ? 'Guardar Cambios' : 'Crear Programación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  modalContainer.querySelector('#btnCloseRecModal')?.addEventListener('click', closeRecModal);
  modalContainer.querySelector('#btnCancelRec')?.addEventListener('click', closeRecModal);
  modalContainer.querySelector('#crmRecModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'crmRecModalOverlay') closeRecModal();
  });

  // Si no está pre-llenado, cargar selector de clientes
  const selectCust = modalContainer.querySelector('#recCustomerId');
  if (selectCust) {
    api.getCustomers({ lite: 'true' }).then((custs) => {
      selectCust.innerHTML =
        '<option value="">Selecciona un cliente...</option>' +
        (custs || []).map((c) => `<option value="${c.id}">${escapeHtml(c.fullName)} (${escapeHtml(c.phone)})</option>`).join('');
    });
  }

  modalContainer.querySelector('#formRecurringSchedule')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerId = prefillCustomer ? prefillCustomer.id : (schedule?.customerId || Number(document.getElementById('recCustomerId')?.value));
    const frequencyDays = Number(document.getElementById('recFrequencyDays').value);
    const bottleSize = document.getElementById('recBottleSize').value;
    const preferredFlavor = document.getElementById('recFlavor').value.trim();
    const quantity = Number(document.getElementById('recQuantity').value);
    const nextDate = document.getElementById('recNextDate').value;
    const notes = document.getElementById('recNotes').value.trim();

    if (!customerId) {
      showToast('Debes seleccionar un cliente', 'warning');
      return;
    }

    try {
      if (isEdit) {
        await api.updateCrmRecurring(schedule.id, { frequencyDays, bottleSize, preferredFlavor, quantity, nextDate, notes });
        showToast('Compra frecuente actualizada ✨', 'success');
      } else {
        await api.createCrmRecurring({ customerId, frequencyDays, bottleSize, preferredFlavor, quantity, nextDate, notes });
        showToast('Compra frecuente programada exitosamente ✨', 'success');
      }
      closeRecModal();
      if (crmCurrentSubmodule === 'recurring') {
        const subContainer = document.getElementById('crmSubmoduleContainer');
        if (subContainer) renderRecurringSubmodule(subContainer);
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar programación', 'danger');
    }
  });
}

function openQuickReplyModal(reply = null) {
  const modalContainer = document.getElementById('modalContainer');
  if (!modalContainer) return;

  const isEdit = !!reply;

  const closeReplyModal = () => {
    modalContainer.innerHTML = '';
    modalContainer.style.display = '';
  };

  modalContainer.innerHTML = `
    <div class="modal-overlay active modal-backdrop" id="crmReplyModalOverlay">
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="modal-title" style="font-size: 1.05rem; font-weight: 800;">
            ${isEdit ? '✏️ Editar Plantilla' : '⚡ Nueva Respuesta Rápida'}
          </h3>
          <button type="button" class="modal-close-btn" id="btnCloseReplyModal">✕</button>
        </div>
        <form id="formQuickReply" style="padding: 16px;">
          <div class="form-row" style="margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem;">Atajo (ej: /sabores) *</label>
              <input type="text" id="replyShortcut" class="form-input" value="${escapeHtml(reply?.shortcut || '/')}" required style="font-weight: 700;" />
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem;">Categoría</label>
              <select id="replyCategory" class="orders-select-item" style="width: 100%; height: 38px; font-weight: 700;">
                <option value="VENTAS" ${reply?.category === 'VENTAS' ? 'selected' : ''}>Ventas</option>
                <option value="PAGOS" ${reply?.category === 'PAGOS' ? 'selected' : ''}>Pagos / Nequi</option>
                <option value="GENERAL" ${reply?.category === 'GENERAL' ? 'selected' : ''}>General / Saludos</option>
                <option value="INFO" ${reply?.category === 'INFO' ? 'selected' : ''}>Información</option>
              </select>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 0.8rem;">Título / Nombre de la Plantilla *</label>
            <input type="text" id="replyTitle" class="form-input" value="${escapeHtml(reply?.title || '')}" placeholder="Ej: Catálogo de Precios" required style="font-weight: 700;" />
          </div>

          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" style="font-size: 0.8rem;">Contenido del Mensaje *</label>
            <textarea id="replyContent" class="form-input" rows="5" placeholder="Escribe el texto que se enviará al cliente..." required style="line-height: 1.4;">${escapeHtml(reply?.content || '')}</textarea>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="btn btn-outline" id="btnCancelReply">Cancelar</button>
            <button type="submit" class="btn btn-primary" style="font-weight: 800;">
              💾 ${isEdit ? 'Guardar Cambios' : 'Crear Plantilla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  modalContainer.querySelector('#btnCloseReplyModal')?.addEventListener('click', closeReplyModal);
  modalContainer.querySelector('#btnCancelReply')?.addEventListener('click', closeReplyModal);
  modalContainer.querySelector('#crmReplyModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'crmReplyModalOverlay') closeReplyModal();
  });

  modalContainer.querySelector('#formQuickReply')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const shortcut = document.getElementById('replyShortcut').value.trim();
    const category = document.getElementById('replyCategory').value;
    const title = document.getElementById('replyTitle').value.trim();
    const content = document.getElementById('replyContent').value.trim();

    try {
      if (isEdit) {
        await api.updateCrmQuickReply(reply.id, { shortcut, category, title, content });
        showToast('Plantilla actualizada ✨', 'success');
      } else {
        await api.createCrmQuickReply({ shortcut, category, title, content });
        showToast('Plantilla creada exitosamente ✨', 'success');
      }
      closeReplyModal();
      if (crmCurrentSubmodule === 'quickReplies') {
        const subContainer = document.getElementById('crmSubmoduleContainer');
        if (subContainer) renderQuickRepliesSubmodule(subContainer);
      }
    } catch (err) {
      showToast(err.message || 'Error al guardar plantilla', 'danger');
    }
  });
}

function openLinkCustomerModal(conv) {
  const modalContainer = document.getElementById('modalContainer');
  if (!modalContainer) return;

  const closeLinkModal = () => {
    modalContainer.innerHTML = '';
    modalContainer.style.display = '';
  };

  modalContainer.innerHTML = `
    <div class="modal-overlay active modal-backdrop" id="crmLinkModalOverlay">
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="modal-title" style="font-size: 1.05rem; font-weight: 800;">🤝 Vincular con Cliente</h3>
          <button type="button" class="modal-close-btn" id="btnCloseLinkModal">✕</button>
        </div>
        <div style="padding: 18px;">
          <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.4;">
            Busca y selecciona el cliente al que pertenece el número <strong>${escapeHtml(conv.phoneNumber || conv.remoteJid)}</strong>:
          </p>

          <!-- Input con Autocomplete y Sugerencias -->
          <div class="form-group autocomplete-wrapper" style="margin-bottom: 14px;">
            <label class="form-label" style="font-size: 0.8rem; font-weight: 700; margin-bottom: 5px;">
              Buscar Cliente por Nombre o Teléfono *
            </label>
            <div class="input-with-icon">
              <span class="input-icon">🔍</span>
              <input 
                type="text" 
                id="linkCustomerSearchInput" 
                class="form-input" 
                placeholder="Escribe el nombre o teléfono del cliente..." 
                autocomplete="off" 
                style="height: 40px; font-size: 0.88rem;"
              />
            </div>
            <input type="hidden" id="selectedLinkCustomerId" value="" />
            <div id="linkCustomerSuggestions" class="autocomplete-dropdown"></div>
          </div>

          <!-- Tarjeta de confirmación del cliente seleccionado -->
          <div id="selectedCustomerCard" style="display: none; background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 16px; align-items: center; justify-content: space-between;">
            <div style="min-width: 0;">
              <div id="selectedCustName" style="font-weight: 800; font-size: 0.88rem; color: #166534; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Cliente</div>
              <div id="selectedCustDetails" style="font-size: 0.76rem; color: #15803D; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📞 Teléfono • 📍 Dirección</div>
            </div>
            <button type="button" id="btnClearSelectedCust" class="btn btn-sm" style="background: none; border: none; font-size: 1.1rem; color: #166534; cursor: pointer; padding: 2px 6px; font-weight: 800;" title="Cambiar cliente">✕</button>
          </div>

          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px;">
            <button type="button" class="btn btn-outline" id="btnCancelLink">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnConfirmLink" style="font-weight: 800;">
              Confirmar Vinculación
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  modalContainer.querySelector('#btnCloseLinkModal')?.addEventListener('click', closeLinkModal);
  modalContainer.querySelector('#btnCancelLink')?.addEventListener('click', closeLinkModal);
  modalContainer.querySelector('#crmLinkModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'crmLinkModalOverlay') closeLinkModal();
  });

  const searchInput = modalContainer.querySelector('#linkCustomerSearchInput');
  const suggestionsBox = modalContainer.querySelector('#linkCustomerSuggestions');
  const hiddenIdInput = modalContainer.querySelector('#selectedLinkCustomerId');
  const cardEl = modalContainer.querySelector('#selectedCustomerCard');
  const cardNameEl = modalContainer.querySelector('#selectedCustName');
  const cardDetailsEl = modalContainer.querySelector('#selectedCustDetails');
  const btnClear = modalContainer.querySelector('#btnClearSelectedCust');

  let allCustomers = [];

  api.getCustomers({ lite: 'true' }).then((custs) => {
    allCustomers = custs || [];
  }).catch((err) => {
    console.error('Error fetching customers for link modal:', err);
  });

  const selectCustomer = (customer) => {
    if (!customer) return;
    hiddenIdInput.value = customer.id;
    searchInput.value = customer.fullName;
    cardNameEl.textContent = `👤 ${customer.fullName}`;
    cardDetailsEl.textContent = `📞 ${customer.phone || 'Sin teléfono'} • 📍 ${customer.address || 'Fonseca'}`;
    cardEl.style.display = 'flex';
    suggestionsBox.innerHTML = '';
    suggestionsBox.classList.remove('active');
  };

  const clearSelection = () => {
    hiddenIdInput.value = '';
    searchInput.value = '';
    cardEl.style.display = 'none';
    searchInput.focus();
  };

  btnClear?.addEventListener('click', clearSelection);

  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    hiddenIdInput.value = '';
    cardEl.style.display = 'none';

    if (!query || query.length < 1 || allCustomers.length === 0) {
      suggestionsBox.innerHTML = '';
      suggestionsBox.classList.remove('active');
      return;
    }

    const matches = allCustomers.filter((c) => {
      const nameMatch = c.fullName && c.fullName.toLowerCase().includes(query);
      const phoneMatch = c.phone && c.phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''));
      const addressMatch = c.address && c.address.toLowerCase().includes(query);
      return nameMatch || phoneMatch || addressMatch;
    });

    if (matches.length === 0) {
      suggestionsBox.innerHTML = `
        <div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
          No se encontraron clientes con "${escapeHtml(e.target.value)}"
        </div>
      `;
      suggestionsBox.classList.add('active');
      return;
    }

    suggestionsBox.innerHTML = matches
      .slice(0, 6)
      .map(
        (c) => `
        <div class="autocomplete-item" data-id="${c.id}">
          <span class="autocomplete-item-name" style="font-weight: 700; color: var(--text-main); font-size: 0.85rem;">👤 ${escapeHtml(c.fullName)}</span>
          <span class="autocomplete-item-details" style="font-size: 0.74rem; color: var(--text-muted);">📞 ${escapeHtml(c.phone || 'Sin teléfono')} • 📍 ${escapeHtml(c.address || 'Fonseca')}</span>
        </div>
      `
      )
      .join('');

    suggestionsBox.classList.add('active');

    suggestionsBox.querySelectorAll('.autocomplete-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = Number(item.dataset.id);
        const found = allCustomers.find((cust) => cust.id === id);
        if (found) selectCustomer(found);
      });
    });
  });

  // Cerrar sugerencias al hacer click afuera
  modalContainer.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrapper')) {
      suggestionsBox?.classList.remove('active');
    }
  });

  modalContainer.querySelector('#btnConfirmLink')?.addEventListener('click', async () => {
    let customerId = hiddenIdInput.value ? Number(hiddenIdInput.value) : null;

    // Si el usuario escribió un nombre exacto pero no hizo click en la sugerencia
    if (!customerId && searchInput.value.trim()) {
      const exactMatch = allCustomers.find(
        (c) => c.fullName.toLowerCase() === searchInput.value.trim().toLowerCase()
      );
      if (exactMatch) {
        customerId = exactMatch.id;
      }
    }

    if (!customerId) {
      showToast('Por favor busca y selecciona un cliente de las sugerencias', 'warning');
      searchInput.focus();
      return;
    }

    try {
      const updated = await api.linkCrmCustomer(conv.id, customerId);
      conv.customerId = updated.customerId;
      conv.customer = updated.customer;
      conv.contactName = updated.contactName;
      closeLinkModal();
      showToast('¡Cliente vinculado exitosamente! ✨', 'success');
      renderConversationList();
      renderCustomerDetails(conv);
    } catch (err) {
      showToast(err.message || 'Error al vincular cliente', 'danger');
    }
  });
}

// ==========================================
// 🛠️ UTILIDADES DE TEXTO Y FECHA
// ==========================================

function formatConvTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
}

function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatWhatsAppText(text) {
  if (!text) return '';
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
  formatted = formatted.replace(/~([^~]+)~/g, '<del>$1</del>');
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}
