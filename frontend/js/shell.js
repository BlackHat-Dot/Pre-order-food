import { auth } from './auth.js';
import { cart } from './cart.js';
import { toast } from './toast.js';
import { api } from './api.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const formatPrice = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const formatDate = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export function handleRunKitchen(e) {
  if (e) e.preventDefault();
  if (!auth.isLoggedIn()) {
    window.location.href = '/register.html?role=shop_owner';
    return;
  }
  const role = auth.getRole();
  if (role === 'shop_owner') {
    window.location.href = '/owner.html';
    return;
  }
  toast.info('User accounts cannot run a kitchen. If you want to run a kitchen, please create another account with the Kitchen Owner role.');
}
window.handleRunKitchen = handleRunKitchen;

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-run-kitchen], a[href*="role=shop_owner"], [data-kitchen-desk]');
  if (target) {
    if (target.matches('[data-kitchen-desk]') && !auth.isLoggedIn()) {
      e.preventDefault();
      window.location.href = '/login.html?redirect=' + encodeURIComponent('/owner.html');
      return;
    }
    handleRunKitchen(e);
  }
});

let notifs = [];
let notifTimer = null;

async function initNotifications() {
  if (!auth.isLoggedIn()) return;
  const btn = document.getElementById('notif-btn');
  const menu = document.getElementById('notif-menu');
  const readAll = document.getElementById('notif-read-all');
  if (!btn || !menu) return;

  async function refresh() {
    try {
      notifs = await api.getNotifications() || [];
      renderNotifs();
    } catch {}
  }

  function renderNotifs() {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notif-list');
    if (!badge || !list) return;

    const unread = notifs.filter(n => !n.is_read).length;
    if (unread > 0) {
      badge.style.display = 'inline-grid';
      badge.textContent = unread > 9 ? '9+' : unread;
    } else {
      badge.style.display = 'none';
    }

    if (!notifs.length) {
      list.innerHTML = `<div class="empty" style="padding:28px 16px;text-align:center;font-size:.85rem">No notifications yet.</div>`;
      return;
    }

    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${esc(n.id)}">
        <div class="notif-item-title">
          ${n.is_read ? '' : '<span class="notif-dot"></span>'}
          <span>${esc(n.title || 'Notification')}</span>
        </div>
        <div class="notif-item-msg">${esc(n.message || '')}</div>
        <div class="notif-item-time">${formatDate(n.created_at)}</div>
      </div>
    `).join('');
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = menu.hidden;
    menu.hidden = !isHidden;
    if (isHidden) {
      refresh();
    }
  });

  menu.addEventListener('click', async (e) => {
    e.stopPropagation();
    const item = e.target.closest('.notif-item');
    if (!item) return;
    const id = item.dataset.id;
    const n = notifs.find(x => x.id === id);
    if (n && !n.is_read) {
      try {
        await api.markNotificationRead(id);
        n.is_read = true;
        renderNotifs();
      } catch {}
    }
  });

  readAll?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await api.markAllNotificationsRead();
      notifs.forEach(n => n.is_read = true);
      renderNotifs();
    } catch {}
  });

  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      menu.hidden = true;
    }
  });

  refresh();
  clearInterval(notifTimer);
  notifTimer = setInterval(refresh, 25000);
}

function header() {
  const el = document.getElementById('site-header');
  if (!el) return;
  const path = location.pathname;
  const link = (href, label, key) => `<a href="${href}" ${path.includes(key) ? 'aria-current="page"' : ''}>${label}</a>`;
  const user = auth.getUser();
  el.className = 'site-header';
  el.innerHTML = `
    <div class="wrap">
      <a class="mark" href="/index.html"><i></i>preorder</a>
      <nav class="nav" aria-label="Main">
        ${link('/index.html', 'Kitchens', 'index')}
        ${auth.isLoggedIn() ? link('/orders.html', 'Orders', 'orders') + link('/loyalty.html', 'Rewards', 'loyalty') : ''}
        ${auth.isOwner() ? link('/owner.html', 'Kitchen desk', 'owner') : ''}
        ${auth.isAdmin() ? link('/admin.html', 'Admin', 'admin') : ''}
      </nav>
      <div class="head-end">
        ${auth.isLoggedIn()
          ? `
            <div class="notif-wrap">
              <button class="btn quiet sm notif-btn" id="notif-btn" aria-label="Notifications" title="Notifications" style="position:relative;padding:7px 10px;line-height:1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span class="count notif-badge" id="notif-badge" style="display:none;position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;font-size:0.7rem;padding:0 4px">0</span>
              </button>
              <div class="notif-menu" id="notif-menu" hidden>
                <div class="notif-head">
                  <strong>Notifications</strong>
                  <button class="btn quiet sm" id="notif-read-all" style="padding:2px 6px;font-size:0.75rem">Mark all read</button>
                </div>
                <div class="notif-list" id="notif-list">
                  <div class="empty" style="padding:24px 16px;text-align:center;font-size:.85rem">Loading…</div>
                </div>
              </div>
            </div>
            <a class="who" href="/profile.html">${esc((user?.name || 'Account').split(' ')[0])}</a>
            <button class="btn quiet sm" id="logout">Log out</button>
          `
          : `<a class="btn quiet sm" href="/login.html">Log in</a>`}
        <button class="btn sm" id="open-cart" aria-label="Open order">Order <span class="count" id="cart-count">0</span></button>
      </div>
    </div>`;
  document.getElementById('logout')?.addEventListener('click', () => auth.logout());
  initNotifications();
}

function footer() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  el.className = 'site-footer';
  el.innerHTML = `<div class="wrap">
    <span>preorder — order ahead, collect hot.</span>
    <nav>
      <a href="/register.html?role=shop_owner" data-run-kitchen>Run a kitchen</a>
      ${auth.isLoggedIn()
        ? `<button class="btn quiet sm" id="footer-logout" style="color:inherit;padding:0;font-size:inherit;text-decoration:underline;background:none;border:none;cursor:pointer;font-family:inherit">Log out</button>`
        : `<a href="/login.html">Log in</a>`}
      <a href="/orders.html">Your orders</a>
    </nav>
  </div>`;
  document.getElementById('footer-logout')?.addEventListener('click', () => auth.logout());
}

function drawer() {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="scrim" id="scrim"></div>
    <aside class="drawer" id="drawer" role="dialog" aria-label="Your order" aria-hidden="true">
      <header><div><div class="small faint" id="d-shop">No kitchen yet</div><h2 class="h3">Your order</h2></div><button class="btn quiet sm" id="d-close" aria-label="Close">Close</button></header>
      <div class="body" id="d-items"></div>
      <footer>
        <div class="small muted" id="d-prep"></div>
        <div class="totals"><span>Subtotal</span><span class="num" id="d-total">₹0</span></div>
        <a class="btn accent lg" id="d-go" href="/checkout.html">Choose arrival &amp; pay</a>
      </footer>
    </aside>`;
  document.body.append(root);
  const open = () => { scrim.classList.add('on'); d.classList.add('on'); d.setAttribute('aria-hidden', 'false'); };
  const close = () => { scrim.classList.remove('on'); d.classList.remove('on'); d.setAttribute('aria-hidden', 'true'); };
  const d = document.getElementById('drawer'), scrim = document.getElementById('scrim');
  document.getElementById('open-cart')?.addEventListener('click', open);
  document.getElementById('d-close').addEventListener('click', close);
  scrim.addEventListener('click', close);
  addEventListener('keydown', e => e.key === 'Escape' && close());
  window.openCartDrawer = open;

  document.getElementById('d-items').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const { item, variant, act } = b.dataset;
    const v = variant || null;
    if (act === 'remove') cart.removeItem(item, v);
    else cart.updateQuantity(item, v, act === 'inc' ? 1 : -1);
  });

  cart.subscribe((s) => {
    const n = cart.getItemsCount();
    const pill = document.getElementById('cart-count'); if (pill) pill.textContent = n;
    document.getElementById('d-shop').textContent = s.shopName || 'No kitchen yet';
    document.getElementById('d-total').textContent = formatPrice(cart.getSubtotal());
    document.getElementById('d-prep').textContent = n ? `Longest dish takes about ${cart.getMaxPrepMinutes()} min to cook.` : '';
    document.getElementById('d-go').classList.toggle('disabled', !n);
    document.getElementById('d-items').innerHTML = n ? s.items.map(i => `
      <div class="line-item">
        <div><strong>${esc(i.name)}</strong>${i.variantName ? `<div class="small muted">${esc(i.variantName)}</div>` : ''}</div>
        <div class="num">${formatPrice(i.price * i.quantity)}</div>
        <div class="step"><button data-act="dec" data-item="${esc(i.itemId)}" data-variant="${esc(i.variantId || '')}" aria-label="One less">−</button><span>${i.quantity}</span><button data-act="inc" data-item="${esc(i.itemId)}" data-variant="${esc(i.variantId || '')}" ${i.quantity >= 10 ? 'disabled title="Maximum quantity is 10"' : ''} aria-label="One more">+</button></div>
        <button class="btn quiet sm" style="justify-self:end" data-act="remove" data-item="${esc(i.itemId)}" data-variant="${esc(i.variantId || '')}">Remove</button>
      </div>`).join('')
      : `<p class="empty">Nothing here yet. Pick a kitchen and add a dish.</p>`;
  });
}

export function boot() { header(); footer(); drawer(); }
boot();
