class ToastManager {
  constructor() { this.c = null; }
  root() {
    if (!this.c) {
      this.c = document.getElementById('toast-container') || Object.assign(document.createElement('div'), { id: 'toast-container' });
      this.c.setAttribute('role', 'status');
      document.body.appendChild(this.c);
    }
    return this.c;
  }
  show(message, type = 'info', duration = 3500) {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const s = document.createElement('span'); s.textContent = message;
    const x = document.createElement('button'); x.textContent = '×'; x.setAttribute('aria-label', 'Dismiss'); x.onclick = () => t.remove();
    t.append(s, x); this.root().appendChild(t);
    setTimeout(() => t.remove(), duration);
  }
  success(m) { this.show(m, 'success'); }
  error(m) { this.show(m, 'error', 5000); }
  info(m) { this.show(m, 'info'); }
}
export const toast = new ToastManager();
window.toast = toast;
