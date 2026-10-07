import { jsxs, jsx } from "react/jsx-runtime";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { a as apiRequest, B as Button, D as Dialog, f as DialogContent, g as DialogHeader, h as DialogTitle, i as DialogDescription, T as Textarea, j as DialogFooter, o as ordersApi } from "./router-DQr6eapq.js";
import { toast } from "sonner";
import { Lock, Phone, Loader2, AlertTriangle, XCircle, HelpCircle, ChevronLeft, Clock } from "lucide-react";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { T as Tabs, a as TabsList, b as TabsTrigger } from "./tabs-CoISGPZI.js";
import { S as Skeleton } from "./skeleton-B35717OU.js";
import { b as formatDate, f as formatCurrency } from "./format-BBidFSeC.js";
import { S as StatusBadge } from "./StatusBadge-CvMD4mLh.js";
import "@tanstack/react-router";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-tabs";
import "./badge-sM2V1NmW.js";
const tabs = [{
  value: "all",
  label: "All"
}, {
  value: "pending",
  label: "Pending"
}, {
  value: "preparing",
  label: "Preparing"
}, {
  value: "ready",
  label: "Ready"
}, {
  value: "completed",
  label: "Completed"
}, {
  value: "cancelled",
  label: "Cancelled"
}];
function getCancellationRequestsCount(orderObj) {
  if (!orderObj) return 0;
  const rawValue = orderObj.cancellation_requests_sent ?? orderObj.cancellationRequestsSent ?? orderObj.cancellation_request_sent ?? orderObj.cancellationRequestSent ?? 0;
  const parsed = parseInt(rawValue, 10);
  return isNaN(parsed) ? 0 : parsed;
}
function EmbeddedOrderDetailsPage({
  orderId,
  onBack
}) {
  const {
    data: order,
    isLoading,
    error
  } = useQuery({
    queryKey: ["order-ticket", orderId],
    queryFn: () => ordersApi.getTicket(orderId),
    retry: false,
    gcTime: 0
  });
  if (isLoading) return /* @__PURE__ */ jsx("div", { className: "p-8 text-center text-xs text-muted-foreground animate-pulse", children: "Loading order details..." });
  if (error || !order) return /* @__PURE__ */ jsx("div", { className: "p-8 text-center text-xs text-destructive", children: "Failed to find order record." });
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl px-4 py-8", children: [
    /* @__PURE__ */ jsxs("button", { onClick: onBack, className: "mb-4 inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground gap-1", children: [
      /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }),
      " Back to My Orders"
    ] }),
    /* @__PURE__ */ jsx(Card, { className: "rounded-2xl border shadow-sm overflow-hidden text-left", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-6 space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center border-b pb-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase font-bold text-muted-foreground", children: "Order Reference ID" }),
          /* @__PURE__ */ jsx("h2", { className: "font-mono text-xs font-bold", children: order.id })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary uppercase", children: [
          /* @__PURE__ */ jsx(Clock, { className: "h-3.5 w-3.5" }),
          " ",
          order.status ? String(order.status).replace("_", " ") : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-bold", children: "Items Ordered" }),
        /* @__PURE__ */ jsx("div", { className: "divide-y rounded-xl border bg-muted/20 px-3.5 py-1", children: order.items?.map((l) => /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center py-2.5 text-xs", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            l.quantity,
            " × ",
            l.item_name_snapshot || l.name
          ] }),
          /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatCurrency(l.unit_price * l.quantity) })
        ] }, l.id)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 border-t pt-3 text-xs", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-muted-foreground", children: [
          /* @__PURE__ */ jsx("span", { children: "Total Bill" }),
          /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground", children: formatCurrency(order.total_price) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-muted-foreground", children: [
          /* @__PURE__ */ jsx("span", { children: "Payment Status" }),
          /* @__PURE__ */ jsx("span", { className: "font-bold text-emerald-600 uppercase", children: order.payment_status || "PAID" })
        ] })
      ] }),
      /* @__PURE__ */ jsx(CustomerOrderActionModule, { order, onActionComplete: onBack })
    ] }) })
  ] });
}
function CustomerOrderActionModule({
  order,
  onActionComplete
}) {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const {
    data: shopDetails
  } = useQuery({
    queryKey: ["shop-contact", order?.shop_id],
    queryFn: () => apiRequest(`/api/v1/shops/${order.shop_id}`, {
      method: "GET"
    }),
    enabled: !!order?.shop_id
  });
  const currentRequestsSent = getCancellationRequestsCount(order);
  const orderStatusStr = order?.status ? String(order.status).toLowerCase() : "";
  const isCancellationPending = order?.is_cancellation_pending ?? orderStatusStr === "cancel_requested";
  const updateStatusMutation = useMutation({
    mutationFn: async (payload) => {
      return await apiRequest(`/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: payload
      });
    },
    onSuccess: () => {
      toast.success("Cancellation request submitted to shop owner.");
      setIsModalOpen(false);
      setReasonText("");
      qc.invalidateQueries({
        queryKey: ["order-ticket", order.id]
      });
      qc.invalidateQueries({
        queryKey: ["my-orders"]
      });
      if (onActionComplete) onActionComplete();
    },
    onError: (err) => {
      qc.invalidateQueries({
        queryKey: ["order-ticket", order.id]
      });
      qc.invalidateQueries({
        queryKey: ["my-orders"]
      });
      if (err?.message && typeof err.message === "string") {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong");
      }
    }
  });
  const isPending = orderStatusStr === "pending";
  const isCancelled = orderStatusStr === "cancelled" || orderStatusStr === "refunded";
  const isCompleted = orderStatusStr === "completed";
  const hasReachedLimit = currentRequestsSent >= 3;
  if (isCancelled || isCompleted) return null;
  if (hasReachedLimit && !isCancellationPending) {
    return /* @__PURE__ */ jsxs("div", { className: "mt-5 pt-4 border-t border-border/80 space-y-2 text-left animate-in fade-in duration-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-xs font-semibold text-foreground flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Lock, { className: "h-3.5 w-3.5 text-muted-foreground" }),
        /* @__PURE__ */ jsx("span", { children: "Cancellation Limit Exceeded" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground leading-normal", children: "The automated cancellation request threshold has been met. Please connect directly with the shop owner for any additional manual overrides." }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-1.5 sm:flex-row sm:gap-4 text-xs text-muted-foreground pt-1", children: shopDetails?.phone && /* @__PURE__ */ jsxs("a", { href: `tel:${shopDetails.phone}`, className: "inline-flex items-center gap-1 hover:text-primary transition-colors text-foreground", children: [
        /* @__PURE__ */ jsx(Phone, { className: "h-3 w-3 text-muted-foreground/70" }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Phone: ",
          shopDetails.phone
        ] })
      ] }) })
    ] });
  }
  if (isCancellationPending) {
    return /* @__PURE__ */ jsxs("div", { className: "mt-4 p-4 border border-amber-500/20 bg-amber-500/5 rounded-xl space-y-2 text-left animate-in fade-in duration-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-xs font-bold text-amber-500 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin shrink-0" }),
        /* @__PURE__ */ jsx("span", { children: "Waiting for shop owner reply..." })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground leading-relaxed", children: "Your request has been submitted. The kitchen workflow line has been locked automatically. The store operator must explicitly accept or decline this cancellation before this order can be processed." }),
      /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-muted-foreground/70 font-medium pt-1", children: [
        "Request attempts used: (",
        currentRequestsSent,
        " of 3 attempts)"
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "mt-4 p-4 border border-border bg-muted/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-1 text-left", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-xs font-bold flex items-center gap-1.5 text-foreground", children: [
        /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4 text-destructive" }),
        " Manage Order Cancellation"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground max-w-md leading-normal", children: isPending ? "This order is pending kitchen verification. You can cancel it for an immediate full refund." : `Active kitchen workflow item. Request attempts used: (${currentRequestsSent} of 3 attempts).` })
    ] }),
    isPending ? /* @__PURE__ */ jsxs(Button, { variant: "destructive", size: "sm", className: "rounded-xl text-xs font-semibold gap-1.5 shrink-0 px-4", disabled: updateStatusMutation.isPending, onClick: () => updateStatusMutation.mutate({
      status: "cancelled"
    }), children: [
      /* @__PURE__ */ jsx(XCircle, { className: "h-4 w-4" }),
      " Cancel Order"
    ] }) : /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "rounded-xl text-xs font-medium gap-1.5 shrink-0 border-destructive/20 text-destructive bg-transparent hover:bg-destructive/10", onClick: () => setIsModalOpen(true), children: [
      /* @__PURE__ */ jsx(HelpCircle, { className: "h-4 w-4" }),
      " Request Cancellation"
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: isModalOpen, onOpenChange: setIsModalOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md rounded-2xl", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { className: "text-sm font-black tracking-tight", children: "Specify Cancellation Reason" }),
        /* @__PURE__ */ jsxs(DialogDescription, { className: "text-xs pt-1", children: [
          "Remaining requests: ",
          3 - currentRequestsSent,
          " execution chances left. Let the store manager know why you need to drop this order."
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "py-2 text-left", children: /* @__PURE__ */ jsx(Textarea, { placeholder: "e.g., Selected wrong delivery coordinates / Mistaken duplicate selection...", value: reasonText, onChange: (e) => setReasonText(e.target.value), className: "text-xs rounded-xl min-h-[90px]", maxLength: 250 }) }),
      /* @__PURE__ */ jsxs(DialogFooter, { className: "gap-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "ghost", className: "text-xs rounded-xl h-9", onClick: () => setIsModalOpen(false), children: "Back" }),
        /* @__PURE__ */ jsx(Button, { variant: "destructive", className: "text-xs rounded-xl h-9 font-semibold px-4", disabled: !reasonText.trim() || updateStatusMutation.isPending || currentRequestsSent >= 3, onClick: () => {
          updateStatusMutation.mutate({
            status: "cancel_requested",
            reason: reasonText.trim()
          });
        }, children: "Submit Request" })
      ] })
    ] }) })
  ] });
}
function OrdersPage() {
  const [status, setStatus] = useState("all");
  const [activeOrderId, setActiveOrderId] = useState(null);
  const {
    data = [],
    isLoading
  } = useQuery({
    queryKey: ["my-orders", status],
    queryFn: () => ordersApi.list({
      page: 1,
      page_size: 50,
      status: status === "all" ? void 0 : status
    })
  });
  if (activeOrderId) {
    return /* @__PURE__ */ jsx(EmbeddedOrderDetailsPage, { orderId: activeOrderId, onBack: () => setActiveOrderId(null) });
  }
  const visibleOrders = Array.isArray(data) ? data.filter((o) => {
    if (!o || !o.status) return false;
    const currentStatus = String(o.status).toLowerCase();
    if (status === "all") return true;
    if (status === "cancelled") return currentStatus === "cancelled" || currentStatus === "cancel_requested";
    return currentStatus === status;
  }) : [];
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-5xl space-y-6 p-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "text-left", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "My orders" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Track and manage your pre-orders." })
    ] }),
    /* @__PURE__ */ jsx(Tabs, { value: status, onValueChange: setStatus, className: "w-full", children: /* @__PURE__ */ jsx(TabsList, { className: "flex flex-wrap h-auto p-1 bg-muted rounded-xl", children: tabs.map((t) => /* @__PURE__ */ jsx(TabsTrigger, { value: t.value, className: "rounded-lg text-xs py-1.5 px-3", children: t.label }, t.value)) }) }),
    isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-32 w-full rounded-2xl" }) : visibleOrders.length === 0 ? /* @__PURE__ */ jsx(Card, { className: "border-dashed rounded-2xl", children: /* @__PURE__ */ jsx(CardContent, { className: "py-16 text-center text-muted-foreground text-sm", children: "No orders found matching this status window." }) }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: visibleOrders.map((o) => {
      if (!o) return null;
      const rowStatusStr = o.status ? String(o.status).toLowerCase() : "";
      return /* @__PURE__ */ jsx("div", { onClick: () => setActiveOrderId(o.id), className: "block cursor-pointer transition-transform active:scale-[0.995] text-left", children: /* @__PURE__ */ jsx(Card, { className: "transition-all hover:border-primary/40 text-left rounded-2xl shadow-sm", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-5 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxs("span", { className: "font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60 font-bold", children: [
                "#",
                o.order_number ?? (o.id ? String(o.id).slice(0, 8).toUpperCase() : "")
              ] }),
              /* @__PURE__ */ jsx(StatusBadge, { status: o.status })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground font-mono", children: formatDate(o.created_at) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
            /* @__PURE__ */ jsx("p", { className: "text-base font-bold text-foreground", children: formatCurrency(o.total_price) }),
            o.shop_name && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground font-medium mt-0.5", children: o.shop_name })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-muted/40 border border-border/40 rounded-xl p-3 text-xs space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-1.5 mb-1.5 font-medium uppercase tracking-wider", children: [
            /* @__PURE__ */ jsx("span", { children: "Order Activity Context" }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground normal-case font-mono", children: rowStatusStr === "cancel_requested" ? "Cancellation Pending Review" : "Active Fulfillment Workflow" })
          ] }),
          o.items && o.items.length > 0 ? /* @__PURE__ */ jsx("div", { className: "space-y-1.5 divide-y divide-border/20", children: o.items.map((item, idx) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pt-1.5 first:pt-0 gap-4 text-left", children: [
            /* @__PURE__ */ jsxs("span", { className: "font-semibold text-foreground", children: [
              item.item_name_snapshot || item.name,
              " ",
              item.variant_name_snapshot ? `(${item.variant_name_snapshot})` : ""
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "font-mono text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border shrink-0 font-bold", children: [
              "×",
              item.quantity
            ] })
          ] }, idx)) }) : /* @__PURE__ */ jsx("p", { className: "text-muted-foreground italic", children: "Standard Basket Content" })
        ] })
      ] }) }) }, o.id);
    }) })
  ] });
}
export {
  CustomerOrderActionModule,
  OrdersPage as component
};
