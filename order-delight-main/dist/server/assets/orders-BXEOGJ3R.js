import { jsxs, jsx } from "react/jsx-runtime";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { a as apiRequest, A as ApiError, B as Button } from "./router-DQr6eapq.js";
import { toast } from "sonner";
import { Utensils, Bike, Tag, Eye, X, Percent, Coins, MapPin, Trash2 } from "lucide-react";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { T as Tabs, a as TabsList, b as TabsTrigger } from "./tabs-CoISGPZI.js";
import { S as Skeleton } from "./skeleton-B35717OU.js";
import { B as Badge } from "./badge-sM2V1NmW.js";
import { b as formatDate, f as formatCurrency } from "./format-BBidFSeC.js";
import "@tanstack/react-router";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-tabs";
const STATUS_COLORS = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  accepted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  preparing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  ready: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  cancel_requested: "bg-rose-500/10 text-rose-600 border-rose-500/20 font-medium animate-pulse",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-600 border-rose-500/20"
};
const STATUS_PRIORITY = {
  ready: 1,
  preparing: 2,
  accepted: 3,
  pending: 4,
  cancel_requested: 5,
  completed: 6,
  cancelled: 7
};
function AdminGlobalOrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const {
    data: orders = [],
    isLoading
  } = useQuery({
    queryKey: ["admin-global-orders-ledger", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/api/v1/admin/orders" : `/api/v1/admin/orders?status=${statusFilter}`;
      return await apiRequest(url, {
        method: "GET"
      });
    },
    refetchInterval: 5e3
  });
  const forceCancelMutation = useMutation({
    mutationFn: async (orderId) => {
      setUpdatingId(orderId);
      return await apiRequest(`/api/v1/admin/orders/${orderId}/override`, {
        method: "POST",
        body: {
          status: "cancelled"
        }
      });
    },
    onSuccess: () => {
      toast.success("Administrative cancellation applied.");
      qc.invalidateQueries({
        queryKey: ["admin-global-orders-ledger"]
      });
      setSelectedOrder(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else if (err?.message && typeof err.message === "string") {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong");
      }
    },
    onSettled: () => setUpdatingId(null)
  });
  const visibleOrders = Array.isArray(orders) ? [...orders] : [];
  if (statusFilter === "all") {
    visibleOrders.sort((a, b) => {
      const priorityA = STATUS_PRIORITY[String(a?.status).toLowerCase()] ?? 99;
      const priorityB = STATUS_PRIORITY[String(b?.status).toLowerCase()] ?? 99;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }
  const calculateDiscountPercentage = (order) => {
    const couponDiscount = Number(order?.coupon_discount_applied || 0);
    const loyaltyDiscount = Number(order?.loyalty_discount_amount || 0);
    const totalDiscount = couponDiscount + loyaltyDiscount;
    const originalAmount = Number(order?.total_price || 0) + totalDiscount;
    if (originalAmount <= 0) {
      return totalDiscount > 0 ? 100 : 0;
    }
    return Math.round(totalDiscount / originalAmount * 100);
  };
  useEffect(() => {
    if (selectedOrder && visibleOrders.length > 0) {
      const currentFreshInstance = visibleOrders.find((o) => o?.id === selectedOrder.id);
      if (currentFreshInstance) {
        setSelectedOrder(currentFreshInstance);
      }
    }
  }, [visibleOrders, selectedOrder]);
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full w-full overflow-hidden relative", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-4 max-w-5xl mx-auto w-full transition-all duration-300", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b pb-3", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-xl font-bold tracking-tight text-foreground", children: "Orders" }),
        /* @__PURE__ */ jsx(Tabs, { value: statusFilter, onValueChange: setStatusFilter, children: /* @__PURE__ */ jsxs(TabsList, { className: "h-8 p-0.5 bg-muted rounded-lg border shadow-none", children: [
          /* @__PURE__ */ jsx(TabsTrigger, { value: "all", className: "text-xs px-2.5 py-1 rounded-md", children: "All" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "pending", className: "text-xs px-2.5 py-1 rounded-md", children: "Pending" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "accepted", className: "text-xs px-2.5 py-1 rounded-md", children: "Accepted" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "preparing", className: "text-xs px-2.5 py-1 rounded-md", children: "Preparing" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "ready", className: "text-xs px-2.5 py-1 rounded-md", children: "Ready" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "completed", className: "text-xs px-2.5 py-1 rounded-md", children: "Completed" })
        ] }) })
      ] }),
      isLoading ? /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Skeleton, { className: "h-12 w-full rounded-lg" }),
        /* @__PURE__ */ jsx(Skeleton, { className: "h-12 w-full rounded-lg" }),
        /* @__PURE__ */ jsx(Skeleton, { className: "h-12 w-full rounded-lg" })
      ] }) : visibleOrders.length === 0 ? /* @__PURE__ */ jsx("div", { className: "py-12 text-center text-muted-foreground text-xs border border-dashed rounded-lg", children: "No system order logs matching selection constraints." }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: visibleOrders.map((o) => {
        if (!o) return null;
        const currentStatus = (o.status || "pending").toLowerCase();
        const badgeStyle = STATUS_COLORS[currentStatus] || "bg-muted text-muted-foreground border-transparent";
        const isTableMode = String(o.order_type || "").toLowerCase() === "table_booking" || !o.delivery_address;
        const hasCouponDiscount = Number(o.coupon_discount_applied || 0) > 0;
        return /* @__PURE__ */ jsx(Card, { className: `border border-border/50 shadow-none rounded-lg hover:border-border/100 transition-all cursor-pointer ${selectedOrder?.id === o.id ? "bg-muted/40 border-primary/30" : "bg-card"}`, onClick: () => setSelectedOrder(o), children: /* @__PURE__ */ jsxs(CardContent, { className: "p-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-normal", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 w-full md:w-auto text-left shrink-0", children: [
            /* @__PURE__ */ jsxs("span", { className: "font-mono font-semibold text-foreground bg-muted border px-2 py-0.5 rounded text-[11px]", children: [
              "#",
              o.order_number ?? String(o.id).slice(0, 8).toUpperCase()
            ] }),
            /* @__PURE__ */ jsx(Badge, { variant: "outline", className: `text-[10px] font-semibold px-2 py-0.5 rounded border shadow-none capitalize ${badgeStyle}`, children: currentStatus.replace("_", " ") }),
            /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "text-[10px] font-normal text-muted-foreground bg-background px-2 py-0.5 rounded shadow-none border-border/50 gap-1 flex items-center", children: [
              isTableMode ? /* @__PURE__ */ jsx(Utensils, { className: "h-3 w-3 text-amber-500" }) : /* @__PURE__ */ jsx(Bike, { className: "h-3 w-3 text-blue-500" }),
              isTableMode ? "Table" : "Delivery"
            ] }),
            hasCouponDiscount && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: `text-[10px] ${currentStatus === "cancelled" ? "bg-rose-500/10 text-rose-700 border-rose-500/20 line-through opacity-70" : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"} font-medium px-1.5 py-0.5 rounded gap-1 flex items-center shadow-none`, children: [
              /* @__PURE__ */ jsx(Tag, { className: "h-2.5 w-2.5" }),
              " Coupon"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-1 text-left sm:text-right text-muted-foreground text-[11px] flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "truncate", children: [
              /* @__PURE__ */ jsx("span", { className: "text-foreground font-medium", children: "Customer:" }),
              " ",
              o.customer?.name || "Guest"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "truncate", children: [
              /* @__PURE__ */ jsx("span", { className: "text-foreground font-medium", children: "Shop:" }),
              " ",
              o.shop?.name || "Store"
            ] }),
            /* @__PURE__ */ jsx("div", { className: "sm:ml-auto font-mono text-muted-foreground/80", children: formatDate(o.created_at) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between w-full md:w-auto gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-border/20 shrink-0", children: [
            /* @__PURE__ */ jsx("span", { className: `font-semibold text-sm text-foreground tracking-tight min-w-[70px] text-right ${currentStatus === "cancelled" ? "line-through text-muted-foreground opacity-60" : ""}`, children: formatCurrency(o.total_price) }),
            /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", className: "h-7 text-[11px] font-medium px-2 rounded text-primary gap-1", children: [
              /* @__PURE__ */ jsx(Eye, { className: "h-3.5 w-3.5" }),
              " View"
            ] })
          ] })
        ] }) }, o.id);
      }) })
    ] }),
    selectedOrder && /* @__PURE__ */ jsxs("div", { className: "w-[380px] h-full bg-card border-l border-border/60 shadow-xl flex flex-col text-left animate-in slide-in-from-right duration-200 shrink-0 z-50", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-4 border-b border-border/40 flex items-center justify-between bg-background/40", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-0.5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxs("span", { className: "font-mono font-bold text-sm text-foreground", children: [
              "#",
              selectedOrder.order_number ?? String(selectedOrder.id).slice(0, 8).toUpperCase()
            ] }),
            /* @__PURE__ */ jsx(Badge, { variant: "outline", className: `text-[10px] font-semibold px-2 py-0.5 rounded shadow-none capitalize ${STATUS_COLORS[selectedOrder.status?.toLowerCase()] || ""}`, children: selectedOrder.status })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground font-mono", children: formatDate(selectedOrder.created_at) })
        ] }),
        /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 rounded-md hover:bg-muted", onClick: () => setSelectedOrder(null), children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4 text-xs font-normal", children: [
        /* @__PURE__ */ jsx("div", { className: "space-y-2 bg-muted/30 border border-border/40 p-3 rounded-lg", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[70px_1fr] gap-x-2 gap-y-1.5 leading-normal", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Customer:" }),
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: selectedOrder.customer?.name }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Phone:" }),
          /* @__PURE__ */ jsx("span", { className: "font-mono text-foreground font-medium", children: selectedOrder.customer?.phone || "—" }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Shop:" }),
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: selectedOrder.shop?.name }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Payment:" }),
          /* @__PURE__ */ jsxs("span", { className: "font-medium text-foreground uppercase text-[11px]", children: [
            selectedOrder.payment_method,
            " · ",
            /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground lowercase", children: [
              "(",
              selectedOrder.payment_status,
              ")"
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: `grid grid-cols-2 gap-2 ${selectedOrder.status?.toLowerCase() === "cancelled" ? "opacity-70 grayscale" : ""}`, children: [
          /* @__PURE__ */ jsxs("div", { className: "border border-border/40 bg-background/50 rounded-lg p-2.5 flex items-center gap-2.5", children: [
            /* @__PURE__ */ jsx(Percent, { className: "h-4 w-4 text-emerald-600 shrink-0" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground uppercase tracking-wider", children: "Total Off Rate" }),
              /* @__PURE__ */ jsxs("p", { className: "font-bold text-emerald-600 text-sm leading-tight", children: [
                calculateDiscountPercentage(selectedOrder),
                "%"
              ] })
            ] })
          ] }),
          Number(selectedOrder.coupon_discount_applied || 0) > 0 && /* @__PURE__ */ jsxs("div", { className: `border ${selectedOrder.status?.toLowerCase() === "cancelled" ? "border-rose-500/20 bg-rose-500/5" : "border-emerald-500/20 bg-emerald-500/5"} rounded-lg p-2.5 flex items-center gap-2.5`, children: [
            /* @__PURE__ */ jsx(Tag, { className: `h-4 w-4 ${selectedOrder.status?.toLowerCase() === "cancelled" ? "text-rose-600" : "text-emerald-600"} shrink-0` }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: `text-[10px] ${selectedOrder.status?.toLowerCase() === "cancelled" ? "text-rose-700/80" : "text-emerald-700/80"} uppercase tracking-wider font-medium`, children: selectedOrder.status?.toLowerCase() === "cancelled" ? "Refunded Off" : "Coupon Off" }),
              /* @__PURE__ */ jsxs("p", { className: `font-black ${selectedOrder.status?.toLowerCase() === "cancelled" ? "text-rose-600 line-through" : "text-emerald-600"} text-[13px] leading-tight`, children: [
                "-",
                formatCurrency(selectedOrder.coupon_discount_applied)
              ] })
            ] })
          ] }),
          Number(selectedOrder.loyalty_discount_amount || 0) > 0 && /* @__PURE__ */ jsxs("div", { className: "border border-blue-500/20 bg-blue-500/5 rounded-lg p-2.5 flex items-center gap-2.5", children: [
            /* @__PURE__ */ jsx(Coins, { className: "h-4 w-4 text-blue-600 shrink-0" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] text-blue-700/80 uppercase tracking-wider font-medium", children: "Loyalty Off" }),
              /* @__PURE__ */ jsxs("p", { className: "font-black text-blue-600 text-[13px] leading-tight", children: [
                "-",
                formatCurrency(selectedOrder.loyalty_discount_amount)
              ] })
            ] })
          ] })
        ] }),
        String(selectedOrder.order_type).toLowerCase() !== "table_booking" && selectedOrder.delivery_address && /* @__PURE__ */ jsxs("div", { className: "bg-background border border-border/40 rounded-lg p-3 flex items-start gap-2", children: [
          /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4 text-muted-foreground shrink-0 mt-0.5" }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-0.5", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", children: "Address" }),
            /* @__PURE__ */ jsx("p", { className: "text-foreground text-[11px] font-normal leading-relaxed", children: selectedOrder.delivery_address })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-0.5", children: "Items Summary" }),
          /* @__PURE__ */ jsx("div", { className: "rounded-lg border bg-background p-2 space-y-1", children: selectedOrder.items?.map((item, idx) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs py-1 border-b last:border-0 border-border/20", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-foreground font-medium truncate max-w-[220px]", children: [
              item.item_name_snapshot,
              " ",
              item.variant_name_snapshot ? `(${item.variant_name_snapshot})` : ""
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-right shrink-0", children: [
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground font-mono text-[11px]", children: formatCurrency(item.unit_price) }),
              /* @__PURE__ */ jsxs("span", { className: "font-mono text-[11px] font-bold text-foreground bg-muted border px-1.5 py-0 rounded", children: [
                "×",
                item.quantity
              ] })
            ] })
          ] }, idx)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border bg-muted/20 p-3 space-y-1.5 text-[11px]", children: [
          Number(selectedOrder.coupon_discount_applied || 0) > 0 && /* @__PURE__ */ jsxs("div", { className: `flex justify-between font-medium ${selectedOrder.status?.toLowerCase() === "cancelled" ? "text-rose-600/80 line-through" : "text-muted-foreground"}`, children: [
            /* @__PURE__ */ jsx("span", { children: "Coupon Deduction applied:" }),
            /* @__PURE__ */ jsxs("span", { className: `${selectedOrder.status?.toLowerCase() === "cancelled" ? "text-rose-600" : "text-emerald-600"} font-bold`, children: [
              "-",
              formatCurrency(selectedOrder.coupon_discount_applied)
            ] })
          ] }),
          Number(selectedOrder.loyalty_discount_amount || 0) > 0 && /* @__PURE__ */ jsxs("div", { className: "flex justify-between font-medium text-muted-foreground", children: [
            /* @__PURE__ */ jsx("span", { children: "Loyalty Discount applied:" }),
            /* @__PURE__ */ jsxs("span", { className: "text-blue-600 font-bold", children: [
              "-",
              formatCurrency(selectedOrder.loyalty_discount_amount)
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "h-px bg-border/40 my-1" }),
          /* @__PURE__ */ jsxs("div", { className: `flex justify-between font-bold text-sm ${selectedOrder.status?.toLowerCase() === "cancelled" ? "text-muted-foreground line-through opacity-60" : "text-foreground"}`, children: [
            /* @__PURE__ */ jsx("span", { children: "Payable Total:" }),
            /* @__PURE__ */ jsx("span", { children: formatCurrency(selectedOrder.total_price) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "p-3 border-t border-border/40 bg-background/40 flex items-center shrink-0", children: selectedOrder.status?.toLowerCase() !== "cancelled" && selectedOrder.status?.toLowerCase() !== "completed" ? /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "destructive", disabled: updatingId === selectedOrder.id, onClick: () => {
        const orderDisplayId = selectedOrder.order_number ?? String(selectedOrder.id).slice(0, 8).toUpperCase();
        if (confirm(`Force override: Cancel transaction #${orderDisplayId} unconditionally?`)) {
          forceCancelMutation.mutate(selectedOrder.id);
        }
      }, className: "h-8.5 text-xs font-semibold px-4 rounded-lg shadow-none w-full gap-1.5", children: [
        /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }),
        " Cancel Order"
      ] }) : /* @__PURE__ */ jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted border text-center w-full py-2 rounded-lg select-none", children: "Record Locked (Archive View)" }) })
    ] })
  ] });
}
export {
  AdminGlobalOrdersPage as component
};
