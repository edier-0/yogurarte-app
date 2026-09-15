import { api } from '../api.js';
import { formatCOP, formatDate, showToast, buildWhatsAppUrl, escapeHtml } from '../store.js';
import { dispatchSmartWhatsApp } from '../utils/whatsappDispatch.js';
import { openOrderModal } from './ordersView.js';
import { paginateArray, renderPaginationHtml, attachPaginationEvents, PAGE_SIZE } from '../components/pagination.js';

let customersCurrentPage = 1;
let searchQuery = '';
let currentDebtFilter = 'ALL'; // 'ALL', 'DELIVERED_DEBT', 'IN_PROCESS', 'PAID'
let currentBatchFilter = 'ALL';
let cachedCustomers = [];
let availableBatches = [];
let cachedSettings = {
  nequiNumber: '3024581882',
  bankName: 'Nequi / Bancolombia',
  bankHolder: 'Edier / YogurArte',
  paymentInstructions: 'Para transferencias por Nequi o Bancolombia',
};

export async function renderCustomers(container) {
  try {
    const batchesRes = await api.getBatches({ lite: 'true' });
    availableBatches = batchesRes || [];
  } catch (err) {
    console.error('Error loading batches in customersView:', err);
    availableBatches = [];
  }

  try {
    const settingsRes = await api.getSettings();
    if (settingsRes) cachedSettings = { ...cachedSettings, ...settingsRes };
  } catch (err) {
    console.warn('Could not load settings in customersView:', err);
  }

  container.innerHTML = `
    <!-- Barra de Búsqueda, Filtros y Acción -->
    <div class="orders-toolbar-card" style="margin-bottom: 20px;">
      <div class="orders-toolbar-main-row" style="margin-bottom: 10px;">
        <div class="orders-search-group" style="flex: 1 1 auto; min-width: 0; width: 100%;">
          <div class="search-box input-with-icon" style="width: 100%; max-width: 100%;">
            <span class="input-icon">🔍</span>
            <input 
              type="text" 
              id="customerSearchInput" 
              class="form-input" 
              style="height: 40px; width: 100%;"
              placeholder="Buscar por cliente, @usuario o dirección..." 
              value="${searchQuery}"
            />
          </div>
        </div>

        <div class="orders-toolbar-actions" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; width: auto;">
          <!-- Selector de Lote para Clientes -->
          <select id="custBatchFilterSelect" class="orders-select-item" style="height: 40px; font-weight: 700; color: var(--primary); flex: 1 1 auto; min-width: 150px; max-width: 100%;">
            <option value="ALL" ${currentBatchFilter === 'ALL' ? 'selected' : ''}>🍶 Todos los Lotes</option>
            ${availableBatches
              .map(
                (b) => `
              <option value="${b.id}" ${String(currentBatchFilter) === String(b.id) ? 'selected' : ''}>
                🍶 ${b.batchCode} - ${b.flavor}
              </option>
            `
              )
              .join('')}
          </select>

          <!-- Botón Limpiar Filtros -->
          <button class="btn btn-outline" id="btnClearCustomerFilters" style="height: 40px; white-space: nowrap; font-weight: 700; color: var(--text-muted); border-color: var(--border-color); display: inline-flex; align-items: center; gap: 4px;" title="Limpiar búsqueda y filtros de clientes">
            <span>🧹</span> Limpiar Filtros
          </button>

          <!-- Botón Configuración de Cuenta de Cobro (Nequi) -->
          <button class="btn btn-outline" id="btnOpenBankSettingsModal" style="height: 40px; white-space: nowrap; flex: 0 0 auto; border-color: #D8B4FE; color: #7E22CE; font-weight: 700; background: #FAF5FF;" title="Configurar número de Nequi o cuenta para recordatorios de cobro">
            ⚙️ Cuenta de Cobro (Nequi)
          </button>

          <button class="btn btn-accent" id="btnOpenNewCustModal" style="height: 40px; white-space: nowrap; flex: 0 0 auto;">
            <span>+</span> Registrar Cliente
          </button>
        </div>
      </div>

      <div style="padding-top: 10px; border-top: 1px solid var(--border-subtle); width: 100%; box-sizing: border-box;">
        <div class="filter-chip-group" id="custDebtFilterGroup" style="width: 100%;">
          <button class="filter-chip ${currentDebtFilter === 'ALL' ? 'active' : ''}" data-debt="ALL">Todos</button>
          <button class="filter-chip ${currentDebtFilter === 'DELIVERED_DEBT' ? 'active' : ''}" data-debt="DELIVERED_DEBT" style="${currentDebtFilter === 'DELIVERED_DEBT' ? 'background: #DC2626; border-color: #DC2626; color: white;' : 'color: #DC2626; font-weight: 700; border-color: #FECACA;'}">
            🚨 Con Deuda (Entregados)
          </button>
          <button class="filter-chip ${currentDebtFilter === 'PAID_NOT_DELIVERED' ? 'active' : ''}" data-debt="PAID_NOT_DELIVERED" style="${currentDebtFilter === 'PAID_NOT_DELIVERED' ? 'background: #059669; border-color: #059669; color: white;' : 'color: #059669; font-weight: 700; border-color: #A7F3D0;'}">
            🟢🥣 Pagados por Entregar
          </button>
          <button class="filter-chip ${currentDebtFilter === 'IN_PROCESS' ? 'active' : ''}" data-debt="IN_PROCESS" style="${currentDebtFilter === 'IN_PROCESS' ? 'background: var(--primary); border-color: var(--primary); color: white;' : 'color: var(--primary); font-weight: 700; border-color: #DDD6FE;'}">
            🥣 Encargos (En Proceso)
          </button>
          <button class="filter-chip ${currentDebtFilter === 'PAID' ? 'active' : ''}" data-debt="PAID">🟢 Al Día</button>
        </div>
      </div>
    </div>

    <!-- Directorio de Clientes -->
    <div id="customersGridContainer">
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        Cargando directorio de clientes... 👥
      </div>
    </div>
  `;

  container.querySelector('#btnClearCustomerFilters')?.addEventListener('click', () => {
    searchQuery = '';
    currentDebtFilter = 'ALL';
    currentBatchFilter = 'ALL';
    customersCurrentPage = 1;
    renderCustomers(container);
  });

  const searchInput = container.querySelector('#customerSearchInput');
  let debounceTimer;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      customersCurrentPage = 1;
      searchQuery = e.target.value;
      loadCustomersList(container);
    }, 250);
  });

  // Listener para filtro de lote
  const batchFilterSelect = container.querySelector('#custBatchFilterSelect');
  batchFilterSelect?.addEventListener('change', (e) => {
    customersCurrentPage = 1;
    currentBatchFilter = e.target.value;
    loadCustomersList(container);
  });

  // Listeners de filtro de deuda
  container.querySelectorAll('#custDebtFilterGroup button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('#custDebtFilterGroup button').forEach((b) => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      customersCurrentPage = 1;
      currentDebtFilter = e.currentTarget.dataset.debt;
      loadCustomersList(container);
    });
  });

  container.querySelector('#btnOpenBankSettingsModal')?.addEventListener('click', () => {
    openBankSettingsModal();
  });

  container.querySelector('#btnOpenNewCustModal')?.addEventListener('click', () => {
    openCustomerEditModal();
  });

  await loadCustomersList(container);
}

