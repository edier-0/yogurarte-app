import { api } from '../api.js';
import { formatCOP, formatDate, formatDateTime, showToast, store, escapeHtml } from '../store.js';
import { openOrderModal } from './ordersView.js';

let currentActiveConvId = null;
let cachedConversations = [];
let cachedMessages = [];
let activeCustomer = null;
let socketInstance = null;
let searchQuery = '';
let wpStatus = { status: 'DISCONNECTED', qr: null, phoneNumber: null, user: null };
let qrModalInterval = null;

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
    cachedConversations.sort((a, b) => new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime());

    // Si el chat actual está abierto y corresponde a este mensaje
    if (currentActiveConvId === conversation.id) {
      if (!cachedMessages.some((m) => m.id === message.id)) {
        cachedMessages.push(message);
        appendMessageToChat(message);
        scrollToBottom();
      }
      // Marcar como leído
      if (!message.fromMe) {
        api.markCrmConversationAsRead(conversation.id).catch(console.error);
      }
    } else if (!message.fromMe) {
      // Notificación visual discreta
      const senderName = conversation.contactName || conversation.phoneNumber || 'Cliente';
      showToast(`💬 Mensaje de ${senderName}: ${escapeHtml(message.text || (message.messageType === 'STICKER' ? '✨ Sticker' : 'Archivo adjunto'))}`, 'info');
    }

    renderConversationList();
  });

  socketInstance.on('whatsapp:conversation_read', ({ conversationId }) => {
    const conv = cachedConversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.unreadCount = 0;
      renderConversationList();
    }
  });

  return socketInstance;
}

/**
 * Renderizado principal de la vista CRM
 */
export async function renderCrm(container) {
  initSocket();

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

          <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
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
            <button class="btn btn-sm btn-primary" id="btnStartNewChat" title="Iniciar conversación con nuevo número" style="font-weight: 800; font-size: 0.8rem; padding: 0 10px; height: 36px; display: flex; align-items: center; gap: 4px; white-space: nowrap; flex-shrink: 0;">
              <span>➕</span> <span>Nuevo</span>
            </button>
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
            Selecciona una conversación de la izquierda o haz clic en <strong>➕ Nuevo</strong> para iniciar un chat con cualquier número.
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
              <div class="crm-conv-avatar" id="activeChatAvatar">
                ?
              </div>
              <div>
                <h4 class="crm-chat-title" id="activeChatName">Nombre del Cliente</h4>
                <div class="crm-chat-subtitle" id="activeChatPhone">+57 000 000 0000</div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="btn btn-sm btn-primary" id="btnFastOrder" style="font-weight: 800; font-size: 0.8rem; padding: 6px 12px;">
                🥛 Crear Pedido
              </button>
              <button class="btn btn-sm btn-outline" id="btnToggleCustomerDrawer" title="Ver ficha del cliente" style="padding: 6px 10px;">
                👤
              </button>
            </div>
          </div>

          <!-- Mensajes -->
          <div class="crm-chat-messages" id="crmChatMessages">
            <!-- Mensajes inyectados dinámicamente -->
          </div>

          <!-- Área de Composición y Respuestas Rápidas -->
          <div class="crm-input-wrapper">
            <div class="crm-quick-replies">
              <button class="crm-quick-chip" data-reply="sabores">🥛 Sabores y Precios</button>
              <button class="crm-quick-chip" data-reply="camino">🛵 Pedido en Camino</button>
              <button class="crm-quick-chip" data-reply="pago">💳 Medios de Pago</button>
              <button class="crm-quick-chip" data-reply="direccion">📍 Confirmar Dirección</button>
              <button class="crm-quick-chip" data-reply="saludo">👋 Saludo YogurArte</button>
            </div>

            <form id="crmSendForm" class="crm-composer-row">
              <textarea 
                id="crmMsgInput" 
                class="crm-input-textarea" 
                rows="1" 
                placeholder="Escribe un mensaje..."
                required
              ></textarea>
              <button type="submit" class="crm-btn-send" id="btnSendCrmMsg" title="Enviar mensaje">
                ➤
              </button>
            </form>
          </div>
        </div>
      </section>

      <!-- SIDEBAR DERECHO: DETALLES DEL CLIENTE Y PEDIDOS -->
      <aside class="crm-customer-sidebar" id="crmCustomerSidebar">
        <div id="crmCustomerInfoPlaceholder" style="text-align: center; color: var(--text-muted); padding: 20px 0;">
          <p style="font-size: 0.85rem;">Selecciona una conversación para ver los detalles del cliente.</p>
        </div>

        <div id="crmCustomerInfoContent" style="display: none; flex-direction: column; gap: 16px;">
          <div class="crm-cust-profile-card">
            <div class="crm-cust-avatar-large" id="custPanelAvatar">👤</div>
            <div class="crm-cust-name" id="custPanelName">Nombre Cliente</div>
            <div class="crm-cust-phone" id="custPanelPhone">+57 300 000 0000</div>
            <div id="custPanelAddress" style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">📍 Sin dirección registrada</div>
          </div>

          <div class="crm-cust-stats">
            <div class="crm-cust-stat-box">
              <div class="crm-cust-stat-val" id="custStatOrders">0</div>
              <div class="crm-cust-stat-lbl">Pedidos Totales</div>
            </div>
            <div class="crm-cust-stat-box">
              <div class="crm-cust-stat-val" id="custStatDebt" style="color: var(--danger);">$0</div>
              <div class="crm-cust-stat-lbl">Saldo Pendiente</div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn btn-primary" id="btnCustPanelNewOrder" style="width: 100%; font-weight: 800; padding: 10px;">
              🥛 Nuevo Pedido para este Cliente
            </button>
            <button class="btn btn-outline" id="btnLinkCustomerModal" style="width: 100%; font-size: 0.8rem; padding: 8px;">
              🔗 Vincular / Cambiar Cliente
            </button>
          </div>

          <div style="border-top: 1px solid var(--border-color); padding-top: 12px;">
            <h5 style="font-size: 0.85rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">
              Últimos Pedidos
            </h5>
            <div id="custRecentOrdersList" style="display: flex; flex-direction: column; gap: 6px;">
              <span style="font-size: 0.78rem; color: var(--text-muted);">Sin pedidos previos.</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `;

  // Asignar Eventos del DOM
  attachCrmEvents();

  // Cargar estado inicial de WhatsApp y conversaciones
  loadStatusAndConversations();
}

/**
 * Carga inicial de estado y chats
 */
async function loadStatusAndConversations() {
  try {
    const statusData = await api.getWhatsAppStatus();
    wpStatus = statusData;
    updateStatusUI();
  } catch (err) {
    console.warn('Error checking WhatsApp status:', err);
  }

  try {
    const res = await api.getCrmConversations(searchQuery);
    cachedConversations = res || [];
    renderConversationList();
  } catch (err) {
    console.error('Error fetching CRM conversations:', err);
    const convList = document.getElementById('crmConvList');
    if (convList) {
      convList.innerHTML = `
        <li style="padding: 24px 16px; text-align: center; color: var(--danger); font-size: 0.85rem;">
          ❌ Error al cargar conversaciones. Intenta nuevamente.
        </li>
      `;
    }
  }
}

/**
 * Actualiza los badges de estado en el header
 */
function updateStatusUI() {
  const badge = document.getElementById('crmStatusBadge');
  const label = document.getElementById('crmStatusLabel');
  const btnConnect = document.getElementById('btnWhatsAppConnect');

  if (!badge || !label) return;

  badge.className = 'crm-status-indicator';

  if (wpStatus.status === 'CONNECTED') {
    badge.classList.add('connected');
    label.textContent = wpStatus.phoneNumber ? `Conectado (${wpStatus.phoneNumber})` : 'Conectado';
    if (btnConnect) {
      btnConnect.textContent = '⚙️ WhatsApp Conectado';
      btnConnect.className = 'btn btn-sm btn-outline';
    }
  } else if (wpStatus.status === 'CONNECTING') {
    badge.classList.add('connecting');
    label.textContent = wpStatus.qr ? 'QR Listo para Escanear' : 'Conectando...';
    if (btnConnect) {
      btnConnect.textContent = wpStatus.qr ? '📷 Escanear QR' : '⏳ Ver QR';
      btnConnect.className = 'btn btn-sm btn-warning';
    }
  } else {
    badge.classList.add('disconnected');
    label.textContent = 'Desconectado';
    if (btnConnect) {
      btnConnect.textContent = '📱 Conectar QR';
      btnConnect.className = 'btn btn-sm btn-primary';
    }
  }
}

/**
 * Renderiza la lista de conversaciones en el sidebar izquierdo
 */
function renderConversationList() {
  const listEl = document.getElementById('crmConvList');
  if (!listEl) return;

  if (cachedConversations.length === 0) {
    listEl.innerHTML = `
      <li style="padding: 30px 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        No hay conversaciones aún.<br><small>Los chats aparecerán aquí cuando los clientes escriban a tu WhatsApp o puedes hacer clic en <strong>➕ Nuevo</strong> arriba.</small>
      </li>
    `;
    return;
  }

  const query = searchQuery.toLowerCase().trim();
  const filtered = cachedConversations.filter((c) => {
    const name = (c.contactName || '').toLowerCase();
    const phone = (c.phoneNumber || '').toLowerCase();
    const lastMsg = (c.lastMessageText || '').toLowerCase();
    return name.includes(query) || phone.includes(query) || lastMsg.includes(query);
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <li style="padding: 20px 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        No se encontraron chats con "${escapeHtml(searchQuery)}"
      </li>
    `;
    return;
  }

  listEl.innerHTML = filtered
    .map((conv) => {
      const isActive = conv.id === currentActiveConvId;
      const initial = (conv.contactName || conv.phoneNumber || '?').charAt(0).toUpperCase();
      const timeStr = conv.lastMessageTimestamp ? formatTimeAgo(conv.lastMessageTimestamp) : '';
      const isFromMe = conv.lastMessageFromMe;
      const snippet = conv.lastMessageText || 'Sin mensajes';

      return `
        <li class="crm-conv-item ${isActive ? 'active' : ''}" data-id="${conv.id}">
          <div class="crm-conv-avatar">
            ${conv.profilePicUrl ? `<img src="${conv.profilePicUrl}" alt="" />` : initial}
          </div>
          <div class="crm-conv-info">
            <div class="crm-conv-top">
              <span class="crm-conv-name">${escapeHtml(conv.contactName || conv.phoneNumber || 'Desconocido')}</span>
              <span class="crm-conv-time">${timeStr}</span>
            </div>
            <div class="crm-conv-bottom">
              <span class="crm-conv-snippet">
                ${isFromMe ? '<span style="color: var(--primary); font-weight: 700;">Tú: </span>' : ''}
                ${escapeHtml(snippet)}
              </span>
              ${conv.unreadCount > 0 ? `<span class="crm-conv-unread">${conv.unreadCount}</span>` : ''}
            </div>
          </div>
        </li>
      `;
    })
    .join('');

  // Click en una conversación
  listEl.querySelectorAll('.crm-conv-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const convId = Number(e.currentTarget.dataset.id);
      openConversation(convId);
    });
  });
}

