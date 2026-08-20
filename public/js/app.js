import { api } from './api.js';
import { store, showToast } from './store.js';
import { renderDashboard } from './views/dashboardView.js';
import { renderOrders, openOrderModal } from './views/ordersView.js';
import { renderBatches } from './views/batchesView.js';
import { renderInventory } from './views/inventoryView.js';
import { renderExpenses } from './views/expensesView.js';
import { renderCashControl } from './views/cashControlView.js';
import { renderStaff } from './views/staffView.js';
import { renderCustomers } from './views/customersView.js';
import { renderDelivery } from './views/deliveryView.js';

// Mapa de Vistas
const views = {
  dashboard: { title: 'Panel de Control', render: renderDashboard },
  delivery: { title: '🛵 Mis Domicilios de Hoy', render: renderDelivery },
  orders: { title: 'Pedidos y Ventas', render: renderOrders },
  cashControl: { title: 'Control de Caja y Finanzas', render: renderCashControl },
  batches: { title: 'Producción de Lotes', render: renderBatches },
  inventory: { title: 'Materia Prima e Insumos', render: renderInventory },
  expenses: { title: 'Gastos e Inversión', render: renderExpenses },
  staff: { title: 'Nómina, Personal y Accesos', render: renderStaff },
  customers: { title: 'Clientes Frecuentes', render: renderCustomers },
};