const WA_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block; vertical-align: -2px; margin-right: 4px;"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>`;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Función generadora del mensaje de WhatsApp con recordatorio contextual
function generateCustomerWhatsAppMessage(phone, fullName, deliveredPendingDebt = 0, inProcessPendingAmount = 0, isPaidInProcess = false, mode = 'DEFAULT') {
  if (!phone) return { phone: '', message: '', fallbackUrl: '#' };
  const rawPhone = phone.trim();

  const nequiNum = cachedSettings.nequiNumber || '3024581882';
  const bankName = cachedSettings.bankName || 'Nequi / Bancolombia';
  const bankHolder = cachedSettings.bankHolder ? ` (Titular: ${cachedSettings.bankHolder})` : '';
  const instagramUrl = cachedSettings.instagramUrl || 'https://www.instagram.com/yogurartesanalfonseca?igsi=ZXNjM2dxZ3Z1dXg4&utm_source=qr';
  const instagramLine = `\n\n📸 *Síguenos en Instagram:*\n${instagramUrl}`;

  let msg = '';
  if (deliveredPendingDebt > 0 || mode === 'DEBT') {
    // Pedido ya entregado y no pagado (deuda real)
    msg = `🥛 *YogurArte | Recordatorio de Pago*\n\n` +
          `Hola *${fullName}*, esperamos que estés disfrutando tu yogur artesanal 100% natural. 🥛🍓\n\n` +
          `Te recordamos cordialmente tu saldo pendiente:\n` +
          `🚨 *Saldo pendiente:* ${formatCOP(deliveredPendingDebt)}\n` +
          `💳 *${bankName}:* *${nequiNum}*${bankHolder}\n\n` +
          `Si ya realizaste la transferencia, por favor compártenos el comprobante para dejar tu cuenta al día. ¡Muchas gracias por tu apoyo! 🙌✨` +
          instagramLine;
  } else if (mode === 'THANK_DELIVERED') {
    // Agradecimiento de pago para pedido ya entregado
    msg = `🥛 *YogurArte | ¡Pago Recibido con Éxito! ✨*\n\n` +
          `¡Hola *${fullName}*! Confirmamos que recibimos con éxito tu pago. Tu cuenta se encuentra al día y en paz y salvo. (✅ Paz y Salvo)\n\n` +
          `¡Muchísimas gracias por tu compra, cumplimiento y apoyo a nuestro trabajo artesanal! Esperamos que disfrutes al máximo tu delicioso yogur 100% natural. 🥛🍇🍓\n\n` +
          `Estamos siempre a tu orden para tu próximo pedido. ✨` +
          instagramLine;
  } else if (isPaidInProcess && mode === 'INFO') {
    // Info del pedido pagado en proceso
    msg = `🥛 *YogurArte | Info de tu Pedido*\n\n` +
          `¡Hola *${fullName}*! Tu pedido de yogur artesanal 100% natural está siendo preparado. 🥣🍓\n\n` +
          `💰 *Estado:* Totalmente Pagado (✅ Paz y Salvo)\n` +
          `Te avisaremos apenas nuestro domiciliario vaya en camino hacia tu dirección. ¡Muchas gracias por tu compra! 🛵💨` +
          instagramLine;
  } else if (isPaidInProcess) {
    // Pedido pagado en proceso (agradecimiento y confirmación de pago YogurArte)
    msg = `🥛 *YogurArte | Pago Confirmado ✨*\n\n` +
          `¡Hola *${fullName}*! Confirmamos que recibimos con éxito el pago de tu pedido. 🥣🍓\n\n` +
          `💰 *Estado:* Totalmente Pagado (✅ Paz y Salvo)\n` +
          `Tu yogur 100% natural está en preparación y te avisaremos apenas vaya en camino. ¡Muchas gracias por tu compra y confianza! 🙌🥛✨` +
          instagramLine;
  } else if (inProcessPendingAmount > 0 || mode === 'INFO') {
    // Pedido en proceso / encargado (aún no se entrega)
    msg = `🥛 *YogurArte | Info de tu Encargo*\n\n` +
          `Hola *${fullName}*, tu encargo de yogur artesanal está en proceso. 🥣🍓\n\n` +
          `💰 *Saldo a cancelar:* ${formatCOP(inProcessPendingAmount)}\n` +
          `💳 *${bankName}:* *${nequiNum}*${bankHolder}\n\n` +
          `Te avisaremos apenas nuestro domiciliario vaya en camino hacia tu dirección. ¡Gracias por tu encargo! 🛵💨` +
          instagramLine;
  } else {
    // Cliente al día
    msg = `¡Hola *${fullName}*! 🥛✨ Te saludamos con mucho aprecio de *YogurArte*.\n\n` +
          `¿Te gustaría encargar de nuestros deliciosos yogures artesanales 100% naturales? Estamos atentos para tomar tu pedido. 🥛✨` +
          instagramLine;
  }

  return {
    phone: rawPhone,
    message: msg,
    fallbackUrl: buildWhatsAppUrl(rawPhone, msg),
  };
}

function generateCustomerWhatsAppLink(phone, fullName, deliveredPendingDebt = 0, inProcessPendingAmount = 0, isPaidInProcess = false, mode = 'DEFAULT') {
  return generateCustomerWhatsAppMessage(phone, fullName, deliveredPendingDebt, inProcessPendingAmount, isPaidInProcess, mode).fallbackUrl;
}