/**
 * Abre y carga los mensajes de una conversación
 */
async function openConversation(convId) {
  currentActiveConvId = convId;
  const layout = document.getElementById('crmLayout');
  if (layout) layout.classList.add('viewing-chat');

  // Actualizar item activo en lista
  renderConversationList();

  const emptyState = document.getElementById('crmEmptyState');
  const activeChatContainer = document.getElementById('crmActiveChatContainer');
  const messagesArea = document.getElementById('crmChatMessages');

  if (emptyState) emptyState.style.display = 'none';
  if (activeChatContainer) activeChatContainer.style.display = 'flex';

  const conv = cachedConversations.find((c) => c.id === convId);
  if (conv) {
    document.getElementById('activeChatName').textContent = conv.contactName || conv.phoneNumber || 'Cliente';
    document.getElementById('activeChatPhone').textContent = conv.phoneNumber ? (conv.phoneNumber.startsWith('57') ? `+${conv.phoneNumber}` : `+57 ${conv.phoneNumber}`) : '';
    document.getElementById('activeChatAvatar').textContent = (conv.contactName || conv.phoneNumber || '?').charAt(0).toUpperCase();

    // Actualizar sidebar del cliente
    updateCustomerPanel(conv);
  }

  // Marcar como leído
  if (conv && conv.unreadCount > 0) {
    conv.unreadCount = 0;
    api.markCrmConversationAsRead(convId).catch(console.error);
    renderConversationList();
  }

  // Cargar mensajes
  if (messagesArea) {
    messagesArea.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px;">
        Cargando mensajes... ⏳
      </div>
    `;
  }

  try {
    const res = await api.getCrmMessages(convId);
    cachedMessages = res || [];
    renderChatMessages();
    scrollToBottom();
  } catch (err) {
    console.error('Error fetching messages:', err);
    if (messagesArea) {
      messagesArea.innerHTML = `
        <div style="text-align: center; color: var(--danger); font-size: 0.85rem; padding: 20px;">
          ❌ Error al cargar los mensajes.
        </div>
      `;
    }
  }
}

/**
 * Helper para renderizar el contenido visual de un mensaje (Texto, Sticker o Imagen)
 */
function renderMessageBubbleContent(msg) {
  if (msg.messageType === 'STICKER') {
    if (msg.mediaUrl) {
      return `<div style="display: inline-block; padding: 2px;"><img src="${msg.mediaUrl}" alt="Sticker" style="width: 140px; height: 140px; object-fit: contain; display: block;" /></div>`;
    }
    return `<div style="display: flex; align-items: center; gap: 6px; font-size: 0.88rem;"><span>✨</span> <em>Sticker de WhatsApp</em></div>`;
  }

  if (msg.messageType === 'IMAGE') {
    let imgHtml = '';
    if (msg.mediaUrl) {
      imgHtml = `<img src="${msg.mediaUrl}" alt="Foto" style="max-width: 250px; max-height: 250px; border-radius: 8px; margin-bottom: 4px; display: block; cursor: pointer;" onclick="window.open(this.src)" />`;
    }
    const caption = msg.text && msg.text !== '📷 Imagen' ? `<div class="crm-msg-text">${escapeHtml(msg.text)}</div>` : '';
    return `${imgHtml}${caption || (!imgHtml ? '<div class="crm-msg-text">📷 Imagen</div>' : '')}`;
  }

  return `<div class="crm-msg-text">${escapeHtml(msg.text || '')}</div>`;
}

/**
 * Renderiza los mensajes del chat activo
 */
function renderChatMessages() {
  const messagesArea = document.getElementById('crmChatMessages');
  if (!messagesArea) return;

  if (cachedMessages.length === 0) {
    messagesArea.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 30px;">
        No hay mensajes en esta conversación aún. Escribe el primer mensaje abajo 👇
      </div>
    `;
    return;
  }

  let html = '';
  let lastDateStr = '';

  cachedMessages.forEach((msg) => {
    const msgDate = new Date(msg.timestamp);
    const dateStr = msgDate.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    if (dateStr !== lastDateStr) {
      html += `<div class="crm-date-divider">${dateStr}</div>`;
      lastDateStr = dateStr;
    }

    const timeStr = msgDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    const isOutgoing = msg.fromMe;
    const senderName = isOutgoing ? (msg.senderName || 'YogurArte') : '';
    const isSticker = msg.messageType === 'STICKER' && msg.mediaUrl;

    html += `
      <div class="crm-msg-row ${isOutgoing ? 'outgoing' : 'incoming'}" id="msg-${msg.id}">
        <div class="crm-msg-bubble" style="${isSticker ? 'background: transparent; box-shadow: none; padding: 2px;' : ''}">
          ${isOutgoing && senderName && !isSticker ? `<div class="crm-msg-sender">${escapeHtml(senderName)}</div>` : ''}
          ${renderMessageBubbleContent(msg)}
          <div class="crm-msg-meta" style="${isSticker ? 'justify-content: flex-end; background: rgba(255,255,255,0.7); border-radius: 6px; padding: 2px 6px; width: fit-content; margin-left: auto;' : ''}">
            <span>${timeStr}</span>
            ${isOutgoing ? `<span class="crm-msg-status ${msg.status === 'READ' ? 'read' : ''}">${getStatusIcon(msg.status)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  });

  messagesArea.innerHTML = html;
}

/**
 * Agrega un único mensaje al final del chat activo sin re-renderizar todo
 */
function appendMessageToChat(msg) {
  const messagesArea = document.getElementById('crmChatMessages');
  if (!messagesArea) return;

  const msgDate = new Date(msg.timestamp);
  const timeStr = msgDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  const isOutgoing = msg.fromMe;
  const senderName = isOutgoing ? (msg.senderName || 'YogurArte') : '';
  const isSticker = msg.messageType === 'STICKER' && msg.mediaUrl;

  const msgDiv = document.createElement('div');
  msgDiv.className = `crm-msg-row ${isOutgoing ? 'outgoing' : 'incoming'}`;
  msgDiv.id = `msg-${msg.id}`;
  msgDiv.innerHTML = `
    <div class="crm-msg-bubble" style="${isSticker ? 'background: transparent; box-shadow: none; padding: 2px;' : ''}">
      ${isOutgoing && senderName && !isSticker ? `<div class="crm-msg-sender">${escapeHtml(senderName)}</div>` : ''}
      ${renderMessageBubbleContent(msg)}
      <div class="crm-msg-meta" style="${isSticker ? 'justify-content: flex-end; background: rgba(255,255,255,0.7); border-radius: 6px; padding: 2px 6px; width: fit-content; margin-left: auto;' : ''}">
        <span>${timeStr}</span>
        ${isOutgoing ? `<span class="crm-msg-status ${msg.status === 'READ' ? 'read' : ''}">${getStatusIcon(msg.status)}</span>` : ''}
      </div>
    </div>
  `;

  messagesArea.appendChild(msgDiv);
}

/**
 * Ícono de estado del mensaje
 */
function getStatusIcon(status) {
  if (status === 'READ') return '✓✓';
  if (status === 'DELIVERED') return '✓✓';
  if (status === 'SENT') return '✓';
  return '⏳';
}

/**
 * Scroll automático al último mensaje
 */
function scrollToBottom() {
  const messagesArea = document.getElementById('crmChatMessages');
  if (messagesArea) {
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }
}

/**
 * Actualiza el panel lateral derecho de información del cliente
 */
function updateCustomerPanel(conv) {
  const placeholder = document.getElementById('crmCustomerInfoPlaceholder');
  const content = document.getElementById('crmCustomerInfoContent');

  if (!conv || !content) return;

  if (placeholder) placeholder.style.display = 'none';
  content.style.display = 'flex';

  const cust = conv.customer;
  activeCustomer = cust || null;

  const avatar = document.getElementById('custPanelAvatar');
  const nameEl = document.getElementById('custPanelName');
  const phoneEl = document.getElementById('custPanelPhone');
  const addrEl = document.getElementById('custPanelAddress');
  const statOrders = document.getElementById('custStatOrders');
  const statDebt = document.getElementById('custStatDebt');
  const recentOrdersList = document.getElementById('custRecentOrdersList');

  if (cust) {
    if (avatar) avatar.textContent = cust.fullName.charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = cust.fullName;
    if (phoneEl) phoneEl.textContent = cust.phone ? `+${cust.phone}` : conv.phoneNumber || 'Sin teléfono';
    if (addrEl) addrEl.textContent = cust.address ? `📍 ${cust.address}` : '📍 Sin dirección registrada';

    const orders = cust.orders || [];
    if (statOrders) statOrders.textContent = orders.length;

    // Calcular deuda acumulada del cliente
    let totalDebt = 0;
    orders.forEach((o) => {
      const orderTotal = Number(o.finalTotal || o.totalAmount || 0);
      const paid = (o.payments || []).reduce((acc, p) => acc + Number(p.amount || 0), 0);
      if (orderTotal > paid && o.status !== 'CANCELLED') {
        totalDebt += (orderTotal - paid);
      }
    });

    if (statDebt) {
      statDebt.textContent = formatCOP(totalDebt);
      statDebt.style.color = totalDebt > 0 ? 'var(--danger)' : 'var(--success)';
    }

    // Lista de últimos pedidos
    if (recentOrdersList) {
      if (orders.length === 0) {
        recentOrdersList.innerHTML = '<span style="font-size: 0.78rem; color: var(--text-muted);">Sin pedidos previos.</span>';
      } else {
        recentOrdersList.innerHTML = orders
          .slice(0, 4)
          .map((o) => `
            <div style="background: var(--bg-subtle); padding: 8px 10px; border-radius: var(--radius-sm); font-size: 0.78rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: var(--primary);">#${o.orderNumber || o.id}</strong>
                <span style="color: var(--text-muted); display: block; font-size: 0.7rem;">${formatDate(o.deliveryDate)}</span>
              </div>
              <div style="text-align: right;">
                <span style="font-weight: 700; color: var(--text-main);">${formatCOP(o.finalTotal || o.totalAmount)}</span>
                <span style="display: block; font-size: 0.68rem; color: ${o.paymentStatus === 'PAID' ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">
                  ${o.paymentStatus === 'PAID' ? 'Pagado' : 'Pendiente'}
                </span>
              </div>
            </div>
          `)
          .join('');
      }
    }
  } else {
    // Cliente no vinculado a la base de datos de YogurArte
    if (avatar) avatar.textContent = '?';
    if (nameEl) nameEl.textContent = conv.contactName || conv.phoneNumber || 'Prospecto / Nuevo Contacto';
    if (phoneEl) phoneEl.textContent = conv.phoneNumber ? `+${conv.phoneNumber}` : '';
    if (addrEl) addrEl.textContent = '⚠️ Contacto de WhatsApp no vinculado a Cliente';
    if (statOrders) statOrders.textContent = '0';
    if (statDebt) {
      statDebt.textContent = '$0';
      statDebt.style.color = 'var(--text-muted)';
    }
    if (recentOrdersList) {
      recentOrdersList.innerHTML = `
        <div style="background: #FFFBEB; border: 1px dashed #FCD34D; padding: 10px; border-radius: var(--radius-sm); font-size: 0.75rem; color: #92400E;">
          Este contacto aún no está registrado como cliente en YogurArte. Puedes crearle un pedido directo o vincularlo arriba.
        </div>
      `;
    }
  }
}

/**
 * Event Listeners de la vista CRM
 */
function attachCrmEvents() {
  // Búsqueda de chats
  const searchInput = document.getElementById('crmSearchInput');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderConversationList();
  });

  // Botón Nuevo Chat (Header y Estado Vacío)
  document.getElementById('btnStartNewChat')?.addEventListener('click', () => {
    openNewChatModal();
  });
  document.getElementById('btnEmptyStateNewChat')?.addEventListener('click', () => {
    openNewChatModal();
  });

  // Botón Volver a la lista en Móvil
  document.getElementById('btnBackToConvList')?.addEventListener('click', () => {
    const layout = document.getElementById('crmLayout');
    if (layout) layout.classList.remove('viewing-chat');
  });

  // Toggle de sidebar del cliente en Tablets/Laptops
  document.getElementById('btnToggleCustomerDrawer')?.addEventListener('click', () => {
    const sidebar = document.getElementById('crmCustomerSidebar');
    if (sidebar) sidebar.classList.toggle('mobile-open');
  });

  // Botón de Conectar / QR WhatsApp
  document.getElementById('btnWhatsAppConnect')?.addEventListener('click', () => {
    openWhatsAppQRModal();
  });

  // Envío de mensajes
  const sendForm = document.getElementById('crmSendForm');
  const msgInput = document.getElementById('crmMsgInput');
  const btnSend = document.getElementById('btnSendCrmMsg');

  // Ajuste automático de altura de textarea
  msgInput?.addEventListener('input', () => {
    msgInput.style.height = 'auto';
    msgInput.style.height = `${Math.min(msgInput.scrollHeight, 120)}px`;
  });

  // Enviar con Enter (sin Shift)
  msgInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendForm?.dispatchEvent(new Event('submit'));
    }
  });

  sendForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentActiveConvId) return;

    const text = msgInput.value.trim();
    if (!text) return;

    const conv = cachedConversations.find((c) => c.id === currentActiveConvId);
    if (!conv) return;

    try {
      if (btnSend) btnSend.disabled = true;
      msgInput.value = '';
      msgInput.style.height = 'auto';

      await api.sendCrmMessage(conv.remoteJid, text);
    } catch (err) {
      showToast(err.message || 'Error al enviar mensaje por WhatsApp', 'error');
    } finally {
      if (btnSend) btnSend.disabled = false;
      msgInput.focus();
    }
  });

  // Respuestas Rápidas (Chips)
  document.querySelectorAll('.crm-quick-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      const type = e.currentTarget.dataset.reply;
      let text = '';

      if (type === 'sabores') {
        text = '¡Hola! 🥛✨ En YogurArte hoy tenemos disponibles deliciosos yogures artesanales:\n- Fresa 🍓\n- Mora 🍇\n- Melocotón 🍑\n- Frutos Rojos 🍒\n- Arequipe 🍯\n\n¿Cuál te gustaría ordenar?';
      } else if (type === 'camino') {
        text = '🛵 ¡Hola! Te informamos que tu pedido de YogurArte ya va en camino con nuestro domiciliario. ¡Pronto estará en tu puerta!';
      } else if (type === 'pago') {
        text = '💳 Puedes realizar tu pago mediante transferencia a:\n- Nequi / Bancolombia: 302 458 1882\n- Titular: Edier / YogurArte\nPor favor nos envías el comprobante por aquí. ¡Muchas gracias! 🙏';
      } else if (type === 'direccion') {
        text = '🏡 Para asegurar que tu pedido llegue a tiempo, por favor confírmanos:\n- Dirección exacta y barrio:\n- Nombre de quien recibe:\n- Teléfono de contacto:\n- Método de pago (Efectivo / Nequi / Bancolombia):';
      } else if (type === 'saludo') {
        text = '¡Hola! Bienvenido a YogurArte Fonseca 🥛✨. ¿En qué podemos colaborarte el día de hoy?';
      }

      if (msgInput && text) {
        msgInput.value = text;
        msgInput.style.height = 'auto';
        msgInput.style.height = `${Math.min(msgInput.scrollHeight, 120)}px`;
        msgInput.focus();
      }
    });
  });

  // Botón Crear Pedido Rápido (Header del Chat)
  document.getElementById('btnFastOrder')?.addEventListener('click', () => {
    triggerFastOrder();
  });

  // Botón Crear Pedido (Panel del Cliente)
  document.getElementById('btnCustPanelNewOrder')?.addEventListener('click', () => {
    triggerFastOrder();
  });

  // Botón Vincular Cliente Manualmente
  document.getElementById('btnLinkCustomerModal')?.addEventListener('click', () => {
    openLinkCustomerModal();
  });
}

