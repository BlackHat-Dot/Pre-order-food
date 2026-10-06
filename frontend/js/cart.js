/**
 * PreOrder Shopping Cart Manager
 * Compatible with order-delight-main cart schema (pof_cart_v1)
 */

const KEY = "pof_cart_v1";
const LEGACY_KEY = "preorder_cart";

function readCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((item) => ({
      shop_id: item.shop_id,
      item_id: item.item_id,
      variant_id: item.variant_id ?? null,
      name: item.name,
      variant_name: item.variant_name ?? null,
      unit_price: parseFloat(item.unit_price ?? item.price ?? 0),
      price: parseFloat(item.unit_price ?? item.price ?? 0),
      quantity: parseInt(item.quantity ?? 1, 10),
      image_url: item.image_url ?? null,
      notes: item.notes ?? "",
    }));
  } catch {
    return [];
  }
}

function writeCart(lines) {
  const normalized = lines.map((l) => ({
    ...l,
    price: l.unit_price,
  }));
  localStorage.setItem(KEY, JSON.stringify(normalized));
  localStorage.setItem(LEGACY_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("pof_cart", { detail: { lines: normalized } }));
  window.dispatchEvent(new CustomEvent("cart-updated", { detail: { items: normalized } }));
}

const Cart = {
  all: readCart,
  getItems: readCart,

  getShopId() {
    const lines = readCart();
    return lines.length > 0 ? lines[0].shop_id : null;
  },

  byShop(shopId) {
    return readCart().filter((l) => l.shop_id === shopId);
  },

  add(line, forceClearConflict = false) {
    const lines = readCart();
    if (lines.length > 0 && lines[0].shop_id !== line.shop_id) {
      if (!forceClearConflict) {
        window.dispatchEvent(new CustomEvent("pof_cart_conflict", { detail: { pendingLine: line } }));
        return { conflict: true, currentShopId: lines[0].shop_id };
      }
    }

    const filtered = lines[0] && lines[0].shop_id !== line.shop_id ? [] : lines;
    const existing = filtered.find(
      (l) => l.item_id === line.item_id && l.variant_id === line.variant_id
    );

    if (existing) {
      existing.quantity += line.quantity;
    } else {
      filtered.push({
        shop_id: line.shop_id,
        item_id: line.item_id,
        variant_id: line.variant_id ?? null,
        name: line.name,
        variant_name: line.variant_name ?? null,
        unit_price: parseFloat(line.unit_price ?? line.price ?? 0),
        price: parseFloat(line.unit_price ?? line.price ?? 0),
        quantity: line.quantity,
        image_url: line.image_url ?? null,
        notes: line.notes ?? "",
      });
    }

    writeCart(filtered);
    return { conflict: false };
  },

  addItem(item, variant = null, quantity = 1, forceClearConflict = false) {
    const shopId = item.shop_id;
    const unitPrice = variant ? parseFloat(variant.price) : parseFloat(item.price);
    const line = {
      shop_id: shopId,
      item_id: item.id,
      variant_id: variant?.id ?? null,
      name: item.name,
      variant_name: variant?.name ?? null,
      unit_price: unitPrice,
      price: unitPrice,
      quantity,
      image_url: item.image_url ?? null,
    };
    return this.add(line, forceClearConflict);
  },

  setQuantity(itemId, variantId, quantity) {
    const lines = readCart()
      .map((l) => (l.item_id === itemId && (l.variant_id ?? null) === (variantId ?? null) ? { ...l, quantity } : l))
      .filter((l) => l.quantity > 0);
    writeCart(lines);
  },

  updateQuantity(itemId, variantId, qty) {
    this.setQuantity(itemId, variantId, qty);
  },

  remove(itemId, variantId = null) {
    const lines = readCart().filter(
      (l) => !(l.item_id === itemId && (l.variant_id ?? null) === (variantId ?? null))
    );
    writeCart(lines);
  },

  removeItem(itemId, variantId = null) {
    this.remove(itemId, variantId);
  },

  clear() {
    writeCart([]);
  },

  getCount() {
    return readCart().reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal() {
    return readCart().reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  },

  getTotal() {
    return this.getSubtotal();
  },
};

window.cart = Cart;