document.addEventListener('DOMContentLoaded', () => {
  const contentContainer = document.getElementById('contentContainer');
  const pageTitleElement = document.getElementById('pageTitle');
  const loginScreenContainer = document.getElementById('loginScreenContainer');

  const activeUserNameDisplay = document.getElementById('activeUserNameDisplay');
  const userAvatar = document.getElementById('userAvatar');
  const headerUserNameDisplay = document.getElementById('headerUserNameDisplay');
  const headerUserAvatar = document.getElementById('headerUserAvatar');

  // Función para sincronizar la UI del usuario logueado
  function updateActiveUserUI(userObj) {
    const name = (typeof userObj === 'object' ? userObj.name : userObj) || 'Edier';
    const role = (typeof userObj === 'object' ? userObj.role : store.getUserRole()) || 'ADMIN';
    const initial = name.charAt(0).toUpperCase();

    let roleName = '👑 Socio Admin';
    if (role === 'PRODUCCION') roleName = '🧑‍🍳 Producción';
    if (role === 'VENTAS') roleName = '🛍️ Ventas';
    if (role === 'DOMICILIARIO') roleName = '🛵 Repartidor';

    if (activeUserNameDisplay) activeUserNameDisplay.innerHTML = `${name} <small style="display:block; font-size:0.72rem; color:var(--text-muted); font-weight:600;">${roleName}</small>`;
    if (userAvatar) userAvatar.textContent = initial;
    if (headerUserNameDisplay) headerUserNameDisplay.textContent = name;
    if (headerUserAvatar) headerUserAvatar.textContent = initial;

    updateNavigationForRole(role);
  }

  // Actualizar navegación según el rol del usuario
  function updateNavigationForRole(role) {
    const isDelivery = role === 'DOMICILIARIO';
    const isProd = role === 'PRODUCCION';
    const isSales = role === 'VENTAS';
    const isAdmin = role === 'ADMIN';

    // Sidebar items
    document.querySelectorAll('.sidebar .nav-item[data-tab]').forEach((btn) => {
      const tab = btn.dataset.tab;
      if (tab === 'delivery') {
        btn.style.display = isDelivery || isAdmin ? 'flex' : 'none';
      } else if (isDelivery) {
        btn.style.display = 'none';
      } else if (isProd) {
        btn.style.display = ['batches', 'inventory', 'orders'].includes(tab) ? 'flex' : 'none';
      } else if (isSales) {
        btn.style.display = ['orders', 'customers', 'batches'].includes(tab) ? 'flex' : 'none';
      } else {
        btn.style.display = 'flex';
      }
    });

    // Mobile nav items
    document.querySelectorAll('.mobile-nav .mobile-nav-btn[data-tab]').forEach((btn) => {
      const tab = btn.dataset.tab;
      if (tab === 'delivery') {
        btn.style.display = isDelivery || isAdmin ? 'flex' : 'none';
      } else if (isDelivery) {
        btn.style.display = 'none';
      } else if (isProd) {
        btn.style.display = ['batches', 'orders'].includes(tab) ? 'flex' : 'none';
      } else if (isSales) {
        btn.style.display = ['orders', 'batches'].includes(tab) ? 'flex' : 'none';
      } else {
        btn.style.display = 'flex';
      }
    });

    const btnMobileMore = document.getElementById('btnMobileMore');
    if (btnMobileMore) {
      btnMobileMore.style.display = isDelivery ? 'none' : 'flex';
    }

    // Botones de crear pedido
    const btnNewOrderGlobal = document.getElementById('btnNewOrderGlobal');
    const mobileFabOrder = document.getElementById('mobileFabOrder');
    if (btnNewOrderGlobal) btnNewOrderGlobal.style.display = isDelivery ? 'none' : 'inline-flex';
    if (mobileFabOrder) mobileFabOrder.style.display = isDelivery ? 'none' : 'flex';
  }

  // Obtener la pestaña inicial recomendada según el rol
  function getDefaultTabForRole(role) {
    if (role === 'DOMICILIARIO') return 'delivery';
    if (role === 'PRODUCCION') return 'batches';
    if (role === 'VENTAS') return 'orders';
    return 'dashboard';
  }

  // Comprobar autenticación al cargar
  function checkAuth() {
    if (!store.isAuthenticated()) {
      showLoginScreen();
    } else {
      if (loginScreenContainer) loginScreenContainer.innerHTML = '';
      const role = store.getUserRole();
      updateActiveUserUI({ name: store.currentUser, role });
      
      const defaultTab = getDefaultTabForRole(role);
      const targetTab = store.currentTab || defaultTab;
      navigateTo(targetTab);
    }
  }

  // Pantalla de Inicio de Sesión
  async function showLoginScreen() {
    if (!loginScreenContainer) return;

    let usersList = [];
    try {
      usersList = await api.getUsers();
    } catch (e) {
      console.warn('Could not fetch user list for login, using defaults:', e);
    }

    loginScreenContainer.innerHTML = `
      <div class="login-overlay">
        <div class="login-card">
          <img src="/assets/logo-yogurarte.svg" alt="YogurArte" class="login-logo" />
          <h2 class="login-title">Bienvenido a YogurArte</h2>
          <p class="login-subtitle">Sistema de Control y Producción Artesanal</p>

          <form id="loginForm">
            <div class="form-group" style="text-align: left;">
              <label class="form-label">Usuario *</label>
              ${
                usersList && usersList.length > 0
                  ? `
                <select id="loginUsername" class="form-select" required style="font-weight: 700;">
                  ${usersList
                    .filter((u) => u.isActive !== false)
                    .map((u) => {
                      let roleLabel = '👑 Admin';
                      if (u.role === 'PRODUCCION') roleLabel = '🧑‍🍳 Producción';
                      if (u.role === 'VENTAS') roleLabel = '🛍️ Ventas';
                      if (u.role === 'DOMICILIARIO') roleLabel = '🛵 Domiciliario';
                      return `<option value="${u.username}">👤 ${u.name} (${roleLabel})</option>`;
                    })
                    .join('')}
                </select>
              `
                  : `
                <input type="text" id="loginUsername" class="form-input" placeholder="Ingresa tu usuario (ej: edier, yeilin)..." required style="font-weight: 700;" />
              `
              }
            </div>

            <div class="form-group" style="text-align: left;">
              <label class="form-label">Contraseña *</label>
              <div style="position: relative;">
                <input type="password" id="loginPassword" class="form-input" placeholder="Ingresa tu contraseña..." required style="padding-right: 40px;" />
                <button type="button" id="btnTogglePassword" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.1rem; color: var(--text-muted);" title="Ver contraseña">
                  👁️
                </button>
              </div>
            </div>

            <div id="loginError" style="display: none; color: var(--danger); font-size: 0.85rem; margin-bottom: 14px; font-weight: 700; background: var(--danger-light); padding: 8px; border-radius: var(--radius-sm);"></div>

            <button type="submit" class="btn btn-primary" id="btnLoginSubmit" style="width: 100%; padding: 12px; font-weight: 800; font-size: 1rem;">
              🚀 Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('loginForm');
    const pwdInput = document.getElementById('loginPassword');
    const toggleBtn = document.getElementById('btnTogglePassword');
    const errorDiv = document.getElementById('loginError');

    toggleBtn?.addEventListener('click', () => {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        toggleBtn.textContent = '🙈';
      } else {
        pwdInput.type = 'password';
        toggleBtn.textContent = '👁️';
      }
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById('loginUsername');
      const username = usernameInput ? usernameInput.value.trim() : 'edier';
      const password = pwdInput.value;
      const submitBtn = document.getElementById('btnLoginSubmit');

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Verificando... ⏳';
        }
        errorDiv.style.display = 'none';

        const res = await api.login(username, password);
        store.setAuth(res.user);
        showToast(`¡Bienvenido de nuevo, ${res.user.name}! 🥛✨`);
        loginScreenContainer.innerHTML = '';
        updateActiveUserUI(res.user);
        
        const defaultTab = getDefaultTabForRole(res.user.role);
        navigateTo(defaultTab);
      } catch (err) {
        errorDiv.textContent = err.message || 'Contraseña incorrecta';
        errorDiv.style.display = 'block';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🚀 Iniciar Sesión';
        }
      }
    });
  }

  // Logout en Desktop y Móvil
  function handleLogout() {
    if (confirm('¿Deseas cerrar tu sesión actual en YogurArte?')) {
      store.logout();
      showToast('Has cerrado sesión');
      showLoginScreen();
    }
  }

  document.getElementById('btnLogoutDesktop')?.addEventListener('click', handleLogout);
  document.getElementById('btnLogoutMobile')?.addEventListener('click', handleLogout);

  // Función para cambiar de vista (Navegación SPA)
  function navigateTo(tabName) {
    if (!store.isAuthenticated()) {
      showLoginScreen();
      return;
    }

    const role = store.getUserRole();
    let effectiveTab = tabName;

    // Control de permisos según el rol
    if (role === 'DOMICILIARIO' && tabName !== 'delivery') {
      effectiveTab = 'delivery';
    } else if (role === 'PRODUCCION' && !['batches', 'inventory', 'orders'].includes(tabName)) {
      effectiveTab = 'batches';
    } else if (role === 'VENTAS' && !['orders', 'customers', 'batches'].includes(tabName)) {
      effectiveTab = 'orders';
    }

    const view = views[effectiveTab] || views.dashboard;
    store.currentTab = effectiveTab;

    // Actualizar Título
    if (pageTitleElement) {
      pageTitleElement.textContent = view.title;
    }

    // Actualizar Estados Activos en Sidebar Desktop
    document.querySelectorAll('.sidebar .nav-item').forEach((btn) => {
      if (btn.dataset.tab === effectiveTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Actualizar Estados Activos en Mobile Nav
    const moreTabs = ['inventory', 'expenses', 'staff', 'customers'];
    const btnMobileMore = document.getElementById('btnMobileMore');
    const mobileMoreIcon = document.getElementById('mobileMoreIcon');
    const mobileMoreLabel = document.getElementById('mobileMoreLabel');

    document.querySelectorAll('.mobile-nav .mobile-nav-btn[data-tab]').forEach((btn) => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (moreTabs.includes(tabName)) {
      btnMobileMore?.classList.add('active');
      if (tabName === 'inventory') {
        if (mobileMoreIcon) mobileMoreIcon.textContent = '📦';
        if (mobileMoreLabel) mobileMoreLabel.textContent = 'Insumos';
      } else if (tabName === 'expenses') {
        if (mobileMoreIcon) mobileMoreIcon.textContent = '🧾';
        if (mobileMoreLabel) mobileMoreLabel.textContent = 'Gastos';
      } else if (tabName === 'staff') {
        if (mobileMoreIcon) mobileMoreIcon.textContent = '👥';
        if (mobileMoreLabel) mobileMoreLabel.textContent = 'Nómina';
      } else if (tabName === 'customers') {
        if (mobileMoreIcon) mobileMoreIcon.textContent = '🤝';
        if (mobileMoreLabel) mobileMoreLabel.textContent = 'Clientes';
      }
    } else {
      btnMobileMore?.classList.remove('active');
      if (mobileMoreIcon) mobileMoreIcon.textContent = '☰';
      if (mobileMoreLabel) mobileMoreLabel.textContent = 'Más';
    }

    // Actualizar items dentro del Bottom Sheet "Más"
    document.querySelectorAll('.mobile-more-item').forEach((btn) => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Cerrar el sheet de Más si estaba abierto
    closeMobileMore();

    // Renderizar la vista correspondiente
    view.render(contentContainer);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Control del Bottom Sheet de Más Opciones en Móvil
  const mobileMoreOverlay = document.getElementById('mobileMoreOverlay');
  const btnCloseMobileMore = document.getElementById('btnCloseMobileMore');
  const btnMobileMore = document.getElementById('btnMobileMore');

  function openMobileMore() {
    mobileMoreOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMore() {
    mobileMoreOverlay?.classList.remove('active');
    document.body.style.overflow = '';
  }

  btnMobileMore?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mobileMoreOverlay?.classList.contains('active')) {
      closeMobileMore();
    } else {
      openMobileMore();
    }
  });

  btnCloseMobileMore?.addEventListener('click', closeMobileMore);

  mobileMoreOverlay?.addEventListener('click', (e) => {
    if (e.target === mobileMoreOverlay) {
      closeMobileMore();
    }
  });

  // Listeners para botones de navegación Desktop, Mobile y Bottom Sheet
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      if (tab) {
        navigateTo(tab);
      }
    });
  });

  // Botón Global de Nuevo Pedido en Header / Sidebar / FAB
  document.getElementById('btnNewOrderGlobal')?.addEventListener('click', () => {
    if (store.isAuthenticated()) openOrderModal();
  });

  document.getElementById('mobileFabOrder')?.addEventListener('click', () => {
    if (store.isAuthenticated()) openOrderModal();
  });

  // Iniciar flujo de autenticación
  checkAuth();
});