/**
 * Modal para Iniciar Nuevo Chat desde cero con buscador reactivo de clientes y sugerencias
 */
export async function openNewChatModal() {
  const modalContainer = document.getElementById('modalContainer');
  if (!modalContainer) return;

  let customers = [];
  try {
    customers = await api.getCustomers();
  } catch (err) {
    console.error('Error fetching customers for new chat:', err);
  }

  modalContainer.innerHTML = `
    <div class="modal-overlay active" id="newChatModalOverlay">
      <div class="modal-card" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title">💬 Iniciar Nuevo Chat de WhatsApp</h3>
          <button class="modal-close" id="btnCloseNewChatModal">✕</button>
        </div>
        <div class="modal-body" style="padding: 18px 20px;">
          <!-- Pestañas de Selección -->
          <div style="display: flex; gap: 8px; margin-bottom: 16px; background: var(--bg-subtle); padding: 4px; border-radius: var(--radius-md);">
            <button type="button" class="btn btn-sm filter-chip active" id="tabNewChatCustomer" style="flex: 1; text-align: center; border-radius: var(--radius-sm);">
              👤 Buscar Cliente Registrado
            </button>
            <button type="button" class="btn btn-sm filter-chip" id="tabNewChatDirect" style="flex: 1; text-align: center; border-radius: var(--radius-sm);">
              📱 Número Nuevo Directo
            </button>
          </div>

          <form id="formNewChat">
            <!-- Sección A: Buscador con Sugerencias -->
            <div id="sectionCustomerSelect" class="form-group" style="position: relative;">
              <label class="form-label" style="font-weight: 700;">Buscar Cliente por Nombre, Teléfono o Barrio *</label>
              <div class="input-with-icon" style="width: 100%;">
                <span class="input-icon">🔍</span>
                <input 
                  type="text" 
                  id="inputCustSearchAutocomplete" 
                  class="form-input" 
                  placeholder="Escribe para ver sugerencias (ej: Yeilin, Edier...)" 
                  autocomplete="off"
                  style="font-weight: 700;"
                />
              </div>

              <!-- Lista flotante de sugerencias -->
              <div id="custSuggestionsDropdown" style="position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #FFFFFF; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); max-height: 220px; overflow-y: auto; box-shadow: var(--shadow-lg); z-index: 60; display: none;">
              </div>

              <!-- Tarjeta de cliente seleccionado -->
              <div id="selectedCustPreviewCard" style="display: none; margin-top: 10px; background: var(--primary-light); border: 1.5px solid var(--primary); padding: 10px 14px; border-radius: var(--radius-md); justify-content: space-between; align-items: center;">
                <div>
                  <strong id="selectedCustPreviewName" style="color: var(--primary); font-size: 0.95rem; display: block;">Cliente</strong>
                  <span id="selectedCustPreviewPhone" style="font-size: 0.8rem; color: var(--text-main); font-weight: 600;">📱 300 000 0000</span>
                  <span id="selectedCustPreviewAddr" style="font-size: 0.74rem; color: var(--text-muted); display: block;">📍 Dirección</span>
                </div>
                <button type="button" id="btnRemoveSelectedCust" class="btn btn-sm btn-outline" style="padding: 4px 8px; font-size: 0.75rem; border-color: var(--danger); color: var(--danger); font-weight: 700;">
                  Cambiar ✕
                </button>
              </div>
            </div>

            <!-- Sección B: Entrada de Número Directo -->
            <div id="sectionDirectPhone" style="display: none; flex-direction: column; gap: 12px;">
              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Número de WhatsApp (con o sin +57) *</label>
                <div class="input-with-icon" style="width: 100%;">
                  <span class="input-icon">📱</span>
                  <input 
                    type="tel" 
                    id="inputNewChatPhone" 
                    class="form-input" 
                    placeholder="Ej: 314 746 4663" 
                    style="font-weight: 700;"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" style="font-weight: 700;">Nombre del Contacto (Opcional)</label>
                <input 
                  type="text" 
                  id="inputNewChatName" 
                  class="form-input" 
                  placeholder="Ej: Yeilin" 
                />
              </div>
            </div>

            <!-- Mensaje Inicial -->
            <div class="form-group" style="margin-top: 14px;">
              <label class="form-label" style="font-weight: 700;">Mensaje Inicial *</label>
              
              <!-- Plantillas rápidas -->
              <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 8px;">
                <button type="button" class="crm-quick-chip" id="chipNewChatHello">👋 Saludo Inicial</button>
                <button type="button" class="crm-quick-chip" id="chipNewChatFlavors">🥛 Carta de Sabores</button>
                <button type="button" class="crm-quick-chip" id="chipNewChatConfirm">📦 Confirmar Pedido</button>
              </div>

              <textarea 
                id="inputNewChatMessage" 
                class="form-input" 
                rows="3" 
                placeholder="Escribe el mensaje que recibirá el cliente..." 
                required
                style="resize: vertical; font-size: 0.9rem;"
              >¡Hola! Te escribo de YogurArte Fonseca 🥛✨. ¿Cómo estás?</textarea>
            </div>

            <div class="modal-footer" style="padding: 14px 0 0 0; display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; border-top: 1px solid var(--border-color);">
              <button type="button" class="btn btn-outline" id="btnCancelNewChat">Cancelar</button>
              <button type="submit" class="btn btn-primary" id="btnSubmitNewChat" style="font-weight: 800;">
                🚀 Enviar y Abrir Chat
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  let currentMode = 'customer'; // 'customer' | 'direct'
  let selectedCustomerObj = null;

  const tabCust = document.getElementById('tabNewChatCustomer');
  const tabDir = document.getElementById('tabNewChatDirect');
  const secCust = document.getElementById('sectionCustomerSelect');
  const secDir = document.getElementById('sectionDirectPhone');
  const searchInput = document.getElementById('inputCustSearchAutocomplete');
  const suggestionsBox = document.getElementById('custSuggestionsDropdown');
  const previewCard = document.getElementById('selectedCustPreviewCard');
  const previewName = document.getElementById('selectedCustPreviewName');
  const previewPhone = document.getElementById('selectedCustPreviewPhone');
  const previewAddr = document.getElementById('selectedCustPreviewAddr');
  const btnRemoveCust = document.getElementById('btnRemoveSelectedCust');
  const inputPhone = document.getElementById('inputNewChatPhone');
  const inputName = document.getElementById('inputNewChatName');
  const inputMsg = document.getElementById('inputNewChatMessage');

  // Función para mostrar sugerencias de clientes
  function renderSuggestions(query) {
    if (!suggestionsBox) return;
    const q = (query || '').toLowerCase().trim();
    const matches = customers.filter((c) => {
      const name = (c.fullName || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const addr = (c.address || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || addr.includes(q);
    });

    if (matches.length === 0) {
      suggestionsBox.innerHTML = `
        <div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">
          No se encontraron clientes con "${escapeHtml(query)}"
        </div>
      `;
      suggestionsBox.style.display = 'block';
      return;
    }

    suggestionsBox.innerHTML = matches
      .slice(0, 8)
      .map((c) => `
        <div class="cust-suggestion-item" data-id="${c.id}" style="padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; display: flex; align-items: center; gap: 10px; transition: background 0.15s ease;">
          <div style="width: 34px; height: 34px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; flex-shrink: 0;">
            ${c.fullName.charAt(0).toUpperCase()}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(c.fullName)}
            </div>
            <div style="font-size: 0.76rem; color: var(--text-muted); display: flex; gap: 8px;">
              <span>📱 ${escapeHtml(c.phone || 'Sin tel')}</span>
              ${c.address ? `<span>📍 ${escapeHtml(c.address)}</span>` : ''}
            </div>
          </div>
        </div>
      `)
      .join('');

    suggestionsBox.style.display = 'block';

    // Click en una sugerencia
    suggestionsBox.querySelectorAll('.cust-suggestion-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const cust = customers.find((c) => c.id === id);
        if (cust) {
          selectCustomer(cust);
        }
      });
    });
  }

  function selectCustomer(cust) {
    selectedCustomerObj = cust;
    if (searchInput) searchInput.style.display = 'none';
    if (suggestionsBox) suggestionsBox.style.display = 'none';
    if (previewCard) previewCard.style.display = 'flex';
    if (previewName) previewName.textContent = cust.fullName;
    if (previewPhone) previewPhone.textContent = `📱 ${cust.phone || 'Sin teléfono'}`;
    if (previewAddr) previewAddr.textContent = cust.address ? `📍 ${cust.address}` : '📍 Sin dirección registrada';
  }

  btnRemoveCust?.addEventListener('click', () => {
    selectedCustomerObj = null;
    if (searchInput) {
      searchInput.style.display = 'block';
      searchInput.value = '';
      searchInput.focus();
    }
    if (previewCard) previewCard.style.display = 'none';
  });

  searchInput?.addEventListener('input', (e) => {
    renderSuggestions(e.target.value);
  });

  searchInput?.addEventListener('focus', () => {
    renderSuggestions(searchInput.value);
  });

  document.addEventListener('click', (e) => {
    if (suggestionsBox && !secCust?.contains(e.target)) {
      suggestionsBox.style.display = 'none';
    }
  });

  // Control de pestañas
  tabCust?.addEventListener('click', () => {
    currentMode = 'customer';
    tabCust.classList.add('active');
    tabDir?.classList.remove('active');
    secCust.style.display = 'block';
    secDir.style.display = 'none';
  });

  tabDir?.addEventListener('click', () => {
    currentMode = 'direct';
    tabDir.classList.add('active');
    tabCust?.classList.remove('active');
    secCust.style.display = 'none';
    secDir.style.display = 'flex';
    inputPhone?.focus();
  });

  // Chips de plantillas
  document.getElementById('chipNewChatHello')?.addEventListener('click', () => {
    if (inputMsg) inputMsg.value = '¡Hola! Te escribo de YogurArte Fonseca 🥛✨. ¿Cómo estás?';
  });
  document.getElementById('chipNewChatFlavors')?.addEventListener('click', () => {
    if (inputMsg) inputMsg.value = '¡Hola! 🥛✨ En YogurArte hoy tenemos disponibles deliciosos yogures artesanales:\n- Fresa 🍓\n- Mora 🍇\n- Melocotón 🍑\n- Frutos Rojos 🍒\n- Arequipe 🍯\n\n¿Te gustaría hacer un pedido para hoy?';
  });
  document.getElementById('chipNewChatConfirm')?.addEventListener('click', () => {
    if (inputMsg) inputMsg.value = '¡Hola! Te escribo de YogurArte para confirmar los detalles de tu entrega de yogur artesanal 🥛🏡.';
  });

  // Cerrar modal
  const closeModal = () => {
    modalContainer.innerHTML = '';
  };
  document.getElementById('btnCloseNewChatModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelNewChat')?.addEventListener('click', closeModal);
  document.getElementById('newChatModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'newChatModalOverlay') closeModal();
  });

  // Enviar formulario
  document.getElementById('formNewChat')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = inputMsg ? inputMsg.value.trim() : '';
    if (!text) {
      showToast('Por favor escribe un mensaje inicial', 'warning');
      return;
    }

    let phone = '';
    let contactName = '';
    let customerId = null;

    if (currentMode === 'customer') {
      if (!selectedCustomerObj) {
        showToast('Por favor selecciona un cliente de las sugerencias', 'warning');
        return;
      }
      customerId = selectedCustomerObj.id;
      phone = selectedCustomerObj.phone || '';
      contactName = selectedCustomerObj.fullName || '';
      if (!phone) {
        showToast('Este cliente no tiene un teléfono registrado', 'warning');
        return;
      }
    } else {
      phone = inputPhone ? inputPhone.value.trim() : '';
      contactName = inputName ? inputName.value.trim() : '';
      if (!phone || phone.replace(/\D/g, '').length < 7) {
        showToast('Por favor ingresa un número de teléfono válido', 'warning');
        return;
      }
    }

    const btnSubmit = document.getElementById('btnSubmitNewChat');
    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Enviando mensaje... ⏳';
      }

      const res = await api.sendCrmMessage(phone, text, {
        contactName: contactName || undefined,
        customerId: customerId || undefined,
      });

      showToast('¡Chat iniciado con éxito! 💬✨');
      closeModal();

      // Recargar lista y abrir la conversación inmediatamente
      await loadStatusAndConversations();
      if (res?.conversation?.id) {
        openConversation(res.conversation.id);
      }
    } catch (err) {
      showToast(err.message || 'Error al iniciar chat de WhatsApp', 'error');
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = '🚀 Enviar y Abrir Chat';
      }
    }
  });
}

/**
 * Dispara el modal de pedido con la información del cliente actual
 */
function triggerFastOrder() {
  if (!currentActiveConvId) return;
  const conv = cachedConversations.find((c) => c.id === currentActiveConvId);
  if (!conv) return;

  const cust = conv.customer;
  if (cust) {
    openOrderModal({
      customer: {
        fullName: cust.fullName,
        phone: cust.phone,
        address: cust.address,
      },
      customerId: cust.id,
      deliveryAddress: cust.address,
      isNewForCustomer: true,
    });
  } else {
    // Cliente aún no registrado formalmente, pasar datos pre-llenados desde WhatsApp
    openOrderModal({
      customer: {
        fullName: conv.contactName || '',
        phone: conv.phoneNumber || '',
        address: '',
      },
      deliveryAddress: '',
      isNewForCustomer: true,
    });
  }
}

/**
 * Modal para vincular conversación con un cliente existente usando buscador reactivo
 */
async function openLinkCustomerModal() {
  if (!currentActiveConvId) return;
  const conv = cachedConversations.find((c) => c.id === currentActiveConvId);
  if (!conv) return;

  const modalContainer = document.getElementById('modalContainer');
  if (!modalContainer) return;

  let customers = [];
  try {
    customers = await api.getCustomers();
  } catch (err) {
    console.error('Error fetching customers:', err);
  }

  modalContainer.innerHTML = `
    <div class="modal-overlay active" id="linkCustomerModalOverlay">
      <div class="modal-card" style="max-width: 460px;">
        <div class="modal-header">
          <h3 class="modal-title">🔗 Vincular Chat a Cliente</h3>
          <button class="modal-close" id="btnCloseLinkCustModal">✕</button>
        </div>
        <div class="modal-body" style="padding: 18px 20px;">
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 14px;">
            Vincula esta conversación de WhatsApp (${escapeHtml(conv.contactName || conv.phoneNumber || 'Chat')}) con la ficha de cliente en YogurArte para sincronizar sus pedidos y saldos.
          </p>

          <div class="form-group" style="position: relative;">
            <label class="form-label" style="font-weight: 700;">Buscar Cliente por Nombre o Teléfono *</label>
            <div class="input-with-icon" style="width: 100%;">
              <span class="input-icon">🔍</span>
              <input 
                type="text" 
                id="inputLinkCustSearch" 
                class="form-input" 
                placeholder="Escribe el nombre del cliente..." 
                autocomplete="off"
                style="font-weight: 700;"
              />
            </div>

            <!-- Sugerencias -->
            <div id="linkCustSuggestionsDropdown" style="position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #FFFFFF; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); max-height: 200px; overflow-y: auto; box-shadow: var(--shadow-lg); z-index: 60; display: none;">
            </div>

            <!-- Seleccionado -->
            <div id="linkSelectedCustCard" style="display: none; margin-top: 10px; background: var(--primary-light); border: 1.5px solid var(--primary); padding: 10px 14px; border-radius: var(--radius-md); justify-content: space-between; align-items: center;">
              <div>
                <strong id="linkSelectedCustName" style="color: var(--primary); font-size: 0.95rem; display: block;">Cliente</strong>
                <span id="linkSelectedCustPhone" style="font-size: 0.78rem; color: var(--text-muted);">📱 300 000 0000</span>
              </div>
              <button type="button" id="btnRemoveLinkSelectedCust" class="btn btn-sm btn-outline" style="padding: 4px 8px; font-size: 0.75rem; border-color: var(--danger); color: var(--danger); font-weight: 700;">
                Cambiar ✕
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="padding: 12px 20px; display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn btn-outline" id="btnCancelLinkCust">Cancelar</button>
          <button class="btn btn-primary" id="btnConfirmLinkCust" style="font-weight: 800;">💾 Guardar Vínculo</button>
        </div>
      </div>
    </div>
  `;

  let selectedLinkCustId = conv.customerId || null;
  const linkSearchInput = document.getElementById('inputLinkCustSearch');
  const linkSuggestions = document.getElementById('linkCustSuggestionsDropdown');
  const selectedCard = document.getElementById('linkSelectedCustCard');
  const selectedName = document.getElementById('linkSelectedCustName');
  const selectedPhone = document.getElementById('linkSelectedCustPhone');
  const btnRemove = document.getElementById('btnRemoveLinkSelectedCust');

  // Si ya tiene un cliente vinculado, mostrarlo seleccionado
  if (conv.customer) {
    selectLinkCust(conv.customer);
  }

  function renderLinkSuggestions(query) {
    if (!linkSuggestions) return;
    const q = (query || '').toLowerCase().trim();
    const matches = customers.filter((c) => (c.fullName || '').toLowerCase().includes(q) || (c.phone || '').includes(q));

    if (matches.length === 0) {
      linkSuggestions.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">No se encontraron clientes</div>`;
      linkSuggestions.style.display = 'block';
      return;
    }

    linkSuggestions.innerHTML = matches
      .slice(0, 6)
      .map((c) => `
        <div class="link-suggestion-item" data-id="${c.id}" style="padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; display: flex; align-items: center; gap: 8px;">
          <strong style="color: var(--text-main); font-size: 0.88rem;">${escapeHtml(c.fullName)}</strong>
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: auto;">📱 ${c.phone || 'Sin tel'}</span>
        </div>
      `)
      .join('');

    linkSuggestions.style.display = 'block';

    linkSuggestions.querySelectorAll('.link-suggestion-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const cust = customers.find((c) => c.id === id);
        if (cust) selectLinkCust(cust);
      });
    });
  }

  function selectLinkCust(cust) {
    selectedLinkCustId = cust.id;
    if (linkSearchInput) linkSearchInput.style.display = 'none';
    if (linkSuggestions) linkSuggestions.style.display = 'none';
    if (selectedCard) selectedCard.style.display = 'flex';
    if (selectedName) selectedName.textContent = cust.fullName;
    if (selectedPhone) selectedPhone.textContent = `📱 ${cust.phone || 'Sin teléfono'}`;
  }

  btnRemove?.addEventListener('click', () => {
    selectedLinkCustId = null;
    if (linkSearchInput) {
      linkSearchInput.style.display = 'block';
      linkSearchInput.value = '';
      linkSearchInput.focus();
    }
    if (selectedCard) selectedCard.style.display = 'none';
  });

  linkSearchInput?.addEventListener('input', (e) => renderLinkSuggestions(e.target.value));
  linkSearchInput?.addEventListener('focus', () => renderLinkSuggestions(linkSearchInput.value));

  document.getElementById('btnCloseLinkCustModal')?.addEventListener('click', () => {
    modalContainer.innerHTML = '';
  });
  document.getElementById('btnCancelLinkCust')?.addEventListener('click', () => {
    modalContainer.innerHTML = '';
  });

  document.getElementById('btnConfirmLinkCust')?.addEventListener('click', async () => {
    if (!selectedLinkCustId) {
      showToast('Por favor selecciona un cliente de la lista', 'warning');
      return;
    }

    try {
      await api.linkCrmCustomer(currentActiveConvId, selectedLinkCustId);
      showToast('Cliente vinculado exitosamente 🔗✨');
      modalContainer.innerHTML = '';
      
      // Recargar conversaciones
      await loadStatusAndConversations();
      if (currentActiveConvId) {
        openConversation(currentActiveConvId);
      }
    } catch (err) {
      showToast(err.message || 'Error vinculando cliente', 'error');
    }
  });
}