async function loadCustomersList(container) {
  const gridContainer = container.querySelector('#customersGridContainer');
  if (!gridContainer) return;

  try {
    const allCustomers = await api.getCustomers({
      search: searchQuery,
      batchId: currentBatchFilter,
    });
    cachedCustomers = allCustomers || [];

    // Aplicar filtro de deuda localmente
    let filteredCustomers = [...cachedCustomers];
    if (currentDebtFilter === 'DELIVERED_DEBT') {
      filteredCustomers = filteredCustomers.filter((c) => (c.deliveredPendingDebt || 0) > 0);
    } else if (currentDebtFilter === 'PAID_NOT_DELIVERED') {
      filteredCustomers = filteredCustomers.filter((c) => (c.inProcessOrdersCount || 0) > 0 && (c.inProcessPendingAmount || 0) <= 0 && (c.deliveredPendingDebt || 0) <= 0);
    } else if (currentDebtFilter === 'IN_PROCESS') {
      filteredCustomers = filteredCustomers.filter((c) => (c.inProcessOrdersCount || 0) > 0 || (c.inProcessPendingAmount || 0) > 0);
    } else if (currentDebtFilter === 'PAID') {
      filteredCustomers = filteredCustomers.filter((c) => (c.totalPendingAmount || 0) <= 0);
    }

    if (filteredCustomers.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-title">No se encontraron clientes</div>
          <div class="empty-state-text">
            ${
              currentDebtFilter === 'DELIVERED_DEBT'
                ? '¡Excelente noticia! No hay clientes con deudas de pedidos entregados.'
                : currentDebtFilter === 'PAID_NOT_DELIVERED'
                ? 'No hay clientes con pedidos pagados pendientes de entrega.'
                : currentDebtFilter === 'IN_PROCESS'
                ? 'No hay clientes con pedidos encargados en proceso.'
                : currentBatchFilter !== 'ALL'
                ? 'No hay clientes que hayan comprado o encargado yogur de este lote.'
                : 'Registra tus clientes habituales para agilizar la toma de pedidos.'
            }
          </div>
          ${
            currentDebtFilter === 'ALL' && currentBatchFilter === 'ALL'
              ? '<button class="btn btn-primary" id="btnRegisterCustEmpty">+ Registrar Primer Cliente</button>'
              : ''
          }
        </div>
      `;
      gridContainer.querySelector('#btnRegisterCustEmpty')?.addEventListener('click', () => openCustomerEditModal());
      return;
    }

    const totalDeliveredDebtInList = filteredCustomers.reduce((sum, c) => sum + (c.deliveredPendingDebt || 0), 0);
    const deliveredDebtorsCount = filteredCustomers.filter((c) => (c.deliveredPendingDebt || 0) > 0).length;
    const inProcessCount = filteredCustomers.filter((c) => (c.inProcessOrdersCount || 0) > 0 || (c.inProcessPendingAmount || 0) > 0).length;

    let summaryBanner = '';
    if (deliveredDebtorsCount > 0 && currentDebtFilter !== 'PAID' && currentDebtFilter !== 'IN_PROCESS' && currentDebtFilter !== 'PAID_NOT_DELIVERED') {
      summaryBanner = `
        <div style="background: #FFF5F5; border: 1.5px solid #FECACA; border-radius: var(--radius-lg); padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">🚨</span>
            <span style="font-weight: 700; color: #DC2626; font-size: 0.92rem;">
              Mostrando ${deliveredDebtorsCount} cliente(s) con pedidos ENTREGADOS y saldo pendiente (organizados de primero por mayor monto)
            </span>
          </div>
          <div style="background: #DC2626; color: white; padding: 4px 12px; border-radius: var(--radius-md); font-weight: 800; font-size: 0.95rem;">
            Total Deuda Entregada: ${formatCOP(totalDeliveredDebtInList)}
          </div>
        </div>
      `;
    } else if (currentDebtFilter === 'IN_PROCESS' && inProcessCount > 0) {
      const totalInProcess = filteredCustomers.reduce((sum, c) => sum + (c.inProcessPendingAmount || 0), 0);
      summaryBanner = `
        <div style="background: #FAF5FF; border: 1.5px solid #DDD6FE; border-radius: var(--radius-lg); padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">🥣</span>
            <span style="font-weight: 700; color: var(--primary); font-size: 0.92rem;">
              Mostrando ${inProcessCount} cliente(s) con pedidos encargados en preparación / ruta
            </span>
          </div>
          <div style="background: var(--primary); color: white; padding: 4px 12px; border-radius: var(--radius-md); font-weight: 800; font-size: 0.95rem;">
            Por Recaudar al Entregar: ${formatCOP(totalInProcess)}
          </div>
        </div>
      `;
    }

    const { pageItems, totalPages, totalItems, currentPage } = paginateArray(filteredCustomers, customersCurrentPage, 15);
    customersCurrentPage = currentPage;

    gridContainer.innerHTML = `
      ${summaryBanner}
      <div class="orders-grid">
        ${pageItems
          .map((c) => {
            const rawPhone = (c.phone || '').trim();
            const isUsername = rawPhone.startsWith('@') || /[a-zA-Z]/.test(rawPhone);
            const displayContact = isUsername && !rawPhone.startsWith('@') ? `@${rawPhone}` : rawPhone;
            
            const deliveredDebt = c.deliveredPendingDebt || 0;
            const inProcessAmount = c.inProcessPendingAmount || 0;
            const inProcessCount = c.inProcessOrdersCount || 0;

            const hasDeliveredDebt = deliveredDebt > 0;
            const isPaidInProcess = !hasDeliveredDebt && inProcessCount > 0 && inProcessAmount <= 0;
            const hasInProcessOrder = !hasDeliveredDebt && inProcessAmount > 0;

            const waLink = generateCustomerWhatsAppLink(rawPhone, c.fullName, deliveredDebt, inProcessAmount, isPaidInProcess);

            let cardBorder = '';
            let badgeHtml = '';
            let waBtnClass = 'btn-outline';
            let waBtnText = `${WA_ICON_SVG} WhatsApp`;

            if (hasDeliveredDebt) {
              cardBorder = 'border: 1.5px solid #F87171; background: #FFFDFD; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.08);';
              badgeHtml = `<span class="badge" style="background: #FEE2E2; color: #DC2626; font-weight: 800; font-size: 0.76rem;">🚨 Deuda: ${formatCOP(deliveredDebt)}</span>`;
              waBtnClass = 'btn-whatsapp';
              waBtnText = `${WA_ICON_SVG} Recordar Pago`;
            } else if (isPaidInProcess) {
              cardBorder = 'border: 1.5px solid #34D399; background: #F0FDF4; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.08);';
              badgeHtml = `<span class="badge" style="background: #DCFCE7; color: #059669; font-weight: 800; font-size: 0.76rem;">🟢🥣 Pagado • Por Entregar 🛵</span>`;
              waBtnClass = 'btn-whatsapp';
              waBtnText = `${WA_ICON_SVG} Agradecer Pago`;
            } else if (hasInProcessOrder) {
              cardBorder = 'border: 1.5px solid #DDD6FE; background: #FAF7FC; box-shadow: 0 4px 14px rgba(109, 40, 217, 0.05);';
              badgeHtml = `<span class="badge" style="background: #EDE9FE; color: var(--primary); font-weight: 800; font-size: 0.76rem;">🥣 Encargo: ${formatCOP(inProcessAmount)}</span>`;
              waBtnClass = 'btn-primary';
              waBtnText = `${WA_ICON_SVG} Info Pedido`;
            } else {
              badgeHtml = `<span class="badge badge-paid" style="font-size: 0.76rem;">🟢 Al Día</span>`;
            }

            const isPaidDelivered = !hasDeliveredDebt && !isPaidInProcess && !hasInProcessOrder && (c.totalOrders || 0) > 0;

            return `
            <div class="order-card" data-id="${c.id}" style="${cardBorder}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px;">
                    <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--primary); margin: 0;">${escapeHtml(c.fullName)}</h4>
                    ${badgeHtml}
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                    <span>${isUsername ? '💬' : '📞'}</span> <strong>${escapeHtml(displayContact) || 'Sin contacto'}</strong>
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">
                    <span>📍</span> ${escapeHtml(c.address) || 'Fonseca'} ${c.neighborhood ? `(${escapeHtml(c.neighborhood)})` : ''}
                  </div>

                  ${
                    c.latestOrderNotes
                      ? `
                    <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-left: 3px solid #F59E0B; padding: 5px 8px; border-radius: 4px; margin-top: 6px; font-size: 0.8rem; color: #92400E; word-break: break-word;">
                      <span style="font-weight: 800;">📝 Última nota pedido${c.latestOrderNumber ? ` (#${escapeHtml(c.latestOrderNumber)})` : ''}:</span> ${escapeHtml(c.latestOrderNotes)}
                    </div>
                  `
                      : ''
                  }

                  ${
                    c.notes
                      ? `
                    <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
                      <span>📌 Nota cliente:</span> <em>${escapeHtml(c.notes)}</em>
                    </div>
                  `
                      : ''
                  }

                  ${
                    c.batches && c.batches.length > 0
                      ? `
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
                      ${c.batches
                        .map(
                          (b) => `
                        <span class="badge" style="background: #FAF5FF; color: var(--primary); border: 1px solid #DDD6FE; font-weight: 800; font-size: 0.72rem;">
                          🍶 ${escapeHtml(b.batchCode)} (${escapeHtml(b.flavor)})
                        </span>
                      `
                        )
                        .join('')}
                    </div>
                  `
                      : ''
                  }
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
                  ${
                    isPaidInProcess
                      ? `
                      <button 
                        type="button"
                        class="btn btn-whatsapp btn-sm btn-customer-wa-action" 
                        data-id="${c.id}"
                        data-phone="${escapeHtml(rawPhone)}"
                        data-name="${escapeHtml(c.fullName)}"
                        data-delivered-debt="${deliveredDebt}"
                        data-in-process-amount="${inProcessAmount}"
                        data-is-paid-in-process="true"
                        data-mode="DEFAULT"
                        style="padding: 4px 8px; font-weight: 700; font-size: 0.78rem; white-space: nowrap;"
                        title="Notificar recepción del pago y agradecer al estilo YogurArte"
                      >
                        ${WA_ICON_SVG} Agradecer Pago
                      </button>
                      <button 
                        type="button"
                        class="btn btn-outline btn-sm btn-customer-wa-action" 
                        data-id="${c.id}"
                        data-phone="${escapeHtml(rawPhone)}"
                        data-name="${escapeHtml(c.fullName)}"
                        data-delivered-debt="${deliveredDebt}"
                        data-in-process-amount="${inProcessAmount}"
                        data-is-paid-in-process="true"
                        data-mode="INFO"
                        style="padding: 3px 6px; font-weight: 700; font-size: 0.74rem; white-space: nowrap; color: var(--primary); border-color: var(--primary);"
                        title="Enviar información y estado actual del pedido"
                      >
                        ${WA_ICON_SVG} Info Pedido
                      </button>
                    `
                      : isPaidDelivered
                      ? `
                      <button 
                        type="button"
                        class="btn btn-whatsapp btn-sm btn-customer-wa-action" 
                        data-id="${c.id}"
                        data-phone="${escapeHtml(rawPhone)}"
                        data-name="${escapeHtml(c.fullName)}"
                        data-delivered-debt="0"
                        data-in-process-amount="0"
                        data-is-paid-in-process="false"
                        data-mode="THANK_DELIVERED"
                        style="padding: 4px 8px; font-weight: 700; font-size: 0.78rem; white-space: nowrap;"
                        title="Enviar agradecimiento por pago de pedido entregado"
                      >
                        ${WA_ICON_SVG} Agradecer Pago
                      </button>
                      <button 
                        type="button"
                        class="btn btn-outline btn-sm btn-customer-wa-action" 
                        data-id="${c.id}"
                        data-phone="${escapeHtml(rawPhone)}"
                        data-name="${escapeHtml(c.fullName)}"
                        data-delivered-debt="0"
                        data-in-process-amount="0"
                        data-is-paid-in-process="false"
                        data-mode="DEFAULT"
                        style="padding: 3px 6px; font-weight: 700; font-size: 0.74rem; white-space: nowrap;"
                        title="Contactar por WhatsApp"
                      >
                        ${WA_ICON_SVG} Saludar / Pedido
                      </button>
                    `
                      : `
                      <button 
                        type="button"
                        class="btn ${waBtnClass} btn-sm btn-customer-wa-action" 
                        data-id="${c.id}"
                        data-phone="${escapeHtml(rawPhone)}"
                        data-name="${escapeHtml(c.fullName)}"
                        data-delivered-debt="${deliveredDebt}"
                        data-in-process-amount="${inProcessAmount}"
                        data-is-paid-in-process="${isPaidInProcess}"
                        data-mode="${hasDeliveredDebt ? 'DEBT' : hasInProcessOrder ? 'INFO' : 'DEFAULT'}"
                        style="padding: 5px 10px; font-weight: 700; font-size: 0.8rem; white-space: nowrap;"
                        title="${hasDeliveredDebt ? `Enviar recordatorio de cobro de ${formatCOP(deliveredDebt)} por WhatsApp` : 'Contactar por WhatsApp'}"
                      >
                        ${waBtnText}
                      </button>
                    `
                  }

                  ${(hasDeliveredDebt || hasInProcessOrder) ? `
                    <button 
                      type="button" 
                      class="btn ${hasDeliveredDebt ? 'btn-accent' : 'btn-outline'} btn-sm btn-cust-payment" 
                      data-id="${c.id}" 
                      style="padding: 4px 8px; font-weight: 800; font-size: 0.78rem; width: 100%;"
                      title="Registrar cobro o abono directo a este cliente"
                    >
                      💵 ${hasDeliveredDebt ? 'Cobrar' : 'Abonar'}
                    </button>
                  ` : ''}
                </div>
              </div>

              <div style="background: var(--bg-app); padding: 12px; border-radius: var(--radius-md); display: flex; justify-content: space-around; text-align: center; margin: 12px 0;">
                <div>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Pedidos</span>
                  <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);">${c.totalOrders}</div>
                </div>
                <div style="width: 1px; background: var(--border-subtle);"></div>
                <div>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Litros Total</span>
                  <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">${c.totalLiters} L</div>
                </div>
                <div style="width: 1px; background: var(--border-subtle);"></div>
                <div>
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Deuda Entregada</span>
                  <div style="font-size: 1.15rem; font-weight: 800; color: ${hasDeliveredDebt ? '#DC2626' : 'var(--success)'};">
                    ${formatCOP(deliveredDebt)}
                  </div>
                </div>
              </div>

              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
                <button class="btn btn-accent btn-sm btn-create-order-for-cust" data-id="${c.id}" style="flex: 1.2; font-weight: 800;" title="Crear un pedido para este cliente">
                  <span>+</span> Crear Pedido
                </button>
                <button class="btn btn-outline btn-sm btn-cust-payment" data-id="${c.id}" title="Registrar abono o cobrar">
                  💵 ${hasDeliveredDebt ? 'Cobrar' : 'Abonar'}
                </button>
                <button class="btn btn-outline btn-sm btn-view-history" data-id="${c.id}" title="Ver historial de pedidos">
                  📋
                </button>
                <button class="btn btn-outline btn-sm btn-edit-customer" data-id="${c.id}" title="Editar cliente">
                  ✏️
                </button>
                <button class="btn btn-outline btn-sm btn-delete-customer" data-id="${c.id}" data-name="${c.fullName}" style="color: var(--danger);" title="Desactivar cliente">
                  🗑️
                </button>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
      ${renderPaginationHtml({
        currentPage: customersCurrentPage,
        totalPages,
        totalItems,
        pageSize: 15,
        itemName: 'clientes',
        paginationId: 'customersPagination',
      })}
    `;

    attachPaginationEvents(
      gridContainer,
      'customersPagination',
      (newPage) => {
        customersCurrentPage = newPage;
        loadCustomersList(container);
      },
      gridContainer
    );

    // Asignar eventos
    // WhatsApp Direct Action (Enrutador Inteligente por Rol: CRM Baileys oficial o WhatsApp Móvil)
    gridContainer.querySelectorAll('.btn-customer-wa-action').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const { id, phone, name, deliveredDebt, inProcessAmount, isPaidInProcess, mode } = btn.dataset;
        const msgData = generateCustomerWhatsAppMessage(
          phone,
          name,
          Number(deliveredDebt || 0),
          Number(inProcessAmount || 0),
          isPaidInProcess === 'true',
          mode || 'DEFAULT'
        );
        await dispatchSmartWhatsApp({
          phone: msgData.phone,
          text: msgData.message,
          contactName: name,
          customerId: id ? Number(id) : undefined,
          fallbackUrl: msgData.fallbackUrl,
          successToast: '✅ Notificación enviada por WhatsApp oficial de YogurArte',
        });
      });
    });

    gridContainer.querySelectorAll('.btn-create-order-for-cust').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const customer = cachedCustomers.find((c) => c.id === id);
        if (customer) {
          openOrderModal({
            customer: {
              fullName: customer.fullName,
              phone: customer.phone,
              address: customer.address,
            },
            customerId: customer.id,
            deliveryAddress: customer.address,
            isNewForCustomer: true,
          });
        }
      });
    });

    gridContainer.querySelectorAll('.btn-cust-payment').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = Number(e.currentTarget.dataset.id || e.currentTarget.getAttribute('data-id'));
        const customer = cachedCustomers.find((c) => Number(c.id) === id) || { id };
        openCustomerPaymentModal(customer);
      });
    });

    gridContainer.querySelectorAll('.btn-view-history').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        openCustomerHistoryModal(id);
      });
    });

    gridContainer.querySelectorAll('.btn-edit-customer').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const customer = cachedCustomers.find((c) => c.id === id);
        if (customer) {
          openCustomerEditModal(customer);
        }
      });
    });

    gridContainer.querySelectorAll('.btn-delete-customer').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const { id, name } = e.currentTarget.dataset;
        if (confirm(`¿Estás seguro de desactivar al cliente "${name}"?`)) {
          try {
            await api.deleteCustomer(id);
            showToast('Cliente desactivado correctamente');
            renderCustomers(container);
          } catch (err) {
            showToast('Error al desactivar cliente', 'danger');
          }
        }
      });
    });
  } catch (error) {
    console.error('Error loading customers:', error);
  }
}

