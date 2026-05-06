import { useEffect, useState } from "react";
import type { MenuItemOut, VariantOut } from "./api";

export interface CartLine {
  shop_id: string;
  item_id: string;
  variant_id: string | null;
  name: string;
  variant_name?: string | null;
  unit_price: number;
  quantity: number;
  notes?: string;
}

const KEY = "pof_cart_v1";

function read(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event("pof_cart"));
}

export const cart = {
  all: read,
  byShop(shop_id: string): CartLine[] {
    return read().filter((l) => l.shop_id === shop_id);
  },
  add(line: CartLine) {
    const lines = read();
    // Enforce single-shop cart
    const filtered = lines[0] && lines[0].shop_id !== line.shop_id ? [] : lines;
    const existing = filtered.find(
      (l) => l.item_id === line.item_id && l.variant_id === line.variant_id,
    );
    if (existing) existing.quantity += line.quantity;
    else filtered.push(line);
    write(filtered);
  },
  setQuantity(item_id: string, variant_id: string | null, quantity: number) {
    const lines = read()
      .map((l) =>
        l.item_id === item_id && l.variant_id === variant_id ? { ...l, quantity } : l,
      )
      .filter((l) => l.quantity > 0);
    write(lines);
  },
  remove(item_id: string, variant_id: string | null) {
    write(read().filter((l) => !(l.item_id === item_id && l.variant_id === variant_id)));
  },
  clear() {
    write([]);
  },
  addItem(item: MenuItemOut, variant: VariantOut | null, quantity = 1) {
    cart.add({
      shop_id: item.shop_id,
      item_id: item.id,
      variant_id: variant?.id ?? null,
      name: item.name,
      variant_name: variant?.name ?? null,
      unit_price: variant?.price ?? item.price,
      quantity,
    });
  },
};

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    // Initialise from localStorage only on the client, after first render,
    // so server and client start with the same empty array (no hydration mismatch).
    setLines(read());
    const handler = () => setLines(read());
    window.addEventListener("pof_cart", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("pof_cart", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  const total = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return { lines, total, count };
}
