/* ============================================================================
   PREORDER ARCHITECTURAL SHELL & EVENT ORCHESTRATOR
   Header, Footer, Cart Drawer & Telemetry Synchronization
   ============================================================================ */

import { auth } from './auth.js';
import { cart } from './cart.js';
import { toast } from './toast.js';

export function formatPrice(num) {
  return `₹${Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function initGlobalShell() {
  renderHeader();
  renderFooter();
  renderCartDrawer();
  bindCartEvents();
  updateAuthUI();
}

function renderHeader() {
  const headerContainer = document.getElementById('global-header');
  if (!headerContainer) return;

  const currentPath = window.location.pathname;
  const isOwner = auth.isOwner();
  const isAdmin = auth.isAdmin();

  headerContainer.innerHTML = `
    <header class="app-header">
      <div class="app-container">
        <div class="header-inner">
          <a href="/index.html" class="brand-mark">
            <span class="brand-symbol">P</span>
            <div class="brand-label">
              <span class="brand-title">PREORDER</span>
              <span class="brand-sub">CULINARY LOGISTICS</span>
            </div>
          </a>

          <nav class="header-nav">
            <a href="/index.html" class="nav-link ${currentPath === '/' || currentPath.endsWith('index.html') ? 'active' : ''}">Kitchens</a>
            <a href="/orders.html" class="nav-link ${currentPath.includes('orders.html') ? 'active' : ''}">Track Orders</a>
            <a href="/loyalty.html" class="nav-link ${currentPath.includes('loyalty.html') ? 'active' : ''}">Loyalty Vault</a>
            ${isOwner ? `<a href="/owner.html" class="nav-link ${currentPath.includes('owner.html') ? 'active' : ''}">Kitchen Desk</a>` : ''}
            ${isAdmin ? `<a href="/admin.html" class="nav-link ${currentPath.includes('admin.html') ? 'active' : ''}">Control Admin</a>` : ''}
          </nav>

          <div class="header-actions">
            <button class="cart-launcher-btn" id="open-cart-btn" aria-label="Open Cart Ticket">
              <span>TICKET</span>
              <span class="cart-count-pill" id="header-cart-count">0</span>
            </button>
            <div id="header-auth-slot"></div>
          </div>
        </div>
      </div>
    </header>
  `;
}

function updateAuthUI() {
  const slot = document.getElementById('header-auth-slot');
  if (!slot) return;

  if (auth.isLoggedIn()) {
    const user = auth.getUser();
    const name = (user && user.name) ? user.name.split(' ')[0] : 'Account';
    const role = (user && user.role) ? user.role : 'user';

    slot.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <a href="/profile.html" class="account-pill">
          <span>${name}</span>
          <span class="account-pill-role">${role}</span>
        </a>
        <button id="logout-btn" class="btn btn-ghost btn-sm" title="Log Out" style="padding:4px 8px; font-size:0.75rem;">
          LOGOUT
        </button>
      </div>
    `;

    document.getElementById('logout-btn')?.addEventListener('click', () => {
      auth.logout();
    });
  } else {
    slot.innerHTML = `
      <a href="/login.html" class="btn btn-secondary btn-sm">LOG IN</a>
    `;
  }
}

function renderCartDrawer() {
  if (document.getElementById('cart-drawer-root')) return;

  const drawerRoot = document.createElement('div');
  drawerRoot.id = 'cart-drawer-root';
  drawerRoot.innerHTML = `
    <div class="cart-drawer-backdrop" id="cart-backdrop"></div>
    <div class="cart-drawer" id="cart-drawer" aria-labelledby="cart-title" role="dialog">
      <div class="drawer-header">
        <div>
          <div class="eyebrow" style="margin-bottom:2px;">DISPATCH TICKET</div>
          <h3 class="drawer-title" id="cart-title">Order Assembly</h3>
        </div>
        <button class="drawer-close" id="close-cart-btn" aria-label="Close Cart">&times;</button>
      </div>

      <div class="drawer-items" id="drawer-items-list">
        <!-- Injected dynamically -->
      </div>

      <div class="drawer-footer" id="drawer-footer">
        <div class="drawer-subtotal-row">
          <span>KITCHEN</span>
          <span id="drawer-shop-name">—</span>
        </div>
        <div class="drawer-subtotal-row">
          <span>ESTIMATED PREP</span>
          <span id="drawer-prep-time">0 MIN</span>
        </div>
        <div class="drawer-total-row">
          <span>SUBTOTAL</span>
          <span id="drawer-total-price">₹0.00</span>
        </div>
        <a href="/checkout.html" class="btn btn-primary btn-lg" id="checkout-trigger-btn" style="width:100%; text-align:center;">
          PROCEED TO DISPATCH &rarr;
        </a>
      </div>
    </div>
  `;
  document.body.appendChild(drawerRoot);
}

function bindCartEvents() {
  const openBtn = document.getElementById('open-cart-btn');
  const closeBtn = document.getElementById('close-cart-btn');
  const backdrop = document.getElementById('cart-backdrop');
  const drawer = document.getElementById('cart-drawer');

  const openDrawer = () => {
    backdrop?.classList.add('active');
    drawer?.classList.add('active');
  };

  const closeDrawer = () => {
    backdrop?.classList.remove('active');
    drawer?.classList.remove('active');
  };

  openBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  window.openCartDrawer = openDrawer;
  window.closeCartDrawer = closeDrawer;

  // React to cart state updates
  cart.subscribe((state) => {
    updateCartDrawerUI(state);
  });
}

