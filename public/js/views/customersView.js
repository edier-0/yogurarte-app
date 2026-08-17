import { api } from '../api.js';
import { formatCOP, formatDate, showToast } from '../store.js';
import { openOrderModal } from './ordersView.js';

let searchQuery = '';
let cachedCustomers = [];

export async function renderCustomers(container) {
  container.innerHTML = `
    <!-- Barra de Búsqueda y Acción -->
    <div class="toolbar-container">
      <div class="toolbar-left">
        <div class="search-box input-with-icon">
          <span class="input-icon">🔍</span>
          <input 
            type="text" 
            id="customerSearchInput" 
            class="form-input" 
            placeholder="Buscar cliente por nombre, teléfono o dirección..." 
            value="${searchQuery}"
          />
        </div>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-accent" id="btnOpenNewCustModal">
          <span>+</span> Registrar Cliente
        </button>
      </div>
    </div>

    <!-- Directorio de Clientes -->
    <div id="customersGridContainer">
      <div style="text-align: center; padding: 24px; color: var(--text-muted);">
        Cargando directorio de clientes... 👥
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#customerSearchInput');
  let debounceTimer;
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value;
      loadCustomersList(container);
    }, 250);
  });

  container.querySelector('#btnOpenNewCustModal')?.addEventListener('click', () => {
    openCustomerEditModal();
  });

  await loadCustomersList(container);
}

async function loadCustomersList(container) {
  const gridContainer = container.querySelector('#customersGridContainer');
  if (!gridContainer) return;

  try {
    const customers = await api.getCustomers(searchQuery);
    cachedCustomers = customers || [];

    if (!customers || customers.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-title">No se encontraron clientes</div>
          <div class="empty-state-text">Registra tus clientes habituales para agilizar la toma de pedidos.</div>
          <button class="btn btn-primary" id="btnRegisterCustEmpty">+ Registrar Primer Cliente</button>
        </div>
      `;
      gridContainer.querySelector('#btnRegisterCustEmpty')?.addEventListener('click', () => openCustomerEditModal());
      return;
    }

    gridContainer.innerHTML = `
      <div class="orders-grid">
        ${customers
          .map((c) => {
            const rawPhone = (c.phone || '').trim();
            const isUsername = rawPhone.startsWith('@') || /[a-zA-Z]/.test(rawPhone);
            let waLink = '';
            let displayContact = rawPhone;

            if (isUsername) {
              const cleanUser = rawPhone.replace(/^@/, '').trim();
              waLink = `https://wa.me/${cleanUser}`;
              displayContact = rawPhone.startsWith('@') ? rawPhone : `@${rawPhone}`;
            } else {
              let cleanPhone = rawPhone.replace(/\D/g, '');
              if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
                cleanPhone = `57${cleanPhone}`;
              }
              waLink = `https://wa.me/${cleanPhone}`;
            }

            return `
            <div class="order-card" data-id="${c.id}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div>
                  <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">${c.fullName}</h4>
                  <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                    <span>${isUsername ? '💬' : '📞'}</span> <strong>${displayContact}</strong>
                  </div>
                  <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">
                    <span>📍</span> ${c.address || 'Fonseca'} ${c.neighborhood ? `(${c.neighborhood})` : ''}
                  </div>
                </div>
                <a href="${waLink}" target="_blank" class="btn btn-whatsapp btn-sm" title="Abrir chat en WhatsApp">
                  <span>📲</span>
                </a>
              </div>

              <div style="background: var(--bg-app); padding: 12px; border-radius: var(--radius-md); display: flex; justify-content: space-around; text-align: center; margin: 10px 0;">
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
                  <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Saldo Deuda</span>
                  <div style="font-size: 1.15rem; font-weight: 800; color: ${c.pendingDebt > 0 ? 'var(--danger)' : 'var(--success)'};">
                    ${formatCOP(c.pendingDebt)}
                  </div>
                </div>
              </div>

              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; border-top: 1px solid var(--border-subtle); padding-top: 10px;">
                <button class="btn btn-accent btn-sm btn-create-order-for-cust" data-id="${c.id}" style="flex: 1.2; font-weight: 800;" title="Crear un pedido para este cliente">
                  <span>+</span> Crear Pedido
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
    `;

    // Asignar eventos
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

    modalOverlay.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal-card" style="max-width: 580px;">
          <div class="modal-header">
            <h3 class="modal-title">📋 Historial: ${customer.fullName}</h3>
            <button class="modal-close-btn" id="btnCloseHistoryModal">✕</button>
          </div>
          <div class="modal-body">
            <div style="background: var(--bg-app); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
              <p style="margin-bottom: 4px;"><strong>📞 Teléfono:</strong> ${customer.phone}</p>
              <p style="margin-bottom: 0;"><strong>📍 Dirección:</strong> ${customer.address || 'Fonseca'}</p>
            </div>

            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--primary); margin-bottom: 10px;">Pedidos Anteriores</h4>
            
            ${
              customer.orders && customer.orders.length > 0
                ? `
              <table class="app-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Litros</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  ${customer.orders
                    .map(
                      (o) => `
                    <tr>
                      <td><strong>${o.orderNumber}</strong></td>
                      <td>${o.totalLiters} L</td>
                      <td><strong>${formatCOP(o.totalAmount)}</strong></td>
                      <td><span class="badge ${o.paymentStatus === 'PAID' ? 'badge-paid' : 'badge-pending'}">${o.paymentStatus}</span></td>
                      <td>${formatDate(o.orderDate)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
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
  } catch (err) {
    showToast('Error al cargar historial del cliente', 'danger');
  }
}
