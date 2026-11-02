/**
 * APARTMENT VISITOR MANAGEMENT SYSTEM
 * Common Utilities, Toast Notifications, Modals & Navigation
 */

// Toast Notification Manager
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(type = 'info', title = '', message = '', duration = 4000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else {
      iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        setTimeout(() => toast.remove(), 250);
      }, duration);
    }
  },

  success(title, message) {
    this.show('success', title, message);
  },

  error(title, message) {
    this.show('error', title, message, 6000);
  },

  warning(title, message) {
    this.show('warning', title, message);
  },

  info(title, message) {
    this.show('info', title, message);
  }
};

// Modal Helper Functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Live Topbar Clock & Date
function initLiveClock() {
  const clockEl = document.getElementById('topbar-clock');
  if (!clockEl) return;

  function update() {
    const now = new Date();
    const options = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    clockEl.textContent = now.toLocaleDateString(undefined, options);
  }

  update();
  setInterval(update, 1000);
}

// Check Database Connection Health
async function checkDbStatus() {
  const pill = document.getElementById('db-status-pill');
  if (!pill) return;

  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.database && data.database.connected) {
      pill.innerHTML = `<span class="status-dot"></span> MySQL Connected (${data.database.database})`;
      pill.style.borderColor = 'var(--color-emerald-soft)';
      pill.style.color = 'var(--color-emerald-primary)';
    } else {
      pill.innerHTML = `<span class="status-dot" style="background:#EF4444;box-shadow:0 0 8px #EF4444;"></span> MySQL Disconnected`;
      pill.style.borderColor = '#FCA5A5';
      pill.style.color = '#B91C1C';
    }
  } catch (err) {
    pill.innerHTML = `<span class="status-dot" style="background:#EF4444;"></span> Offline`;
  }
}

// Staff Authentication & Profile Management
function initStaffProfile() {
  const guardNameEl = document.getElementById('guard-name');
  const guardBadgeEl = document.getElementById('guard-badge');
  const guardAvatarEl = document.getElementById('guard-avatar');
  const logoutBtn = document.getElementById('btn-logout');

  const sessionRaw = localStorage.getItem('apt_security_session');
  let session = null;
  if (sessionRaw) {
    try {
      session = JSON.parse(sessionRaw);
    } catch (e) {
      session = null;
    }
  }

  // Default fallback if not logged in
  if (!session) {
    session = {
      name: 'Duty Security Guard',
      role: 'Main Gate Alpha',
      badgeId: 'SEC-GATE-101'
    };
  }

  if (guardNameEl) guardNameEl.textContent = session.name;
  if (guardBadgeEl) guardBadgeEl.textContent = `${session.role} • ${session.badgeId || 'Active'}`;
  if (guardAvatarEl) {
    const initials = session.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    guardAvatarEl.textContent = initials || 'SG';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {}
      localStorage.removeItem('apt_security_session');
      window.location.href = 'login.html';
    });
  }
}

// Mobile Sidebar Drawer Toggle
function initMobileNavigation() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  if (!menuBtn || !sidebar) return;

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('mobile-open');
  });

  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
      sidebar.classList.remove('mobile-open');
    }
  });
}

// Global modal overlay click-to-close & ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
      modal.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initLiveClock();
  checkDbStatus();
  initStaffProfile();
  initMobileNavigation();

  // Attach backdrop close listener to all modal overlays
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  // Attach modal close buttons
  document.querySelectorAll('.modal-close-btn, [data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });
});
