export const store = {
  authUser: JSON.parse(localStorage.getItem('yogurarte_auth_user') || 'null'),
  currentUser: localStorage.getItem('yogurarte_user') || 'Edier',
  currentTab: 'dashboard',
  listeners: [],

  isAuthenticated() {
    return !!this.authUser;
  },

  setAuth(user) {
    this.authUser = user;
    this.currentUser = user ? user.name : 'Edier';
    if (user) {
      localStorage.setItem('yogurarte_auth_user', JSON.stringify(user));
      localStorage.setItem('yogurarte_user', user.name);
    } else {
      localStorage.removeItem('yogurarte_auth_user');
    }
    this.notify();
  },

  logout() {
    this.setAuth(null);
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
