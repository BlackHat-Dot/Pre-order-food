import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { v as Route, a as apiRequest, B as Button, D as Dialog, f as DialogContent, g as DialogHeader, h as DialogTitle, i as DialogDescription, T as Textarea, j as DialogFooter } from "./router-DQr6eapq.js";
import { toast } from "sonner";
import { ChevronLeft, Clock, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { f as formatCurrency } from "./format-BBidFSeC.js";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
function getErrorMessage(err) {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || "Something went wrong.";
  if (typeof err === "object" && err !== null) {
    const anyErr = err;
    if (typeof anyErr.message === "string" && anyErr.message.trim()) {
      return anyErr.message;
    }
    if (typeof anyErr.detail === "string" && anyErr.detail.trim()) {
      return anyErr.detail;
    }
    if (typeof anyErr.error === "string" && anyErr.error.trim()) {
      return anyErr.error;
    }
    if (Array.isArray(anyErr.detail) && anyErr.detail.length > 0) {
      const first = anyErr.detail[0];
      const locs = Array.isArray(first?.loc) ? first.loc.map((l) => String(l).toLowerCase()) : [];
      if (locs.includes("reason")) {
        if (first?.type === "string_too_short" || first?.type?.includes("short")) {
          return "Cancellation reason is too short.";
        }
        return "Please provide a valid cancellation reason.";
      }
      return "Please check your input and try again.";
    }
  }
  return "Something went wrong.";
}
function getOrderUiState(order) {
  const status = (order.status || "").toLowerCase();
  const canInstantlyCancel = status === "pending";
  const canRequestCancel = ["accepted", "preparing", "ready"].includes(status);
  const requestPending = status === "cancel_requested";
  return {
    status,
    canInstantlyCancel,
    canRequestCancel,
    requestPending
  };
}
function CustomerOrderActionModule({
  order
}) {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const {
    canInstantlyCancel,
    canRequestCancel,
    requestPending
  } = getOrderUiState(order);
  const cancellationAttempts = Number(order?.cancellation_requests_sent ?? 0);
  const MAX_REQUESTS = 3;
  const limitReached = cancellationAttempts >= MAX_REQUESTS;
  const updateStatusMutation = useMutation({
    mutationFn: async (payload) => {
      return await apiRequest(`/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: payload
      });
    },
    onSuccess: (updatedOrder, variables) => {
      const nextStatus = (updatedOrder?.status || variables.status || "").toLowerCase();
      if (nextStatus === "cancelled") {
        toast.success("Order cancelled. Refund and rewards restored.");
      } else if (nextStatus === "cancel_requested") {
        toast.success("Cancellation request submitted.");
      } else {
        toast.success("Order updated.");
      }
      setIsModalOpen(false);
      setReasonText("");
      qc.invalidateQueries({
        queryKey: ["order", order.id]
      });
      qc.invalidateQueries({
        queryKey: ["my-orders"]
      });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    }
  });
  if (requestPending) {
    return /* @__PURE__ */ jsx("div", { className: "mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
      /* @__PURE__ */ jsx(Clock, { className: "mt-0.5 h-5 w-5 shrink-0 text-amber-500" }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase text-amber-500", children: "Cancellation Request Pending" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: "Store owner is reviewing your request." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 text-[11px] text-muted-foreground", children: [
          "Attempts used:",
          " ",
          /* @__PURE__ */ jsxs("span", { className: "font-semibold text-foreground", children: [
            cancellationAttempts,
            "/",
            MAX_REQUESTS
          ] })
        ] }),
        order.cancellation_reason ? /* @__PURE__ */ jsxs("div", { className: "mt-2 rounded-lg border border-border/50 bg-background/60 p-2 text-[11px]", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Reason:" }),
          " ",
          order.cancellation_reason
        ] }) : null
      ] })
    ] }) });
  }
  if (!canInstantlyCancel && !canRequestCancel) {
    return null;
  }
  return /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-xl border border-border bg-muted/30 p-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1 text-left", children: [
        /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-1.5 text-xs font-bold text-foreground", children: [
          /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4 text-destructive" }),
          "Manage Order Cancellation"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "max-w-md text-[11px] leading-normal text-muted-foreground", children: canInstantlyCancel ? "Order is still pending. Instant cancellation available." : "Kitchen already started processing. Request approval from store owner." }),
        !canInstantlyCancel && /* @__PURE__ */ jsxs("div", { className: "pt-1 text-[11px] text-muted-foreground", children: [
          "Attempts used:",
          " ",
          /* @__PURE__ */ jsxs("span", { className: "font-semibold text-foreground", children: [
            cancellationAttempts,
            "/",
            MAX_REQUESTS
          ] })
        ] })
      ] }),
      canInstantlyCancel ? /* @__PURE__ */ jsxs(Button, { variant: "destructive", size: "sm", disabled: updateStatusMutation.isPending, className: "rounded-xl px-4 text-xs font-semibold", onClick: () => updateStatusMutation.mutate({
        status: "cancelled"
      }), children: [
        /* @__PURE__ */ jsx(XCircle, { className: "mr-1.5 h-4 w-4" }),
        "Cancel Order"
      ] }) : /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", disabled: updateStatusMutation.isPending || limitReached, className: `rounded-xl px-4 text-xs font-semibold ${limitReached ? "cursor-not-allowed border-border bg-muted text-muted-foreground" : "border-destructive/20 text-destructive hover:bg-destructive/10"}`, onClick: () => setIsModalOpen(true), children: [
        /* @__PURE__ */ jsx(HelpCircle, { className: "mr-1.5 h-4 w-4" }),
        limitReached ? "Request Limit Reached" : "Request Cancellation"
      ] })
    ] }),
    limitReached && /* @__PURE__ */ jsx("div", { className: "mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
      /* @__PURE__ */ jsx(AlertTriangle, { className: "mt-0.5 h-5 w-5 shrink-0 text-amber-500" }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase text-amber-500", children: "Cancellation Request Limit Reached" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-[11px] leading-relaxed text-muted-foreground", children: "You already used all 3 cancellation requests for this order. Please contact the shop owner directly for further assistance." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 rounded-lg border border-border/60 bg-background/60 p-3 space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Shop Phone" }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: order.shop?.phone || "Not available" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Shop Email" }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: order.shop?.email || "Not available" })
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: isModalOpen, onOpenChange: setIsModalOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md rounded-2xl", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { className: "text-left text-sm font-black tracking-tight", children: "Request Cancellation" }),
        /* @__PURE__ */ jsx(DialogDescription, { className: "pt-1 text-left text-xs", children: "Explain why you want to cancel this order." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "py-2", children: [
        /* @__PURE__ */ jsx(Textarea, { placeholder: "Wrong item, delayed preparation, changed plans...", value: reasonText, onChange: (e) => setReasonText(e.target.value), className: "min-h-[100px] rounded-xl text-xs", maxLength: 250 }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 text-right text-[10px] text-muted-foreground", children: [
          reasonText.length,
          "/250"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { className: "gap-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "ghost", className: "rounded-xl text-xs", onClick: () => setIsModalOpen(false), children: "Back" }),
        /* @__PURE__ */ jsx(Button, { variant: "destructive", className: "rounded-xl px-4 text-xs font-semibold", disabled: !reasonText.trim() || updateStatusMutation.isPending, onClick: () => updateStatusMutation.mutate({
          status: "cancel_requested",
          reason: reasonText.trim()
        }), children: updateStatusMutation.isPending ? "Submitting..." : "Submit Request" })
      ] })
    ] }) })
  ] });
}
function OrderDetailsPage() {
  const {
    orderId
  } = Route.useParams();
  const {
    data: order,
    isLoading,
    error
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiRequest(`/api/v1/orders/${orderId}`, {
      method: "GET"
    })
  });
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "p-8 text-center text-xs text-muted-foreground animate-pulse", children: "Loading details..." });
  }
  if (error || !order) {
    return /* @__PURE__ */ jsx("div", { className: "p-8 text-center text-xs text-destructive", children: "Failed to find order record." });
  }
  const statusLabel = order.status.replace(/_/g, " ");
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl px-4 py-8", children: [
    /* @__PURE__ */ jsxs(Link, { to: "/orders", className: "mb-4 inline-flex items-center text-xs text-muted-foreground hover:text-foreground", children: [
      /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }),
      "Back to My Orders"
    ] }),
    /* @__PURE__ */ jsx(Card, { className: "overflow-hidden rounded-2xl border shadow-sm text-left", children: /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4 p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b pb-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("h2", { className: "text-sm font-black tracking-tight text-foreground", children: [
            "Order #",
            order.order_number ?? String(order.id).slice(0, 8).toUpperCase()
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "font-mono text-[10px] text-muted-foreground mt-0.5", children: [
            "Reference ID: ",
            order.id
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase text-primary", children: [
          /* @__PURE__ */ jsx(Clock, { className: "h-3.5 w-3.5" }),
          statusLabel
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-bold", children: "Items Ordered" }),
        /* @__PURE__ */ jsx("div", { className: "divide-y rounded-xl border bg-muted/20 px-3.5 py-1", children: (order.items || []).map((l) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between py-2.5 text-xs", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            l.quantity,
            " × ",
            l.item_name_snapshot || l.name
          ] }),
          /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatCurrency((l.unit_price || 0) * (l.quantity || 0)) })
        ] }, l.id ?? `${l.item_name_snapshot ?? l.name}-${l.quantity}`)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 border-t pt-3 text-xs", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-muted-foreground", children: [
          /* @__PURE__ */ jsx("span", { children: "Total Bill" }),
          /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground", children: formatCurrency(order.total_price) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-muted-foreground", children: [
          /* @__PURE__ */ jsx("span", { children: "Payment Status" }),
          /* @__PURE__ */ jsx("span", { className: "font-bold uppercase text-emerald-600", children: order.payment_status })
        ] })
      ] }),
      /* @__PURE__ */ jsx(CustomerOrderActionModule, { order })
    ] }) })
  ] });
}
export {
  OrderDetailsPage as component
};
