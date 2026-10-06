/**
 * PreOrder Application Shared Utilities, Toasts, and Exact Navbar
 */

function formatCurrency(val) {
  const num = parseFloat(val || 0);
  return `₹${num.toFixed(2)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function showToast(type, message, description = "") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  const isSuccess = type === "success";
  const isWarning = type === "warning";
  const isError = type === "error";

  let iconSvg = "";
  let borderClass = "border-border/80";
  let iconClass = "text-primary";

  if (isSuccess) {
    borderClass = "border-emerald-500/30";
    iconClass = "text-emerald-500";
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 ${iconClass}"><path d="M20 6 9 17l-5-5"/></svg>`;
  } else if (isWarning) {
    borderClass = "border-amber-500/30";
    iconClass = "text-amber-500";
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 ${iconClass}"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  } else {
    borderClass = "border-rose-500/30";
    iconClass = "text-rose-500";
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 ${iconClass}"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  }

  toast.className = `pointer-events-auto flex items-start gap-3 rounded-xl border ${borderClass} bg-card/95 p-4 text-card-foreground shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2 duration-200 transition-all text-left`;
  toast.innerHTML = `
    <div class="mt-0.5 shrink-0">${iconSvg}</div>
    <div class="flex-1 space-y-0.5">
      <p class="text-xs font-semibold text-foreground">${message}</p>
      ${description ? `<p class="text-[11px] text-muted-foreground leading-normal">${description}</p>` : ""}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-x-4");
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Global toast object matching sonner: toast.success, toast.error, toast.warning
window.toast = {
  success: (msg, opts = {}) => showToast("success", msg, opts.description || ""),
  error: (msg, opts = {}) => showToast("error", msg, opts.description || ""),
  warning: (msg, opts = {}) => showToast("warning", msg, opts.description || ""),
  info: (msg, opts = {}) => showToast("info", msg, opts.description || ""),
};

function initNavbar() {
  const root = document.getElementById("navbar-root");
  if (!root) return;

  const user = window.auth ? window.auth.getUser() : null;
  const count = window.cart ? window.cart.getCount() : 0;

  let rightNav = "";
  if (user) {
    const firstName = (user.name || "User").split(" ")[0];
    const roleLanding = window.auth.getLandingPage(user.role);
    rightNav = `
      <div class="relative" id="user-menu-wrapper">
        <button id="user-menu-btn" type="button" class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2 rounded-xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>${firstName}</span>
        </button>
        <div id="user-menu-dropdown" class="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border/80 bg-popover/95 p-1 shadow-xl backdrop-blur-xl z-50 hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div class="px-2 py-1.5 text-xs text-muted-foreground truncate border-b border-border/60 font-medium">
            ${user.email || user.phone}
          </div>
          <div class="p-1 space-y-0.5">
            <a href="${roleLanding}" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              <span>Dashboard</span>
            </a>
            <a href="profile.html" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>Profile</span>
            </a>
            ${user.role === "customer" ? `
            <a href="loyalty.html" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 text-primary"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              <span>Loyalty Wallet</span>
            </a>
            ` : ""}
            <div class="h-px bg-border/60 my-1"></div>
            <button onclick="window.auth.logout()" class="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-left">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    `;
  } else {
    rightNav = `
      <a href="login.html">
        <button class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 rounded-xl">Sign in</button>
      </a>
      <a href="register.html">
        <button class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 rounded-xl">Get started</button>
      </a>
    `;
  }

  root.innerHTML = `
    <header class="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="index.html" class="flex items-center gap-2 font-semibold tracking-tight hover:opacity-90 transition-opacity">
          <span class="grid h-8 w-8 place-items-center rounded-lg text-primary-foreground" style="background: var(--gradient-primary);">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="m14 2 4 4"/><path d="M18 10v12"/><path d="M6 2v20"/><path d="M9 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/></svg>
          </span>
          <span class="text-lg">PreOrder</span>
        </a>

        <nav class="flex items-center gap-2">
          <a href="cart.html">
            <button class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span>Cart</span>
              <span id="nav-cart-badge" class="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground animate-in zoom-in duration-200" style="${count > 0 ? '' : 'display: none;'}">${count}</span>
            </button>
          </a>
          ${rightNav}
        </nav>
      </div>
    </header>
  `;

  const btn = document.getElementById("user-menu-btn");
  const dd = document.getElementById("user-menu-dropdown");
  if (btn && dd) {
    btn.onclick = (e) => {
      e.stopPropagation();
      dd.classList.toggle("hidden");
    };
    document.addEventListener("click", () => dd.classList.add("hidden"));
  }
}

// Sync cart badge automatically on cart events
window.addEventListener("cart-updated", () => {
  const badge = document.getElementById("nav-cart-badge");
  if (badge && window.cart) {
    const count = window.cart.getCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
});
window.addEventListener("pof_cart", () => {
  const badge = document.getElementById("nav-cart-badge");
  if (badge && window.cart) {
    const count = window.cart.getCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
});

document.addEventListener("DOMContentLoaded", initNavbar);