/**
 * Modal para Escanear Código QR de WhatsApp
 */
export async function openWhatsAppQRModal() {
  const modalContainer = document.getElementById('modalContainer');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="modal-overlay active" id="qrModalOverlay">
      <div class="modal-card" style="max-width: 480px; text-align: center;">
        <div class="modal-header" style="justify-content: center; position: relative;">
          <h3 class="modal-title" style="font-size: 1.15rem;">📱 Conexión de WhatsApp YogurArte</h3>
          <button class="modal-close" id="btnCloseQrModal" style="position: absolute; right: 16px;">✕</button>
        </div>
        <div class="modal-body" style="padding: 20px;" id="qrModalBody">
          <!-- Contenido reactivo -->
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnCloseQrModal')?.addEventListener('click', () => {
    if (qrModalInterval) clearInterval(qrModalInterval);
    modalContainer.innerHTML = '';
  });

  document.getElementById('qrModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'qrModalOverlay') {
      if (qrModalInterval) clearInterval(qrModalInterval);
      modalContainer.innerHTML = '';
    }
  });

  // Mostrar estado actual inmediatamente
  updateQRModalContent();

  // Consultar estado de inmediato por si el QR ya está listo
  try {
    const statusData = await api.getWhatsAppStatus();
    wpStatus = statusData;
    updateStatusUI();
    updateQRModalContent();
  } catch (err) {
    console.warn('Error consultando estado en openWhatsAppQRModal:', err);
  }

  // Polling auxiliar cada 2s
  if (qrModalInterval) clearInterval(qrModalInterval);
  qrModalInterval = setInterval(async () => {
    try {
      const statusData = await api.getWhatsAppStatus();
      wpStatus = statusData;
      updateStatusUI();
      updateQRModalContent();
    } catch (err) {
      console.warn('Polling status error:', err);
    }
  }, 2000);
}

