/**
 * PreOrder Shopping Cart Manager
 */

const Cart = {
  KEY: "preorder_cart",

  getItems() {
    try {
      const data = localStorage.getItem(this.KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveItems(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("cart-updated", { detail: { items } }));
  },

  getShopId() {
    const items = this.getItems();
    return items.length > 0 ? items[0].shop_id : null;
  },

  addItem(shopId, shopName, item, variant = null, quantity = 1) {
    const items = this.getItems();
    const currentShopId = this.getShopId();

    // Check multi-shop conflict
    if (currentShopId && currentShopId !== shopId) {
      if (confirm(`Your cart already contains items from another shop. Do you want to clear your cart and start a new order from ${shopName}?`)) {
        this.clear();
      } else {
        return false;
      }
    }

    const price = variant ? parseFloat(variant.price) : parseFloat(item.price);
    const variantId = variant ? variant.id : null;
    const variantName = variant ? variant.name : null;

    const existingIndex = items.findIndex(
      (l) => l.item_id === item.id && l.variant_id === variantId
    );

    if (existingIndex >= 0) {
      items[existingIndex].quantity += quantity;
    } else {
      items.push({
        shop_id: shopId,
        shop_name: shopName,
        item_id: item.id,
        variant_id: variantId,
        name: item.name,
        variant_name: variantName,
        price: price,
        quantity: quantity,
        image_url: item.image_url,
      });
    }

    this.saveItems(items);
    return true;
  },

  updateQuantity(itemId, variantId, qty) {
    let items = this.getItems();
    if (qty <= 0) {
      items = items.filter((l) => !(l.item_id === itemId && l.variant_id === variantId));
    } else {
      const line = items.find((l) => l.item_id === itemId && l.variant_id === variantId);
      if (line) line.quantity = qty;
    }
    this.saveItems(items);
  },

  removeItem(itemId, variantId) {
    const items = this.getItems().filter(
      (l) => !(l.item_id === itemId && l.variant_id === variantId)
    );
    this.saveItems(items);
  },

  clear() {
    this.saveItems([]);
  },

  getCount() {
    return this.getItems().reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal() {
    return this.getItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
};

window.cart = Cart;