// Modal de Creación / Edición de Cliente
function openCustomerEditModal(customer = null) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  const isEdit = !!customer;
  const title = isEdit ? `✏️ Editar Cliente: ${customer.fullName}` : '👤 Registrar Nuevo Cliente';

  modalOverlay.innerHTML = `
    <div class="modal-overlay active">
      <div class="modal-card" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close-btn" id="btnCloseCustEditModal">✕</button>
        </div>
        <form id="customerEditForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label">Nombre y Apellido *</label>
              <input type="text" id="editCustName" class="form-input" placeholder="Ej: Carlos Pérez" value="${customer?.fullName || ''}" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Teléfono o @Usuario de WhatsApp *</label>
                <input type="text" id="editCustPhone" class="form-input" placeholder="Ej: 3014964250 o @usuario_wa" value="${customer?.phone || ''}" required />
              </div>

              <div class="form-group">
                <label class="form-label">Barrio</label>
                <input type="text" id="editCustNeighborhood" class="form-input" placeholder="Ej: San Agustín" value="${customer?.neighborhood || ''}" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Dirección Principal en Fonseca</label>
              <input type="text" id="editCustAddress" class="form-input" placeholder="Ej: Calle 12 # 15-40" value="${customer?.address || ''}" />
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Notas / Preferencias (Opcional)</label>
              <input type="text" id="editCustNotes" class="form-input" placeholder="Ej: Le gusta el yogur de fresa bien frío..." value="${customer?.notes || ''}" />
            </div>

          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelCustEditModal">Cancelar</button>
            <button type="submit" class="btn btn-primary">
              ${isEdit ? 'Guardar Cambios' : 'Registrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => (modalOverlay.innerHTML = '');
  document.getElementById('btnCloseCustEditModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelCustEditModal')?.addEventListener('click', closeModal);

  document.getElementById('customerEditForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      fullName: document.getElementById('editCustName').value,
      phone: document.getElementById('editCustPhone').value,
      address: document.getElementById('editCustAddress').value,
      neighborhood: document.getElementById('editCustNeighborhood').value,
      notes: document.getElementById('editCustNotes').value,
    };

    try {
      if (isEdit) {
        await api.updateCustomer(customer.id, payload);
        showToast('Cliente actualizado con éxito 👤');
      } else {
        await api.createOrUpdateCustomer(payload);
        showToast('Cliente registrado con éxito 👤');
      }
      closeModal();
      renderCustomers(document.getElementById('contentContainer'));
    } catch (err) {
      showToast('Error al guardar cliente', 'danger');
    }
  });
}

// Modal de Historial de Pedidos del Cliente
async function openCustomerHistoryModal(customerId) {
  const modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) return;

  try {
    const customer = await api.getCustomerById(customerId);
    const orders = customer.orders || [];
    let historyPage = 1;

    function renderHistoryModal() {
      const { pageItems, totalPages, totalItems, currentPage } = paginateArray(orders, historyPage, 15);
      historyPage = currentPage;

      modalOverlay.innerHTML = `
        <div class="modal-overlay active">
          <div class="modal-card" style="max-width: 620px;">
            <div class="modal-header">
              <h3 class="modal-title">📋 Historial: ${customer.fullName}</h3>
              <button class="modal-close-btn" id="btnCloseHistoryModal">✕</button>
            </div>
            <div class="modal-body">
              <div style="background: var(--bg-app); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
                <p style="margin-bottom: 4px;"><strong>📞 Teléfono:</strong> ${customer.phone}</p>
                <p style="margin-bottom: 0;"><strong>📍 Dirección:</strong> ${customer.address || 'Fonseca'}</p>
              </div>

              <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--primary); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span>Pedidos Anteriores</span>
                <span class="badge" style="font-size: 0.72rem;">${orders.length} pedido(s)</span>
              </h4>
              
              ${
                orders.length > 0
                  ? `
                <div class="table-responsive">
                  <table class="app-table" style="font-size: 0.82rem;">
                    <thead>
                      <tr>
                        <th>Pedido</th>
                        <th>Litros</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Notas</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${pageItems
                        .map(
                          (o) => `
                        <tr>
                          <td><strong>${escapeHtml(o.orderNumber)}</strong></td>
                          <td>${o.totalLiters} L</td>
                          <td><strong>${formatCOP(o.totalAmount)}</strong></td>
                          <td><span class="badge ${o.paymentStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}">${o.paymentStatus}</span></td>
                          <td><span style="font-size: 0.78rem; color: #92400E; max-width: 140px; display: inline-block; word-break: break-word;">${escapeHtml(o.notes) || '-'}</span></td>
                          <td>${formatDate(o.orderDate)}</td>
                        </tr>
                      `
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>
                ${renderPaginationHtml({
                  currentPage: historyPage,
                  totalPages,
                  totalItems,
                  pageSize: 15,
                  itemName: 'pedidos históricos',
                  paginationId: 'modalCustomerHistoryPagination',
                })}
              `
                  : `<p style="color: var(--text-muted); font-size: 0.88rem;">Sin pedidos registrados aún.</p>`
              }
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-accent" id="btnHistoryNewOrder" style="margin-right: auto;">
                + Crear Pedido para ${customer.fullName}
              </button>
              <button type="button" class="btn btn-primary" id="btnCloseHistoryModalBtn">Cerrar</button>
            </div>
          </div>
        </div>
      `;

      const closeModal = () => (modalOverlay.innerHTML = '');
      document.getElementById('btnCloseHistoryModal')?.addEventListener('click', closeModal);
      document.getElementById('btnCloseHistoryModalBtn')?.addEventListener('click', closeModal);

      document.getElementById('btnHistoryNewOrder')?.addEventListener('click', () => {
        closeModal();
        openOrderModal({
          customer: {
            fullName: customer.fullName,
            phone: customer.phone,
            address: customer.address,
          },
          customerId: customer.id,
          deliveryAddress: customer.address,
          isNewForCustomer: true,
        });
      });

      attachPaginationEvents(modalOverlay, 'modalCustomerHistoryPagination', (newPage) => {
        historyPage = newPage;
        renderHistoryModal();
      });
    }

    renderHistoryModal();
  } catch (err) {
    showToast('Error al cargar historial del cliente', 'danger');
  }
}

// Modal para Cobrar / Abonar a Cliente
async function openCustomerPaymentModal(customerOrId) {
  let modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'modalContainer';
    document.body.appendChild(modalOverlay);
  }

  try {
    const custId = typeof customerOrId === 'object' ? customerOrId.id : Number(customerOrId);
    const custData = await api.getCustomerById(custId);
    if (!custData) {
      showToast('No se encontró el cliente', 'danger');
      return;
    }

    const allOrders = (custData.orders || []).map((o) => {
      const realPending = o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - (o.paidAmount || 0));
      return { ...o, realPending };
    });

    const pendingOrders = allOrders.filter((o) => o.realPending > 0 || o.paymentStatus !== 'PAID');

    const deliveredDebt = pendingOrders
      .filter((o) => o.deliveryStatus === 'DELIVERED')
      .reduce((sum, o) => sum + (o.realPending || 0), 0);

    const inProcessAmount = pendingOrders
      .filter((o) => o.deliveryStatus !== 'DELIVERED')
      .reduce((sum, o) => sum + (o.realPending || 0), 0);

    const totalPending = deliveredDebt + inProcessAmount;
    const defaultAmount = deliveredDebt > 0 ? deliveredDebt : (totalPending > 0 ? totalPending : 12000);

    modalOverlay.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal-card" style="max-width: 500px;">
          <div class="modal-header">
            <h3 class="modal-title">💵 Registrar Pago / Abono</h3>
            <button class="modal-close-btn" id="btnClosePayModal">✕</button>
          </div>
          <form id="customerPaymentForm">
            <div class="modal-body">
              
              <!-- Info del Cliente y Saldo -->
              <div style="background: var(--bg-app); border: 1.5px solid var(--border-color); padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                <div style="font-size: 1.05rem; font-weight: 800; color: var(--primary); margin-bottom: 6px;">
                  👤 ${escapeHtml(custData.fullName)}
                </div>
                <div style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 8px;">
                  <span>📞 ${escapeHtml(custData.phone) || 'Sin teléfono'}</span> • <span>📍 ${escapeHtml(custData.address) || 'Fonseca'}</span>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                  ${
                    deliveredDebt > 0
                      ? `<div style="background: #FEE2E2; border: 1px solid #FECACA; color: #DC2626; padding: 6px 10px; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 800;">
                          🚨 Deuda Entregada: ${formatCOP(deliveredDebt)}
                        </div>`
                      : ''
                  }
                  ${
                    inProcessAmount > 0
                      ? `<div style="background: #EDE9FE; border: 1px solid #DDD6FE; color: var(--primary); padding: 6px 10px; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 800;">
                          🥣 Encargos en Proceso: ${formatCOP(inProcessAmount)}
                        </div>`
                      : ''
                  }
                  ${
                    totalPending <= 0
                      ? `<div style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #059669; padding: 6px 10px; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 800;">
                          🟢 Al Día (Sin deuda pendiente)
                        </div>`
                      : `<div style="background: #FFFFFF; border: 1px solid var(--border-color); color: var(--text-main); padding: 6px 10px; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 800;">
                          💰 Saldo Total: ${formatCOP(totalPending)}
                        </div>`
                  }
                </div>
              </div>

              <!-- Seleccionar Pedido Destino -->
              <div class="form-group">
                <label class="form-label">Aplicar Abono a: *</label>
                <select id="custPayOrderId" class="form-select" style="font-size: 0.88rem; font-weight: 600;">
                  <option value="AUTO" selected>⚡ Automático: Aplicar a la deuda más antigua / entregada</option>
                  ${(allOrders.length > 0 ? allOrders : pendingOrders)
                    .map(
                      (o) =>
                        `<option value="${o.id}">
                          #${escapeHtml(o.orderNumber) || o.id} (${escapeHtml(o.batch?.flavor || o.flavor) || 'Yogur'}, ${o.totalLiters}L) • ${
                          o.deliveryStatus === 'DELIVERED' ? '🛵 Entregado' : '🥣 En proceso'
                        } • ${o.realPending > 0 ? `Pendiente: ${formatCOP(o.realPending)}` : '✅ Pagado'}
                        </option>`
                    )
                    .join('')}
                </select>
              </div>

              <!-- Monto a Abonar / Cobrar -->
              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <label class="form-label" style="margin: 0;">Monto a Abonar / Cobrar ($ COP) *</label>
                  <span style="font-size: 0.76rem; color: var(--text-muted);">Sugerido: ${formatCOP(defaultAmount)}</span>
                </div>
                <input 
                  type="number" 
                  id="custPayAmount" 
                  class="form-input" 
                  min="1" 
                  step="any" 
                  value="${defaultAmount}" 
                  style="font-size: 1.15rem; font-weight: 800; color: var(--primary);" 
                  required 
                />
                
                <!-- Botones rápidos de monto -->
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
                  <button type="button" class="btn btn-outline btn-sm quick-pay-btn" data-val="${deliveredDebt > 0 ? deliveredDebt : totalPending}" style="font-size: 0.74rem; padding: 3px 8px;">
                    Total (${formatCOP(deliveredDebt > 0 ? deliveredDebt : totalPending)})
                  </button>
                  <button type="button" class="btn btn-outline btn-sm quick-pay-btn" data-val="12000" style="font-size: 0.74rem; padding: 3px 8px;">
                    $12.000
                  </button>
                  <button type="button" class="btn btn-outline btn-sm quick-pay-btn" data-val="24000" style="font-size: 0.74rem; padding: 3px 8px;">
                    $24.000
                  </button>
                  <button type="button" class="btn btn-outline btn-sm quick-pay-btn" data-val="6000" style="font-size: 0.74rem; padding: 3px 8px;">
                    $6.000
                  </button>
                </div>
              </div>

              <!-- Método de Pago -->
              <div class="form-group">
                <label class="form-label">Método de Pago Recibido *</label>
                <select id="custPayMethod" class="form-select" style="font-weight: 700;">
                  <option value="EFECTIVO" selected>💵 Efectivo</option>
                  <option value="NEQUI">📱 Transferencia Nequi</option>
                  <option value="BANCOLOMBIA">🏦 Transferencia Bancolombia</option>
                  <option value="DAVIPLATA">📱 Transferencia Daviplata</option>
                  <option value="OTRO">💳 Otro medio de pago</option>
                </select>
              </div>

              <!-- Notas / Referencia -->
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Notas / Comprobante (Opcional)</label>
                <input type="text" id="custPayNotes" class="form-input" placeholder="Ej: Pago contraentrega, comprobante #5821..." />
              </div>

            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" id="btnCancelPayModal">Cancelar</button>
              <button type="submit" class="btn btn-accent" id="btnSubmitPay" style="padding: 10px 22px; font-weight: 800;">
                ✅ Confirmar Abono / Pago
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = () => (modalOverlay.innerHTML = '');
    document.getElementById('btnClosePayModal')?.addEventListener('click', closeModal);
    document.getElementById('btnCancelPayModal')?.addEventListener('click', closeModal);

    const amountInput = document.getElementById('custPayAmount');
    modalOverlay.querySelectorAll('.quick-pay-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const val = e.currentTarget.dataset.val;
        if (amountInput) amountInput.value = val;
      });
    });

    document.getElementById('customerPaymentForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amount = Number(amountInput.value);
      if (!amount || amount <= 0) {
        showToast('Ingresa un monto válido mayor a 0', 'danger');
        return;
      }

      const orderIdVal = document.getElementById('custPayOrderId').value;
      const paymentMethod = document.getElementById('custPayMethod').value;
      const notes = document.getElementById('custPayNotes').value;
      const registeredBy = store.authUser?.name || store.currentUser || 'Edier';

      const payload = {
        amount,
        paymentMethod,
        notes: notes ? notes.trim() : undefined,
        registeredBy,
      };
      if (orderIdVal && orderIdVal !== 'AUTO') {
        payload.orderId = Number(orderIdVal);
      } else {
        payload.orderId = 'AUTO';
      }

      try {
        const res = await api.registerCustomerPayment(custData.id, payload);

        showToast(`¡Abono de ${formatCOP(amount)} registrado exitosamente para ${custData.fullName}! 💵`);
        
        // Determinar link de agradecimiento por WhatsApp
        const isDeliveredPayment = deliveredDebt > 0;
        const waThankLink = generateCustomerWhatsAppLink(
          custData.phone,
          custData.fullName,
          0,
          0,
          !isDeliveredPayment,
          isDeliveredPayment ? 'THANK_DELIVERED' : 'DEFAULT'
        );

        modalOverlay.innerHTML = `
          <div class="modal-overlay active">
            <div class="modal-card" style="max-width: 440px; text-align: center; padding: 24px 20px;">
              <div style="font-size: 3rem; margin-bottom: 8px;">🎉</div>
              <h3 style="color: var(--primary); font-size: 1.25rem; font-weight: 800; margin-bottom: 6px;">
                ¡Pago Registrado con Éxito!
              </h3>
              <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 18px;">
                Se ha registrado el pago de <strong>${formatCOP(amount)}</strong> para <strong>${escapeHtml(custData.fullName)}</strong>.
              </p>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <button 
                  type="button" 
                  class="btn btn-whatsapp" 
                  style="padding: 10px 16px; font-weight: 800; font-size: 0.95rem; justify-content: center;"
                  id="btnSendWaThank"
                >
                  ${WA_ICON_SVG} Enviar Agradecimiento por WhatsApp
                </button>
                <button type="button" class="btn btn-outline" id="btnFinishPaySuccess">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        `;

        document.getElementById('btnFinishPaySuccess')?.addEventListener('click', () => {
          modalOverlay.innerHTML = '';
          renderCustomers(document.getElementById('contentContainer'));
        });

        document.getElementById('btnSendWaThank')?.addEventListener('click', async () => {
          const msgData = generateCustomerWhatsAppMessage(
            custData.phone,
            custData.fullName,
            0,
            0,
            !isDeliveredPayment,
            isDeliveredPayment ? 'THANK_DELIVERED' : 'DEFAULT'
          );
          await dispatchSmartWhatsApp({
            phone: msgData.phone,
            text: msgData.message,
            contactName: custData.fullName,
            customerId: custData.id,
            fallbackUrl: msgData.fallbackUrl,
            successToast: '✅ Agradecimiento enviado por WhatsApp oficial',
          });
          setTimeout(() => {
            modalOverlay.innerHTML = '';
            renderCustomers(document.getElementById('contentContainer'));
          }, 600);
        });

      } catch (err) {
        showToast(err.message || 'Error al registrar pago', 'danger');
      }
    });
  } catch (err) {
    showToast('Error al cargar datos de pago del cliente', 'danger');
  }
}

// Modal de Configuración de Cuenta de Cobro y Nequi
export async function openBankSettingsModal() {
  let modalOverlay = document.getElementById('modalContainer');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'modalContainer';
    document.body.appendChild(modalOverlay);
  }

  let current = {
    nequiNumber: cachedSettings.nequiNumber || '3024581882',
    bankName: cachedSettings.bankName || 'Nequi / Bancolombia',
    bankHolder: cachedSettings.bankHolder || 'Edier / YogurArte',
    paymentInstructions: cachedSettings.paymentInstructions || 'Para transferencias por Nequi o Bancolombia',
  };

  try {
    const res = await api.getSettings();
    if (res) current = { ...current, ...res };
  } catch (err) {
    console.warn('Could not load bank settings, using current:', err);
  }

  modalOverlay.innerHTML = `
    <div class="modal-overlay active" id="bankSettingsModalOverlay">
      <div class="modal-card" style="max-width: 520px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">⚙️ Cuenta de Cobro y Datos Bancarios</h3>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
              Configura el número y datos que aparecerán automáticamente en los recordatorios de cobro por WhatsApp
            </p>
          </div>
          <button type="button" class="modal-close-btn" id="btnCloseBankSettingsModal">✕</button>
        </div>

        <form id="bankSettingsForm">
          <div class="modal-body">
            
            <div class="form-group">
              <label class="form-label" style="font-weight: 700;">📱 Número de Nequi / Celular de Cobro *</label>
              <input type="text" id="settingNequiNumber" class="form-input" value="${current.nequiNumber || ''}" placeholder="Ej: 3024581882" required style="font-size: 1.05rem; font-weight: 800; color: #7E22CE;" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">🏦 Banco o Plataforma *</label>
                <input type="text" id="settingBankName" class="form-input" value="${current.bankName || 'Nequi / Bancolombia'}" placeholder="Ej: Nequi / Bancolombia" required style="font-weight: 700;" />
              </div>

              <div class="form-group">
                <label class="form-label">👤 Titular de la Cuenta</label>
                <input type="text" id="settingBankHolder" class="form-input" value="${current.bankHolder || ''}" placeholder="Ej: Edier / YogurArte" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">📝 Instrucción Adicional (Opcional)</label>
              <input type="text" id="settingPaymentInstructions" class="form-input" value="${current.paymentInstructions || ''}" placeholder="Ej: Enviar comprobante al transferir" />
            </div>

            <!-- Vista Previa en Vivo -->
            <div style="background: #F5F3FF; border: 1.5px solid #DDD6FE; border-radius: var(--radius-md); padding: 12px; margin-top: 12px;">
              <div style="font-size: 0.76rem; font-weight: 800; color: #6D28D9; text-transform: uppercase; margin-bottom: 4px;">
                👁️ Vista Previa en los Mensajes de WhatsApp:
              </div>
              <div id="bankPreviewBox" style="font-size: 0.82rem; color: #4C1D95; line-height: 1.4; font-family: monospace; white-space: pre-wrap; background: white; padding: 8px 10px; border-radius: 6px; border: 1px solid #C4B5FD;">
