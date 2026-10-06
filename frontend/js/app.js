/**
 * PreOrder Application Utilities, Toasts, and Navbar Renderer
 */

function formatCurrency(val) {
  const num = parseFloat(val || 0);
  return `₹${num.toFixed(2)}`;
}

function showToast(type, message) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span style="font-size: 1.1rem;">${type === "success" ? "✓" : "⚠"}</span>
    <span style="flex: 1;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.3s, transform 0.3s";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function renderStatusBadge(status) {
  const normalized = (status || "").toLowerCase();
  switch (normalized) {
    case "placed":
      return `<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3);">● Placed</span>`;
    case "accepted":
      return `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);">● Accepted</span>`;
    case "preparing":
      return `<span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3);">⚡ Preparing</span>`;
    case "ready":
      return `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">✓ Ready</span>`;
    case "completed":
      return `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">✓ Completed</span>`;
    case "cancelled":
      return `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);">✕ Cancelled</span>`;
    default:
      return `<span class="badge" style="background: rgba(255, 255, 255, 0.1); color: #fff;">${status}</span>`;
  }
}

function initNavbar() {
  const root = document.getElementById("navbar-root");
  if (!root) return;

  const user = window.auth.getUser();
  const count = window.cart.getCount();

  let userNavHtml = "";
  if (user) {
    const roleLink = window.auth.getLandingPage(user.role);
    const firstName = (user.name || "User").split(" ")[0];
    userNavHtml = `
      <div style="position: relative;" id="user-menu-wrapper">
        <button id="user-menu-btn" class="btn btn-outline btn-sm" style="border-radius: var(--radius);">
          <span>👤 ${firstName}</span>
          <span style="font-size: 0.65rem;">▼</span>
        </button>
        <div id="user-menu-dropdown" style="display: none; position: absolute; right: 0; top: 120%; min-width: 180px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.35rem; box-shadow: var(--shadow-lg); z-index: 100;">
          <div style="font-size: 0.75rem; color: var(--muted-foreground); padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border); overflow: hidden; text-overflow: ellipsis;">
            ${user.email}
          </div>
          <a href="${roleLink}" class="btn btn-ghost btn-sm" style="width: 100%; justify-content: flex-start;">Dashboard</a>
          <a href="profile.html" class="btn btn-ghost btn-sm" style="width: 100%; justify-content: flex-start;">Profile</a>
          <a href="loyalty.html" class="btn btn-ghost btn-sm" style="width: 100%; justify-content: flex-start;">Loyalty Points</a>
          <button onclick="window.auth.logout()" class="btn btn-ghost btn-sm" style="width: 100%; justify-content: flex-start; color: var(--destructive); margin-top: 0.25rem;">Log out</button>
        </div>
      </div>
    `;
  } else {
    userNavHtml = `
      <a href="login.html" class="btn btn-ghost btn-sm">Sign in</a>
      <a href="register.html" class="btn btn-primary btn-sm">Get started</a>
    `;
  }

  root.innerHTML = `
    <header class="navbar">
      <div class="container">
        <a href="index.html" class="brand-logo">
          <span class="brand-icon">🍴</span>
          <span>PreOrder</span>
        </a>
        <div class="nav-actions">
          <a href="cart.html" class="btn btn-ghost btn-sm" style="gap: 0.5rem;">
            <span>🛍️ Cart</span>
            <span id="nav-cart-badge" class="cart-pill" style="${count > 0 ? '' : 'display: none;'}">${count}</span>
          </a>
          ${userNavHtml}
        </div>
      </div>
    </header>
  `;

  // Toggle user dropdown
  const menuBtn = document.getElementById("user-menu-btn");
  const menuDropdown = document.getElementById("user-menu-dropdown");
  if (menuBtn && menuDropdown) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menuDropdown.style.display = menuDropdown.style.display === "block" ? "none" : "block";
    });
    document.addEventListener("click", () => {
      menuDropdown.style.display = "none";
    });
  }
}

// Update cart badge when items change
window.addEventListener("cart-updated", () => {
  const badge = document.getElementById("nav-cart-badge");
  if (badge) {
    const count = window.cart.getCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
});

document.addEventListener("DOMContentLoaded", initNavbar);
