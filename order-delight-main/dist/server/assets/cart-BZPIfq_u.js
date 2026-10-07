import { jsxs, jsx } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { ChevronLeft, ShoppingBag, Store, AlertTriangle, Trash2 } from "lucide-react";
import { P as PublicNav } from "./PublicNav-Ce66gdj8.js";
import { u as useCart, c as cart } from "./dropdown-menu-CRgp8eCB.js";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { u as useAuth, s as shopsApi, B as Button } from "./router-DQr6eapq.js";
import { f as formatCurrency } from "./format-BBidFSeC.js";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import "./nav-CWlJKvXT.js";
import "react";
import "@radix-ui/react-popover";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
function CartPage() {
  const {
    lines,
    total,
    count
  } = useCart();
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const isShopOwner = user?.role === "shop_owner";
  const currentShopId = lines[0]?.shop_id;
  const {
    data: shop
  } = useQuery({
    queryKey: ["shop", currentShopId],
    queryFn: () => shopsApi.get(currentShopId),
    enabled: !!currentShopId
  });
  const currentTotalQuantity = lines.reduce((acc, item) => acc + item.quantity, 0);
  const handleIncrement = (itemId, variantId, currentQty) => {
    if (currentTotalQuantity >= 10) {
      toast.warning("Cart Limit Reached: You can only place a maximum of 10 items per single order ticket.");
      return;
    }
    cart.setQuantity(itemId, variantId ?? null, currentQty + 1);
  };
  const handleDecrement = (itemId, variantId, currentQty) => {
    cart.setQuantity(itemId, variantId ?? null, Math.max(1, currentQty - 1));
  };
  function checkout() {
    if (!user) {
      navigate({
        to: "/login"
      });
      return;
    }
    if (isShopOwner) return;
    navigate({
      to: "/checkout"
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx(PublicNav, {}),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl px-4 py-8 sm:px-6", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground", children: [
        /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }),
        "Continue shopping"
      ] }),
      /* @__PURE__ */ jsx("h1", { className: "mb-6 text-2xl font-bold tracking-tight", children: "Your cart" }),
      count === 0 ? /* @__PURE__ */ jsx(Card, { className: "border-dashed", children: /* @__PURE__ */ jsxs(CardContent, { className: "flex flex-col items-center justify-center py-16 text-center", children: [
        /* @__PURE__ */ jsx(ShoppingBag, { className: "mb-3 h-10 w-10 text-muted-foreground" }),
        /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "Your cart is empty." }),
        /* @__PURE__ */ jsx(Link, { to: "/", className: "mt-4", children: /* @__PURE__ */ jsx(Button, { children: "Browse shops" }) })
      ] }) }) : /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        shop && /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-4 animate-in fade-in duration-200", children: [
          /* @__PURE__ */ jsx("div", { className: "shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary", children: /* @__PURE__ */ jsx(Store, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-0.5 text-left", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold uppercase tracking-wider text-muted-foreground", children: "Items Selected From" }),
            /* @__PURE__ */ jsx("h2", { className: "text-sm font-bold tracking-tight text-foreground", children: shop.name })
          ] })
        ] }),
        isShopOwner && /* @__PURE__ */ jsxs("div", { className: "my-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left shadow-sm animate-in zoom-in-95 duration-200", children: [
          /* @__PURE__ */ jsx(AlertTriangle, { className: "mt-0.5 h-5 w-5 shrink-0 text-amber-500" }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("h4", { className: "text-sm font-bold text-foreground", children: "Action Restricted for Shop Owners" }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs leading-relaxed text-muted-foreground", children: [
              "You are currently authenticated via a",
              " ",
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: "Shop Owner Account" }),
              ". To protect merchant balances, store managers cannot submit checkout orders. Please sign out and create a dedicated",
              " ",
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-amber-500", children: "Customer Account" }),
              " ",
              "to complete your purchase."
            ] })
          ] })
        ] }),
        lines.map((l) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "flex items-center gap-3 p-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex-1 text-left", children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-foreground", children: l.name }),
            l.variant_name && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: l.variant_name }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
              formatCurrency(l.unit_price),
              " each"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: () => handleDecrement(l.item_id, l.variant_id, l.quantity), children: "−" }),
            /* @__PURE__ */ jsx("span", { className: "w-6 text-center text-sm font-semibold", children: l.quantity }),
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: () => handleIncrement(l.item_id, l.variant_id, l.quantity), children: "+" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "w-20 text-right text-sm font-semibold text-foreground", children: formatCurrency(l.unit_price * l.quantity) }),
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", onClick: () => cart.remove(l.item_id, l.variant_id ?? null), children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4 text-muted-foreground transition-colors hover:text-destructive" }) })
        ] }) }, `${l.item_id}-${l.variant_id ?? "_"}`)),
        /* @__PURE__ */ jsx(Card, { className: "mt-6", children: /* @__PURE__ */ jsxs(CardContent, { className: "space-y-3 p-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Subtotal" }),
            /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatCurrency(total) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-base font-bold", children: [
            /* @__PURE__ */ jsx("span", { children: "Total" }),
            /* @__PURE__ */ jsx("span", { className: "text-foreground", children: formatCurrency(total) })
          ] }),
          /* @__PURE__ */ jsx(Button, { className: "h-11 w-full rounded-xl text-xs font-bold", size: "lg", onClick: checkout, disabled: isShopOwner, children: isShopOwner ? "Checkout Disabled for Shop Owners" : user ? "Proceed to checkout" : "Sign in to checkout" })
        ] }) })
      ] })
    ] })
  ] });
}
export {
  CartPage as component
};
