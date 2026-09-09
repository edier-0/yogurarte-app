export const store = {
  authUser: JSON.parse(localStorage.getItem('yogurarte_auth_user') || 'null'),
  token: localStorage.getItem('yogurarte_token') || null,
  currentUser: localStorage.getItem('yogurarte_user') || 'Edier',
  currentTab: 'dashboard',
  listeners: [],

  isAuthenticated() {
    return !!this.authUser && !!this.token;
  },

  getToken() {
    return this.token || localStorage.getItem('yogurarte_token');
  },

  getUserRole() {
    return this.authUser?.role || 'ADMIN';
  },

  isAdmin() {
    return this.getUserRole() === 'ADMIN';
  },

  isDelivery() {
    return this.getUserRole() === 'DOMICILIARIO';
  },

  isProduction() {
    return this.getUserRole() === 'PRODUCCION';
  },

  isSales() {
    return this.getUserRole() === 'VENTAS';
  },

  setAuth(user, token = null) {
    this.authUser = user;
    this.currentUser = user ? user.name : 'Edier';
    if (token) {
      this.token = token;
      localStorage.setItem('yogurarte_token', token);
    }
    if (user) {
      localStorage.setItem('yogurarte_auth_user', JSON.stringify(user));
      localStorage.setItem('yogurarte_user', user.name);
    } else {
      this.token = null;
      localStorage.removeItem('yogurarte_auth_user');
      localStorage.removeItem('yogurarte_token');
    }
    this.notify();
  },

  logout() {
    this.setAuth(null, null);
  },

  setUser(userName) {
    this.currentUser = userName;
    localStorage.setItem('yogurarte_user', userName);
    this.notify();
  },

  setTab(tabName) {
    this.currentTab = tabName;
    this.notify();
  },

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },

  notify() {
    this.listeners.forEach((listener) => listener(this));
  },

  // Caché de catálogos en memoria para optimizar respuestas de UI
  _catalogCache: new Map(),

  getCached(key, ttlMs = 30000) {
    const item = this._catalogCache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > ttlMs) {
      this._catalogCache.delete(key);
      return null;
    }
    return item.data;
  },

  setCached(key, data) {
    this._catalogCache.set(key, { data, timestamp: Date.now() });
  },

  invalidateCache(prefix = null) {
    if (!prefix) {
      this._catalogCache.clear();
    } else {
      for (const key of this._catalogCache.keys()) {
        if (key.startsWith(prefix)) {
          this._catalogCache.delete(key);
        }
      }
    }
  },
};

// Formato de Moneda Colombiana (COP)
export const formatCOP = (amount) => {
  if (isNaN(amount)) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Formato de Cantidad/Stock amigable (evita desbordes de decimales largos como 48.7000000000001)
export const formatStock = (val, maxDecimals = 2) => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const num = Number(val);
  if (Number.isInteger(num)) return num.toLocaleString('es-CO');
  return num.toLocaleString('es-CO', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  });
};

// Formato de Fecha amigable sin desfase de zona horaria
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    // Si viene en formato ISO o YYYY-MM-DD
    const str = String(dateStr).split('T')[0];
    const parts = str.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const localDate = new Date(year, month, day);
      return new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(localDate);
    }
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch (e) {
    return dateStr;
  }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch (e) {
    return dateStr;
  }
};

// Obtener fecha actual en formato local YYYY-MM-DD
export const getTodayLocalDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Sistema de Notificaciones Toast
export const showToast = (message, type = 'success') => {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '✅';
  if (type === 'danger') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// Formato de Insignia de Medio de Pago
export const formatPaymentBadge = (method) => {
  const m = (method || 'EFECTIVO').toUpperCase().trim();
  if (m === 'ESPECIE_PRODUCTO' || m.includes('ESPECIE') || m.includes('PRODUCTO')) {
    return `<span class="badge" style="background: #E0F2FE; color: #0369A1; font-weight: 800; font-size: 0.76rem; border: 1px solid #7DD3FC;">🍶 En Especie (Yogur)</span>`;
  }
  if (m === 'NEQUI' || m.includes('NEQUI')) {
    return `<span class="badge" style="background: #F3E8FF; color: #7E22CE; font-weight: 800; font-size: 0.76rem; border: 1px solid #D8B4FE;">🟣 Nequi</span>`;
  }
  if (m === 'BANCOLOMBIA' || m.includes('BANCOLOMBIA')) {
    return `<span class="badge" style="background: #FEF3C7; color: #92400E; font-weight: 800; font-size: 0.76rem; border: 1px solid #FDE68A;">🟡 Bancolombia</span>`;
  }
  if (m.includes('TRANSF') || m === 'DIGITAL') {
    return `<span class="badge" style="background: #E0F2FE; color: #0369A1; font-weight: 800; font-size: 0.76rem; border: 1px solid #BAE6FD;">💳 Transferencia</span>`;
  }
  return `<span class="badge" style="background: #DCFCE7; color: #15803D; font-weight: 800; font-size: 0.76rem; border: 1px solid #86EFAC;">💵 Efectivo</span>`;
};

// Utilidad de Debounce para optimizar inputs de búsqueda en tiempo real
export const debounce = (fn, delay = 250) => {
  let timeoutId;
  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

// Generador universal y seguro de enlaces de WhatsApp con soporte total de emojis y usuarios
export const buildWhatsAppUrl = (contact, message) => {
  const encodedText = encodeURIComponent(message);
  if (!contact) {
    return `https://api.whatsapp.com/send/?text=${encodedText}`;
  }

  // Limpiar caracteres invisibles de Unicode (LTR, RTL, isolates, non-breaking spaces)
  const rawContact = String(contact)
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u00A0]/g, '')
    .trim();

  const digits = rawContact.replace(/\D/g, '');

  if (digits.length >= 7) {
    let cleanPhone = digits;
    if (!cleanPhone.startsWith('57') && cleanPhone.length === 10) {
      cleanPhone = `57${cleanPhone}`;
    }
    return `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodedText}`;
  }

  // Si es un @usuario o alias:
  const cleanUsername = rawContact.replace(/^@/, '').trim();
  if (cleanUsername.length > 0) {
    return `https://api.whatsapp.com/send/?username=${cleanUsername}&text=${encodedText}`;
  }

  return `https://api.whatsapp.com/send/?text=${encodedText}`;
};

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
