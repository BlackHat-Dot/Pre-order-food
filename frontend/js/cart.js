/* ============================================================================
   PREORDER REACTIVE CART STORE
   Single-Shop Order Assembly Engine
   ============================================================================ */

import { toast } from './toast.js';

const CART_KEY = 'preorder_active_cart';

class CartStore {
  constructor() {
    this.cart = this.load();
    this.listeners = [];
  }

  load() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return { shopId: null, shopName: null, items: [] };
      return JSON.parse(raw);
    } catch {
      return { shopId: null, shopName: null, items: [] };
    }
  }

  save() {
    localStorage.setItem(CART_KEY, JSON.stringify(this.cart));
    this.notify();
  }

  notify() {
    window.dispatchEvent(new CustomEvent('preorder:cart-updated', { detail: this.cart }));
    this.listeners.forEach(fn => fn(this.cart));
  }

  subscribe(listener) {
    this.listeners.push(listener);
    listener(this.cart);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getCart() {
    return this.cart;
  }

  addItem(payload) {
    const { shopId, shopName, itemId, variantId = null, name, variantName = null, price, dietaryType = 'veg', prepMinutes = 15 } = payload;

    // Check if adding from another shop
    if (this.cart.shopId && this.cart.shopId !== shopId && this.cart.items.length > 0) {
      const confirmed = window.confirm(
        `Your cart already contains items from "${this.cart.shopName || 'another kitchen'}". Empty cart and start an order with "${shopName}"?`
      );
      if (!confirmed) return false;
      this.cart = { shopId, shopName, items: [] };
    }

    this.cart.shopId = shopId;
    this.cart.shopName = shopName || this.cart.shopName;

    // Check if item + variant already in cart
    const existingIndex = this.cart.items.findIndex(
      item => item.itemId === itemId && (item.variantId || null) === (variantId || null)
    );

    if (existingIndex > -1) {
      this.cart.items[existingIndex].quantity += 1;
    } else {
      this.cart.items.push({
        itemId,
        variantId,
        name,
        variantName,
        price: Number(price),
        quantity: 1,
        dietaryType,
        prepMinutes: Number(prepMinutes)
      });
    }

    this.save();
    toast.success(`Added ${name} to order ticket`);
    return true;
  }

  updateQuantity(itemId, variantId, delta) {
    const idx = this.cart.items.findIndex(
      item => item.itemId === itemId && (item.variantId || null) === (variantId || null)
    );

    if (idx === -1) return;

    this.cart.items[idx].quantity += delta;
    if (this.cart.items[idx].quantity <= 0) {
      this.cart.items.splice(idx, 1);
    }

    if (this.cart.items.length === 0) {
      this.cart.shopId = null;
      this.cart.shopName = null;
    }

    this.save();
  }

  removeItem(itemId, variantId) {
    this.cart.items = this.cart.items.filter(
      item => !(item.itemId === itemId && (item.variantId || null) === (variantId || null))
    );

    if (this.cart.items.length === 0) {
      this.cart.shopId = null;
      this.cart.shopName = null;
    }

    this.save();
  }

  clear() {
    this.cart = { shopId: null, shopName: null, items: [] };
    this.save();
  }

  getItemsCount() {
    return this.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getSubtotal() {
    return this.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  getMaxPrepMinutes() {
    if (this.cart.items.length === 0) return 0;
    return Math.max(...this.cart.items.map(item => item.prepMinutes || 15));
  }
}

export const cart = new CartStore();
window.cart = cart;