/**
 * Actualiza el contenido visual del modal QR según el estado
 */
function updateQRModalContent() {
  const body = document.getElementById('qrModalBody');
  if (!body) return;

  if (wpStatus.status === 'CONNECTED') {
    body.innerHTML = `
      <div style="font-size: 3rem; color: #16A34A; margin-bottom: 8px;">✅</div>
      <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
        ¡WhatsApp Conectado y Listo!
      </h4>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
        El número <strong>+${wpStatus.phoneNumber || 'YogurArte'}</strong> está vinculado y funcionando.
      </p>

      <div style="background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-md); font-size: 0.8rem; color: var(--text-main); margin-bottom: 20px; text-align: left; line-height: 1.45;">
        ✨ <strong>Multi-Agente Activo:</strong> Todo el equipo puede responder mensajes y gestionar pedidos desde este aplicativo sin necesidad de tener la app de WhatsApp abierta.
      </div>

      <button class="btn btn-danger" id="btnLogoutWpBtn" style="font-weight: 700; width: 100%; padding: 10px;">
        🚪 Desvincular este Número de WhatsApp
      </button>
    `;

    document.getElementById('btnLogoutWpBtn')?.addEventListener('click', async () => {
      if (confirm('¿Seguro que deseas desvincular este número de WhatsApp? Tendrás que volver a escanear el QR para recibir mensajes.')) {
        try {
          await api.logoutWhatsApp();
          showToast('WhatsApp desvinculado correctamente');
          wpStatus = { status: 'DISCONNECTED', qr: null, phoneNumber: null };
          updateStatusUI();
          updateQRModalContent();
        } catch (err) {
          showToast(err.message || 'Error al desvincular WhatsApp', 'error');
        }
      }
    });
    return;
  }

  if (wpStatus.qr) {
    body.innerHTML = `
      <div style="display: flex; justify-content: center; margin-bottom: 16px;">
        <div style="background: #FFFFFF; padding: 12px; border-radius: var(--radius-md); box-shadow: var(--shadow-md); border: 2px solid var(--border-color);">
          <img src="${wpStatus.qr}" alt="Código QR de WhatsApp" style="width: 240px; height: 240px; display: block;" />
        </div>
      </div>

      <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-bottom: 8px;">
        Pasos para Vincular en tu Celular:
      </h4>

      <ol style="text-align: left; font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; padding-left: 20px; margin-bottom: 16px;">
        <li>Abre <strong>WhatsApp</strong> en tu teléfono.</li>
        <li>Toca en <strong>Ajustes / Configuración</strong> > <strong>Dispositivos vinculados</strong>.</li>
        <li>Toca en <strong>Vincular un dispositivo</strong> y apunta tu cámara a este código QR.</li>
      </ol>

      <div style="display: flex; justify-content: center; gap: 10px; align-items: center; margin-top: 12px;">
        <button class="btn btn-sm btn-outline" id="btnRefreshQrAction" style="font-size: 0.78rem; font-weight: 700; padding: 6px 12px;">
          🔄 Regenerar Código QR
        </button>
      </div>
    `;

    document.getElementById('btnRefreshQrAction')?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      e.currentTarget.textContent = 'Generando... ⏳';
      try {
        const res = await api.refreshCrmQR();
        wpStatus = res;
        updateStatusUI();
        updateQRModalContent();
        showToast('Nuevo código QR generado 📷✨');
      } catch (err) {
        showToast(err.message || 'Error al regenerar QR', 'error');
      }
    });

    return;
  }

  // Estado conectando / esperando generación de QR
  body.innerHTML = `
    <div style="padding: 24px 0;">
      <div style="font-size: 2.5rem; margin-bottom: 12px; animation: pulse 1.5s infinite;">⏳</div>
      <h4 style="font-weight: 800; color: var(--text-main); margin-bottom: 6px;">Iniciando WhatsApp...</h4>
      <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px;">
        Estamos generando el código QR seguro de conexión. Si tarda unos segundos, haz clic en el botón de abajo.
      </p>
      <button class="btn btn-sm btn-primary" id="btnForceQrAction" style="font-weight: 700; padding: 8px 16px;">
        🔄 Generar Código QR Ahora
      </button>
    </div>
  `;

  document.getElementById('btnForceQrAction')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    e.currentTarget.textContent = 'Generando... ⏳';
    try {
      const res = await api.refreshCrmQR();
      wpStatus = res;
      updateStatusUI();
      updateQRModalContent();
    } catch (err) {
      showToast(err.message || 'Error al iniciar QR', 'error');
      e.currentTarget.disabled = false;
      e.currentTarget.textContent = '🔄 Generar Código QR Ahora';
    }
  });
}

/**
 * Formateador de tiempo relativo ("hace 5m", "10:30 am", "Ayer")
 */
function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins}m`;

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Ayer';
  }

  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}
