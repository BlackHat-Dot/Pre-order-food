import { jsxs, jsx } from "react/jsx-runtime";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Info, Ticket, Check, Copy, Share2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { q as loyaltyApi, s as shopsApi, A as ApiError, a as apiRequest, b as TooltipProvider, c as Tooltip, d as TooltipTrigger, e as TooltipContent, B as Button } from "./router-DQr6eapq.js";
import { C as Card, d as CardContent, a as CardHeader, b as CardTitle } from "./card-BjRrBkxP.js";
import { I as Input } from "./input-B-ZXk5uj.js";
import { L as Label } from "./label-D-IOUQFS.js";
import { f as formatCurrency, b as formatDate } from "./format-BBidFSeC.js";
import "@tanstack/react-router";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-label";
function LoyaltyPage() {
  const qc = useQueryClient();
  const [shopId, setShopId] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState("100");
  const [copiedCode, setCopiedCode] = useState(null);
  const [latestCoupon, setLatestCoupon] = useState(null);
  const {
    data: account
  } = useQuery({
    queryKey: ["loyalty", "me", shopId],
    queryFn: () => loyaltyApi.me(shopId),
    enabled: !!shopId
  });
  const {
    data: txns
  } = useQuery({
    queryKey: ["loyalty", "txns", shopId],
    queryFn: () => loyaltyApi.transactions(shopId),
    enabled: !!shopId
  });
  const {
    data: shop
  } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => shopsApi.get(shopId),
    enabled: !!shopId
  });
  const discountPerPoint = shop?.loyalty_discount_per_point ?? 0.1;
  const currentBalance = account?.points_balance ?? 0;
  const mintCoupon = useMutation({
    mutationFn: async (points) => {
      return await apiRequest("/api/v1/coupons/mint", {
        method: "POST",
        body: {
          shop_id: shopId,
          points
        }
      });
    },
    onSuccess: (data) => {
      toast.success(`Successfully minted voucher: ${data.code}`);
      setLatestCoupon(data);
      setPointsToRedeem("");
      qc.invalidateQueries({
        queryKey: ["loyalty"]
      });
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Something went wrong");
      }
    }
  });
  const handleMintSubmit = (e) => {
    e.preventDefault();
    const pts = parseInt(pointsToRedeem, 10);
    if (isNaN(pts) || pts <= 0) return toast.error("Please provide a valid point value.");
    if (pts > currentBalance) return toast.error("Requested points exceed your available balance.");
    mintCoupon.mutate(pts);
  };
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Coupon code copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2e3);
  };
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl space-y-6", children: [
    /* @__PURE__ */ jsx(Card, { className: "overflow-hidden border-primary/20 shadow-xl", style: {
      background: "var(--gradient-surface)"
    }, children: /* @__PURE__ */ jsxs(CardContent, { className: "flex flex-wrap items-center justify-between gap-4 p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-4 flex-1 min-w-[240px]", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold tracking-wider text-primary/80 uppercase", children: "Shop-Specific Wallet" }),
          /* @__PURE__ */ jsx(Input, { className: "mt-1.5 max-w-xs h-10 rounded-xl bg-background/50 border-primary/20 focus-visible:ring-primary", placeholder: "Paste Shop ID here...", value: shopId, onChange: (e) => {
            setShopId(e.target.value);
            setLatestCoupon(null);
          } })
        ] }),
        shopId && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground font-medium", children: "Available Loyalty Balance" }),
          /* @__PURE__ */ jsxs("p", { className: "mt-0.5 text-4xl font-black text-foreground tracking-tight", children: [
            currentBalance,
            " ",
            /* @__PURE__ */ jsx("span", { className: "text-base font-medium text-muted-foreground", children: "pts" })
          ] }),
          shop && /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-muted-foreground mt-1", children: [
            "Value factor at ",
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: shop.name }),
            ": 1 pt = ",
            formatCurrency(discountPerPoint),
            " discount"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Sparkles, { className: "h-12 w-12 text-primary animate-pulse shrink-0 hidden sm:block" })
    ] }) }),
    shopId && /* @__PURE__ */ jsxs(Card, { className: "border-border/60 shadow-sm rounded-2xl", children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "pb-3 flex flex-row items-center gap-2 space-y-0", children: [
        /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-bold", children: "Generate Shareable Voucher" }),
        /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx("button", { type: "button", className: "text-muted-foreground/60 hover:text-foreground transition-colors outline-none", children: /* @__PURE__ */ jsx(Info, { className: "h-4 w-4" }) }) }),
          /* @__PURE__ */ jsxs(TooltipContent, { className: "max-w-xs p-3 space-y-2 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl", children: [
            /* @__PURE__ */ jsx("p", { className: "text-xs font-bold", children: "💡 How coupons work:" }),
            /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-muted-foreground leading-relaxed", children: [
              "Converting points creates a standalone code voucher worth ",
              /* @__PURE__ */ jsxs("span", { className: "text-primary font-medium", children: [
                formatCurrency(discountPerPoint),
                " per point"
              ] }),
              "."
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-[11px] text-emerald-500 dark:text-emerald-400 font-medium leading-relaxed", children: "⭐️ Coupons are shop-specific but public! You can use them yourself at checkout, or text the generated code to friends and family so they can save on their food." })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("form", { onSubmit: handleMintSubmit, className: "flex flex-wrap items-end gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-[180px] space-y-1.5", children: [
            /* @__PURE__ */ jsxs(Label, { htmlFor: "points", className: "text-xs font-medium text-muted-foreground", children: [
              "Points to burn (Max ",
              currentBalance,
              " pts)"
            ] }),
            /* @__PURE__ */ jsx(Input, { id: "points", type: "number", min: 1, max: currentBalance, value: pointsToRedeem, onChange: (e) => setPointsToRedeem(e.target.value), className: "h-10 rounded-xl focus-visible:ring-primary", disabled: currentBalance === 0 })
          ] }),
          /* @__PURE__ */ jsxs(Button, { type: "submit", disabled: mintCoupon.isPending || !pointsToRedeem || currentBalance === 0, className: "h-10 rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-md shadow-primary/10 transition-all active:scale-95", children: [
            /* @__PURE__ */ jsx(Ticket, { className: "h-3.5 w-3.5" }),
            mintCoupon.isPending ? "Generating..." : "Convert to Coupon"
          ] })
        ] }),
        latestCoupon && /* @__PURE__ */ jsxs("div", { className: "mt-2 border border-dashed border-emerald-500/30 bg-emerald-500/5 p-4 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400", children: "Coupon Created Successfully" }),
              /* @__PURE__ */ jsxs("p", { className: "text-lg font-black text-foreground", children: [
                formatCurrency(latestCoupon.discount_value),
                " Total Discount"
              ] })
            ] }),
            /* @__PURE__ */ jsx(Ticket, { className: "h-5 w-5 text-emerald-500 animate-pulse" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 bg-background border border-border p-2.5 rounded-xl justify-between shadow-sm", children: [
            /* @__PURE__ */ jsx("code", { className: "font-mono text-sm font-bold select-all tracking-wider text-primary px-1", children: latestCoupon.code }),
            /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-8 w-8 rounded-lg hover:bg-muted", onClick: () => handleCopyCode(latestCoupon.code), children: copiedCode === latestCoupon.code ? /* @__PURE__ */ jsx(Check, { className: "h-4 w-4 text-emerald-500" }) : /* @__PURE__ */ jsx(Copy, { className: "h-4 w-4" }) })
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(Share2, { className: "h-3 w-3 text-primary" }),
            " Pass this code to a friend! Anyone who inputs it at checkout will get the discount applied instantly."
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "border-border/60 shadow-sm rounded-2xl", children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "pb-3 flex flex-row items-center gap-2 space-y-0", children: [
        /* @__PURE__ */ jsx(Receipt, { className: "h-4 w-4 text-muted-foreground" }),
        /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-bold", children: "Ledger Transactions" })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { className: "space-y-2", children: !shopId ? /* @__PURE__ */ jsx("p", { className: "py-8 text-center text-xs text-muted-foreground font-medium", children: "Please enter a valid Shop ID above to unlock historical account transaction histories." }) : !txns || txns.length === 0 ? /* @__PURE__ */ jsx("p", { className: "py-8 text-center text-xs text-muted-foreground font-medium", children: "No transactions found for this vendor account." }) : txns.map((t) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-border/40 py-2.5 text-sm last:border-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-0.5", children: [
          /* @__PURE__ */ jsx("p", { className: "font-semibold text-xs capitalize text-foreground", children: t.action }),
          /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground", children: [
            t.order_id ? `Order #${t.order_id.slice(0, 8)}` : "Coupon Mint Point Conversion",
            " · ",
            formatDate(t.created_at)
          ] })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: `text-xs font-bold ${t.points >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`, children: [
          t.points >= 0 ? "+" : "",
          t.points,
          " pts"
        ] })
      ] }, t.id)) })
    ] })
  ] });
}
export {
  LoyaltyPage as component
};
