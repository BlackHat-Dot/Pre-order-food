import * as React from "react";
import { useState, useEffect } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronRight, Check, Circle } from "lucide-react";
import { k as cn } from "./router-DQr6eapq.js";
const KEY = "pof_cart_v1";
function read() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function write(lines) {
  localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event("pof_cart"));
}
const cart = {
  all: read,
  byShop(shop_id) {
    return read().filter((l) => l.shop_id === shop_id);
  },
  // Core modification to prevent silent erasure
  add(line, forceClearConflict = false) {
    const lines = read();
    if (lines.length > 0 && lines[0].shop_id !== line.shop_id) {
      if (!forceClearConflict) {
        const event = new CustomEvent("pof_cart_conflict", { detail: { pendingLine: line } });
        window.dispatchEvent(event);
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
      filtered.push(line);
    }
    write(filtered);
    return { conflict: false };
  },
  setQuantity(item_id, variant_id, quantity) {
    const lines = read().map(
      (l) => l.item_id === item_id && l.variant_id === variant_id ? { ...l, quantity } : l
    ).filter((l) => l.quantity > 0);
    write(lines);
  },
  remove(item_id, variant_id) {
    write(read().filter((l) => !(l.item_id === item_id && l.variant_id === variant_id)));
  },
  clear() {
    write([]);
  },
  addItem(item, variant, quantity = 1, forceClearConflict = false) {
    return cart.add({
      shop_id: item.shop_id,
      item_id: item.id,
      variant_id: variant?.id ?? null,
      name: item.name,
      variant_name: variant?.name ?? null,
      unit_price: variant?.price ?? item.price,
      quantity
    }, forceClearConflict);
  }
};
function useCart() {
  const [lines, setLines] = useState([]);
  useEffect(() => {
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
  const currentShopId = lines.length > 0 ? lines[0].shop_id : null;
  return { lines, total, count, currentShopId };
}
const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.SubTrigger,
  {
    ref,
    className: cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsx(ChevronRight, { className: "ml-auto" })
    ]
  }
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;
const DropdownMenuSubContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.SubContent,
  {
    ref,
    className: cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)",
      className
    ),
    ...props
  }
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;
const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(DropdownMenuPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Content,
  {
    ref,
    sideOffset,
    className: cn(
      "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
const DropdownMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Item,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className
    ),
    ...props
  }
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;
const DropdownMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.CheckboxItem,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    checked,
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(DropdownMenuPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) }) }),
      children
    ]
  }
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;
const DropdownMenuRadioItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.RadioItem,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(DropdownMenuPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Circle, { className: "h-2 w-2 fill-current" }) }) }),
      children
    ]
  }
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;
const DropdownMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Label,
  {
    ref,
    className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className),
    ...props
  }
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;
const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Separator,
  {
    ref,
    className: cn("-mx-1 my-1 h-px bg-muted", className),
    ...props
  }
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;
export {
  DropdownMenu as D,
  DropdownMenuTrigger as a,
  DropdownMenuContent as b,
  cart as c,
  DropdownMenuLabel as d,
  DropdownMenuSeparator as e,
  DropdownMenuItem as f,
  useCart as u
};
