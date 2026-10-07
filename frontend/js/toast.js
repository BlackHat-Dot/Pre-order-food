/* ============================================================================
   PREORDER TOAST NOTIFICATION ENGINE
   Technical Monospaced Notification Feed
   ============================================================================ */

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  show(message, type = 'info', duration = 3800) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const textSpan = document.createElement('span');
    textSpan.textContent = `[ ${type.toUpperCase()} ] ${message}`;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'var(--text-tertiary)';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontFamily = 'var(--font-mono)';
    closeBtn.style.fontSize = '1.1rem';
    closeBtn.onclick = () => toast.remove();

    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);

    this.container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 200ms ease-out';
        setTimeout(() => toast.remove(), 200);
      }
    }, duration);
  }

  success(msg) { this.show(msg, 'success'); }
  error(msg) { this.show(msg, 'error'); }
  info(msg) { this.show(msg, 'info'); }
}

export const toast = new ToastManager();
window.toast = toast;