function updateCartDrawerUI(cartState) {
  const countPill = document.getElementById('header-cart-count');
  if (countPill) {
    countPill.textContent = cart.getItemsCount();
  }

  const itemsList = document.getElementById('drawer-items-list');
  const shopNameEl = document.getElementById('drawer-shop-name');
  const prepTimeEl = document.getElementById('drawer-prep-time');
  const totalPriceEl = document.getElementById('drawer-total-price');
  const checkoutBtn = document.getElementById('checkout-trigger-btn');

  if (!itemsList) return;

  if (cartState.items.length === 0) {
    itemsList.innerHTML = `
      <div class="drawer-empty">
        <span style="font-size:1.8rem; opacity:0.4;">[ ∅ ]</span>
        <p>Your order dispatch ticket is empty.</p>
        <a href="/index.html" class="btn btn-secondary btn-sm" onclick="window.closeCartDrawer()">EXPLORE KITCHENS</a>
      </div>
    `;
    if (shopNameEl) shopNameEl.textContent = '—';
    if (prepTimeEl) prepTimeEl.textContent = '0 MIN';
    if (totalPriceEl) totalPriceEl.textContent = '₹0.00';
    if (checkoutBtn) checkoutBtn.classList.add('disabled');
    return;
  }

  if (checkoutBtn) checkoutBtn.classList.remove('disabled');
  if (shopNameEl) shopNameEl.textContent = cartState.shopName || 'Active Kitchen';
  if (prepTimeEl) prepTimeEl.textContent = `${cart.getMaxPrepMinutes()} MIN`;
  if (totalPriceEl) totalPriceEl.textContent = formatPrice(cart.getSubtotal());

  itemsList.innerHTML = cartState.items.map(item => `
    <div class="drawer-item-card">
      <div class="drawer-item-top">
        <div>
          <div class="drawer-item-title">${item.name}</div>
          ${item.variantName ? `<div class="drawer-item-variant">[ ${item.variantName} ]</div>` : ''}
          <div style="margin-top:2px;">
            <span class="dietary-tag ${item.dietaryType}">${item.dietaryType}</span>
          </div>
        </div>
        <div class="mono-meta" style="font-weight:700; color:var(--text-primary); font-size:0.88rem;">
          ${formatPrice(item.price * item.quantity)}
        </div>
      </div>
      <div class="drawer-item-bottom">
        <div class="qty-stepper">
          <button class="qty-btn" onclick="window.cart.updateQuantity('${item.itemId}', ${item.variantId ? `'${item.variantId}'` : 'null'}, -1)">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" ${item.quantity >= 10 ? 'disabled title="Maximum quantity is 10"' : ''} onclick="window.cart.updateQuantity('${item.itemId}', ${item.variantId ? `'${item.variantId}'` : 'null'}, 1)">+</button>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="window.cart.removeItem('${item.itemId}', ${item.variantId ? `'${item.variantId}'` : 'null'})" style="padding:2px 6px; font-size:0.68rem; color:var(--status-danger);">
          REMOVE
        </button>
      </div>
    </div>
  `).join('');
}

function renderFooter() {
  const footerContainer = document.getElementById('global-footer');
  if (!footerContainer) return;

  footerContainer.innerHTML = `
    <footer class="app-footer">
      <div class="app-container">
        <div class="footer-top">
          <div class="footer-col">
            <div class="brand-mark" style="margin-bottom:8px;">
              <span class="brand-symbol">P</span>
              <div class="brand-label">
                <span class="brand-title">PREORDER</span>
                <span class="brand-sub">CULINARY TELEMETRY & LOGISTICS</span>
              </div>
            </div>
            <p class="subheadline" style="font-size:0.86rem; color:var(--text-tertiary); max-width:40ch;">
              Institutional-grade pre-order and kitchen scheduling infrastructure. Direct kitchen telemetry eliminates wait queues and preserves culinary integrity.
            </p>
            <div style="margin-top:8px;">
              <span class="telemetry-badge live">SYSTEM STATUS: ALL LOGISTICS OPERATIONAL</span>
            </div>
          </div>

          <div class="footer-col">
            <div class="footer-col-title">Navigation</div>
            <ul class="footer-nav-list">
              <li><a href="/index.html" class="footer-nav-link">Marketplace</a></li>
              <li><a href="/orders.html" class="footer-nav-link">Order Tracker</a></li>
              <li><a href="/loyalty.html" class="footer-nav-link">Loyalty Vault</a></li>
              <li><a href="/checkout.html" class="footer-nav-link">Active Ticket</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <div class="footer-col-title">Portals</div>
            <ul class="footer-nav-list">
              <li><a href="/owner.html" class="footer-nav-link">Kitchen Partner Desk</a></li>
              <li><a href="/register.html" class="footer-nav-link">Onboard Kitchen</a></li>
              <li><a href="/admin.html" class="footer-nav-link">Verification Console</a></li>
              <li><a href="/profile.html" class="footer-nav-link">Diner Profile</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <div class="footer-col-title">Institutional</div>
            <p style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-tertiary); line-height:1.6;">
              HIGH-CONCURRENCY FASTAPI ENGINE<br>
              POSTGRESQL 16 ENTERPRISE DB<br>
              HAIRLINE ZERO-QUEUE DISPATCH<br>
              ISO 8601 UTC COMPLIANCE
            </p>
          </div>
        </div>

        <div class="footer-bottom">
          <div>&copy; ${new Date().getFullYear()} PREORDER LOGISTICS INC. ALL RIGHTS RESERVED.</div>
          <div style="display:flex; gap:16px;">
            <span>LATENCY: &lt;18MS</span>
            <span>API V1.0.0</span>
            <span>ENCRYPTED TLS</span>
          </div>
        </div>
      </div>
    </footer>
  `;
}

// Auto-boot on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initGlobalShell();
});
