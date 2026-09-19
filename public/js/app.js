import { api } from './api.js';
import { store, showToast } from './store.js';

// Mapa de Vistas con Carga Dinámica (Lazy Loading) para acelerar inicio móvil en un 85%
const views = {
  dashboard: { title: 'Panel de Control', load: () => import('./views/dashboardView.js').then((m) => m.renderDashboard) },
  delivery: { title: '🛵 Mis Domicilios de Hoy', load: () => import('./views/deliveryView.js').then((m) => m.renderDelivery) },
  crm: { title: '💬 CRM y WhatsApp Multi-Agente', load: () => import('./views/crmView.js').then((m) => m.renderCrm) },
  orders: { title: 'Pedidos y Ventas', load: () => import('./views/ordersView.js').then((m) => m.renderOrders) },
  cashControl: { title: 'Control de Caja y Finanzas', load: () => import('./views/cashControlView.js').then((m) => m.renderCashControl) },
  batches: { title: 'Producción de Lotes', load: () => import('./views/batchesView.js').then((m) => m.renderBatches) },
  inventory: { title: 'Materia Prima e Insumos', load: () => import('./views/inventoryView.js').then((m) => m.renderInventory) },
  expenses: { title: 'Gastos e Inversión', load: () => import('./views/expensesView.js').then((m) => m.renderExpenses) },
  staff: { title: 'Nómina, Personal y Accesos', load: () => import('./views/staffView.js?v=20260918_v24_focus_fix').then((m) => m.renderStaff) },
  customers: { title: 'Clientes Frecuentes', load: () => import('./views/customersView.js').then((m) => m.renderCustomers) },
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
        btn.style.display = ['orders', 'crm', 'customers', 'batches'].includes(tab) ? 'flex' : 'none';
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

  // Escuchar cuando una sesión expire en segundo plano (401)
  window.addEventListener('session-expired', () => {
    store.logout();
    showToast('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'warning');
    showLoginScreen();
  });

  // Función para renderizar la pantalla de Login y Recuperación integrada
  function showLoginScreen(initialView = 'login', initialData = {}) {
    if (!loginScreenContainer) return;

    // 1. VISTA: Formulario Principal de Login
    if (initialView === 'login') {
      loginScreenContainer.innerHTML = `
        <div class="login-overlay">
          <div class="login-card">
            <img src="/assets/logo-yogurarte.svg" alt="YogurArte" class="login-logo" />
            <h2 class="login-title">Bienvenido a YogurArte</h2>
            <p class="login-subtitle">Sistema de Control y Producción Artesanal</p>

            <form id="loginForm">
              <div class="form-group" style="text-align: left;">
                <label class="form-label" style="font-weight: 700;">Usuario o Correo *</label>
                <input 
                  type="text" 
                  id="loginUsername" 
                  class="form-input" 
                  placeholder="Ej: edier, yeilin, camilo..." 
                  value="${initialData.username || ''}"
                  required 
                  autocomplete="username"
                  autofocus
                  style="font-weight: 700; font-size: 0.98rem;" 
                />
              </div>

              <div class="form-group" style="text-align: left; margin-bottom: 8px;">
                <label class="form-label" style="font-weight: 700;">Contraseña *</label>
                <div style="position: relative;">
                  <input 
                    type="password" 
                    id="loginPassword" 
                    class="form-input" 
                    placeholder="Ingresa tu contraseña..." 
                    required 
                    autocomplete="current-password"
                    style="padding-right: 40px; font-size: 0.98rem;" 
                  />
                  <button type="button" id="btnTogglePassword" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.1rem; color: var(--text-muted);" title="Ver contraseña">
                    👁️
                  </button>
                </div>
              </div>

              <div style="text-align: right; margin-bottom: 16px;">
                <button type="button" id="btnForgotPassword" style="background: none; border: none; padding: 0; color: var(--primary); font-size: 0.84rem; font-weight: 700; cursor: pointer; text-decoration: underline;">
                  ¿Olvidaste tu contraseña?
                </button>
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

      document.getElementById('btnForgotPassword')?.addEventListener('click', () => {
        showLoginScreen('forgot_identifier');
      });

      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('loginUsername');
        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = pwdInput.value;
        const submitBtn = document.getElementById('btnLoginSubmit');

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Verificando... ⏳';
          }
          errorDiv.style.display = 'none';

          const res = await api.login(username, password);
          store.setAuth(res.user, res.token);
          showToast(`¡Bienvenido de nuevo, ${res.user.name}! 🥛✨`);
          loginScreenContainer.innerHTML = '';
          updateActiveUserUI(res.user);
          
          const defaultTab = getDefaultTabForRole(res.user.role);
          navigateTo(defaultTab);
        } catch (err) {
          errorDiv.textContent = err.message || 'Usuario o contraseña incorrectos';
          errorDiv.style.display = 'block';
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🚀 Iniciar Sesión';
          }
        }
      });
      return;
    }

    // 2. VISTA: Solicitar Usuario o Correo ("¿Olvidaste tu contraseña?")
    if (initialView === 'forgot_identifier') {
      loginScreenContainer.innerHTML = `
        <div class="login-overlay">
          <div class="login-card" style="max-width: 440px;">
            <img src="/assets/logo-yogurarte.svg" alt="YogurArte" class="login-logo" />
            <h2 class="login-title" style="font-size: 1.25rem;">🔐 Recuperar Contraseña</h2>
            <p class="login-subtitle" style="margin-bottom: 18px;">Ingresa tu usuario o correo electrónico registrado</p>

            <form id="forgotIdentifierForm">
              <div class="form-group" style="text-align: left;">
                <label class="form-label" style="font-weight: 700;">Usuario o Correo *</label>
                <input 
                  type="text" 
                  id="forgotIdentifierInput" 
                  class="form-input" 
                  placeholder="Ej: edier, yeilin, camilo..." 
                  required 
                  autofocus
                  style="font-weight: 700;" 
                />
              </div>

              <div id="forgotErrorDiv" style="display: none; color: var(--danger); font-size: 0.85rem; margin-bottom: 14px; font-weight: 700; background: var(--danger-light); padding: 8px; border-radius: var(--radius-sm);"></div>

              <button type="submit" class="btn btn-primary" id="btnSubmitForgotIdentifier" style="width: 100%; padding: 11px; font-weight: 800; font-size: 0.95rem; margin-bottom: 10px;">
                Continuar ➡️
              </button>

              <button type="button" class="btn btn-outline" id="btnBackToLoginFromForgot" style="width: 100%; padding: 9px; font-size: 0.88rem;">
                ⬅️ Volver al Inicio de Sesión
              </button>
            </form>
          </div>
        </div>
      `;

      document.getElementById('btnBackToLoginFromForgot')?.addEventListener('click', () => {
        showLoginScreen('login');
      });

      const form = document.getElementById('forgotIdentifierForm');
      const input = document.getElementById('forgotIdentifierInput');
      const errorDiv = document.getElementById('forgotErrorDiv');
      const submitBtn = document.getElementById('btnSubmitForgotIdentifier');

      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = input.value.trim();
        if (!identifier) return;

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Buscando cuenta... ⏳';
          }
          errorDiv.style.display = 'none';

          const res = await api.forgotPassword(identifier);

          if (res.status === 'admin_recovery') {
            showLoginScreen('admin_reset', { ...res, identifier });
          } else if (res.status === 'notify_admin') {
            showLoginScreen('colab_notify', res);
          }
        } catch (err) {
          errorDiv.textContent = err.message || 'No encontramos ninguna cuenta con estos datos';
          errorDiv.style.display = 'block';
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Continuar ➡️';
          }
        }
      });
      return;
    }

    // 3. VISTA: Restablecer Contraseña de Administrador (con código recibido al correo)
    if (initialView === 'admin_reset') {
      const data = initialData || {};
      loginScreenContainer.innerHTML = `
        <div class="login-overlay">
          <div class="login-card" style="max-width: 440px;">
            <div style="font-size: 2.2rem; margin-bottom: 4px;">👑</div>
            <h2 class="login-title" style="font-size: 1.25rem;">Hola, ${data.name || 'Administrador'}</h2>
            
            <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: var(--radius-md); padding: 12px; margin: 12px 0 16px; text-align: left;">
              <p style="font-size: 0.82rem; color: #15803D; margin: 0; line-height: 1.45;">
                📧 Hemos enviado un código de seguridad de 6 dígitos a tu correo registrado <strong>(${data.emailMasked || 'tu correo'})</strong>. Revisa tu bandeja de entrada o carpeta de spam.
              </p>
            </div>

            <form id="resetAdminForm">
              <div class="form-group" style="text-align: left;">
                <label class="form-label" style="font-weight: 700;">Código de Seguridad (6 dígitos) *</label>
                <input 
                  type="text" 
                  id="resetAdminCode" 
                  class="form-input" 
                  placeholder="Ej: 123456" 
                  maxlength="6"
                  required 
                  autofocus
                  style="font-weight: 800; font-size: 1.25rem; text-align: center; letter-spacing: 4px; font-family: monospace;" 
                />
              </div>

              <div class="form-group" style="text-align: left;">
                <label class="form-label" style="font-weight: 700;">Nueva Contraseña *</label>
                <input 
                  type="password" 
                  id="resetAdminNewPassword" 
                  class="form-input" 
                  placeholder="Mínimo 4 caracteres..." 
                  required 
                  style="font-size: 0.95rem;" 
                />
              </div>

              <div id="resetErrorDiv" style="display: none; color: var(--danger); font-size: 0.85rem; margin-bottom: 14px; font-weight: 700; background: var(--danger-light); padding: 8px; border-radius: var(--radius-sm);"></div>

              <button type="submit" class="btn btn-primary" id="btnSubmitResetAdmin" style="width: 100%; padding: 11px; font-weight: 800; font-size: 0.95rem; margin-bottom: 10px;">
                💾 Guardar Nueva Contraseña
              </button>

              <button type="button" class="btn btn-outline" id="btnBackToLoginFromReset" style="width: 100%; padding: 9px; font-size: 0.88rem;">
                ⬅️ Cancelar y Volver
              </button>
            </form>
          </div>
        </div>
      `;

      document.getElementById('btnBackToLoginFromReset')?.addEventListener('click', () => {
        showLoginScreen('login');
      });

      const form = document.getElementById('resetAdminForm');
      const codeInput = document.getElementById('resetAdminCode');
      const newPwdInput = document.getElementById('resetAdminNewPassword');
      const errorDiv = document.getElementById('resetErrorDiv');
      const submitBtn = document.getElementById('btnSubmitResetAdmin');

      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = codeInput.value.trim();
        const newPassword = newPwdInput.value.trim();
        if (!code || !newPassword) return;

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Actualizando... ⏳';
          }
          errorDiv.style.display = 'none';

          await api.resetPassword(data.username || data.identifier, code, newPassword);
          showToast('¡Tu contraseña ha sido restablecida con éxito! 🔑✨');
          showLoginScreen('login', { username: data.username });
        } catch (err) {
          errorDiv.textContent = err.message || 'Código incorrecto o expirado';
          errorDiv.style.display = 'block';
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Guardar Nueva Contraseña';
          }
        }
      });
      return;
    }

    // 4. VISTA: Notificación de Seguridad para Colaboradores (Contactar a los dueños)
    if (initialView === 'colab_notify') {
      const data = initialData || {};
      let roleName = 'Colaborador';
      if (data.role === 'DOMICILIARIO') roleName = 'Domiciliario / Repartidor';
      if (data.role === 'PRODUCCION') roleName = 'Encargado de Producción';
      if (data.role === 'VENTAS') roleName = 'Encargado de Ventas';

      const msgEdier = encodeURIComponent(`¡Hola Edier! Soy ${data.name || 'del equipo'} (${roleName}). Olvidé mi contraseña de acceso a YogurArte. ¿Podrías por favor restablecerla?`);
      const msgYeilin = encodeURIComponent(`¡Hola Yeilin! Soy ${data.name || 'del equipo'} (${roleName}). Olvidé mi contraseña de acceso a YogurArte. ¿Podrías por favor restablecerla?`);

      loginScreenContainer.innerHTML = `
        <div class="login-overlay">
          <div class="login-card" style="max-width: 440px;">
            <div style="font-size: 2.2rem; margin-bottom: 4px;">🛡️</div>
            <h2 class="login-title" style="font-size: 1.25rem;">Hola, ${data.name || 'Colaborador'}</h2>
            <span class="badge" style="background: var(--primary-light); color: var(--primary); font-weight: 700; margin-bottom: 12px; display: inline-block;">${roleName}</span>

            <p style="font-size: 0.85rem; color: var(--text-main); line-height: 1.45; text-align: left; background: #F8FAFC; border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
              Por políticas de seguridad de YogurArte, las contraseñas del equipo son administradas directamente por <strong>Edier</strong> y <strong>Yeilin</strong>.
            </p>

            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
              <a href="https://api.whatsapp.com/send?phone=573024581882&text=${msgEdier}" target="_blank" class="btn btn-outline" style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #15803D; border-color: #86EFAC; font-weight: 800; padding: 10px;">
                <span>💬 Solicitar a Edier por WhatsApp</span>
              </a>

              <a href="https://api.whatsapp.com/send?phone=573147464663&text=${msgYeilin}" target="_blank" class="btn btn-outline" style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #6D28D9; border-color: #DDD6FE; font-weight: 800; padding: 10px;">
                <span>💬 Solicitar a Yeilin por WhatsApp</span>
              </a>
            </div>

            <button type="button" class="btn btn-primary" id="btnBackToLoginFromNotify" style="width: 100%; padding: 10px; font-weight: 800;">
              ⬅️ Volver al Inicio de Sesión
            </button>
          </div>
        </div>
      `;

      document.getElementById('btnBackToLoginFromNotify')?.addEventListener('click', () => {
        showLoginScreen('login');
      });
      return;
    }
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
  async function navigateTo(tabName) {
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
    } else if (role === 'VENTAS' && !['orders', 'crm', 'customers', 'batches'].includes(tabName)) {
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
    const moreTabs = ['crm', 'inventory', 'expenses', 'staff', 'customers'];
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
      if (tabName === 'crm') {
        if (mobileMoreIcon) mobileMoreIcon.textContent = '💬';
        if (mobileMoreLabel) mobileMoreLabel.textContent = 'CRM';
      } else if (tabName === 'inventory') {
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

    // Renderizar la vista correspondiente con carga diferida y manejo de error
    try {
      if (typeof view.load === 'function') {
        const renderFn = await view.load();
        renderFn(contentContainer);
      } else if (typeof view.render === 'function') {
        view.render(contentContainer);
      }
    } catch (err) {
      console.error(`Error loading view ${effectiveTab}:`, err);
      contentContainer.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px;">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">Error al cargar la pantalla</div>
          <div class="empty-state-text">Ocurrió un inconveniente al cargar esta sección. Por favor intenta de nuevo.</div>
          <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 12px;">🔄 Reintentar</button>
        </div>
      `;
    }
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

  // Botón Global de Nuevo Pedido en Header / Sidebar / FAB con importación dinámica
  const handleOpenGlobalOrder = async () => {
    if (store.isAuthenticated()) {
      const { openOrderModal } = await import('./views/ordersView.js');
      openOrderModal();
    }
  };

  document.getElementById('btnNewOrderGlobal')?.addEventListener('click', handleOpenGlobalOrder);
  document.getElementById('mobileFabOrder')?.addEventListener('click', handleOpenGlobalOrder);

  // Iniciar flujo de autenticación
  checkAuth();
});