💳 *Medios de Pago / Transferencia:*
• *${current.bankName || 'Nequi / Bancolombia'}:* *${current.nequiNumber || '3024581882'}*${current.bankHolder ? ` (Titular: ${current.bankHolder})` : ''}
• *Efectivo:* Contraentrega
              </div>
            </div>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="btnCancelBankSettingsModal">Cancelar</button>
            <button type="submit" class="btn btn-accent" id="btnSaveBankSettings" style="font-weight: 800; background: #7E22CE; border-color: #7E22CE;">
              💾 Guardar Datos de Cobro
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const updatePreview = () => {
    const num = document.getElementById('settingNequiNumber')?.value.trim() || '3024581882';
    const bank = document.getElementById('settingBankName')?.value.trim() || 'Nequi / Bancolombia';
    const holder = document.getElementById('settingBankHolder')?.value.trim() || '';
    const previewBox = document.getElementById('bankPreviewBox');
    if (previewBox) {
      previewBox.textContent = `💳 *Medios de Pago / Transferencia:*\n• *${bank}:* *${num}*${holder ? ` (Titular: ${holder})` : ''}\n• *Efectivo:* Contraentrega`;
    }
  };

  document.getElementById('settingNequiNumber')?.addEventListener('input', updatePreview);
  document.getElementById('settingBankName')?.addEventListener('input', updatePreview);
  document.getElementById('settingBankHolder')?.addEventListener('input', updatePreview);

  const closeSettingsModal = () => {
    modalOverlay.innerHTML = '';
  };

  document.getElementById('btnCloseBankSettingsModal')?.addEventListener('click', closeSettingsModal);
  document.getElementById('btnCancelBankSettingsModal')?.addEventListener('click', closeSettingsModal);
  document.getElementById('bankSettingsModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'bankSettingsModalOverlay') closeSettingsModal();
  });

  document.getElementById('bankSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveBankSettings');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Guardando... ⏳';
    }

    try {
      const nequiNumber = document.getElementById('settingNequiNumber')?.value.trim();
      const bankName = document.getElementById('settingBankName')?.value.trim();
      const bankHolder = document.getElementById('settingBankHolder')?.value.trim();
      const paymentInstructions = document.getElementById('settingPaymentInstructions')?.value.trim();

      const res = await api.updateSettings({
        nequiNumber,
        bankName,
        bankHolder,
        paymentInstructions,
      });

      cachedSettings = {
        nequiNumber: res.settings?.nequiNumber || nequiNumber,
        bankName: res.settings?.bankName || bankName,
        bankHolder: res.settings?.bankHolder || bankHolder,
        paymentInstructions: res.settings?.paymentInstructions || paymentInstructions,
      };

      showToast('✅ Cuenta de cobro y Nequi actualizados correctamente');
      closeSettingsModal();

      const contentContainer = document.getElementById('contentContainer');
      if (contentContainer && contentContainer.querySelector('#customersGridContainer')) {
        renderCustomers(contentContainer);
      }
    } catch (err) {
      console.error('Error saving bank settings:', err);
      showToast(err.message || 'Error al guardar datos de cobro', 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '💾 Guardar Datos de Cobro';
      }
    }
  });
}


