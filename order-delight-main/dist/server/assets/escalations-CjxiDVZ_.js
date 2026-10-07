import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { a as apiRequest, B as Button } from "./router-DQr6eapq.js";
import { toast } from "sonner";
import { ShieldAlert, ArrowLeft, HelpCircle } from "lucide-react";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { S as Skeleton } from "./skeleton-B35717OU.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-B1wYRq7_.js";
import { b as formatDate, f as formatCurrency } from "./format-BBidFSeC.js";
import { S as StatusBadge } from "./StatusBadge-CvMD4mLh.js";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-select";
import "./badge-sM2V1NmW.js";
function AdminEscalationsDashboard() {
  const qc = useQueryClient();
  const [resolvingId, setResolvingId] = useState(null);
  const {
    data: escalatedOrders,
    isLoading
  } = useQuery({
    queryKey: ["admin", "escalated-orders"],
    queryFn: async () => {
      return await apiRequest("/api/v1/admin/orders/escalated", {
        method: "GET"
      });
    },
    refetchInterval: 5e3
  });
  const adminOverrideMutation = useMutation({
    mutationFn: async ({
      orderId,
      action,
      reason
    }) => {
      setResolvingId(orderId);
      return await apiRequest(`/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        body: {
          status: action,
          reason
        }
      });
    },
    onSuccess: () => {
      toast.success("Resolution applied successfully");
      qc.invalidateQueries({
        queryKey: ["admin", "escalated-orders"]
      });
      qc.invalidateQueries({
        queryKey: ["admin", "orders"]
      });
    },
    onError: (err) => {
      if (err?.message && typeof err.message === "string") {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong");
      }
    },
    onSettled: () => setResolvingId(null)
  });
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-5xl px-4 py-8 space-y-6 text-left", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4 border-b pb-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 bg-primary/10 text-primary rounded-xl", children: /* @__PURE__ */ jsx(ShieldAlert, { className: "h-6 w-6" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight text-foreground", children: "Global Cancellation Requests" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Direct administrative overriding dashboard for handling platform-wide user dispute concerns." })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/admin/orders", children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "rounded-xl text-xs font-semibold gap-1.5 h-9", children: [
        /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }),
        " Back to Master Orders"
      ] }) })
    ] }),
    isLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-2", children: Array.from({
      length: 3
    }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-24 w-full rounded-2xl" }, i)) }) : !escalatedOrders || escalatedOrders.length === 0 ? /* @__PURE__ */ jsx(Card, { className: "border-dashed border-2 rounded-2xl bg-muted/10", children: /* @__PURE__ */ jsx(CardContent, { className: "py-12 text-center text-muted-foreground text-sm", children: "No pending cancellation requests found across the platform." }) }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: escalatedOrders.map((o) => /* @__PURE__ */ jsx(Card, { className: "overflow-hidden rounded-2xl border border-border text-left shadow-sm bg-card", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4 p-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 space-y-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxs("p", { className: "font-mono text-xs font-bold text-muted-foreground", children: [
              "#",
              o.order_number ?? String(o.id).slice(0, 8).toUpperCase()
            ] }),
            /* @__PURE__ */ jsx(StatusBadge, { status: o.status })
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            "Placed on ",
            formatDate(o.created_at)
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx("span", { className: "font-bold text-sm", children: formatCurrency(o.total_price) }),
          /* @__PURE__ */ jsxs(Select, { value: o.status, disabled: resolvingId !== null, onValueChange: (v) => {
            adminOverrideMutation.mutate({
              orderId: o.id,
              action: v,
              reason: v === "accepted" ? "" : o.cancellation_reason
            });
          }, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "w-48 capitalize font-semibold text-xs rounded-xl h-8", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select Resolution" }) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "cancel_requested", disabled: true, className: "text-muted-foreground text-xs font-bold", children: "Select Resolution" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "cancelled", className: "text-xs font-medium text-destructive", children: "Accept Request (Cancel)" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "accepted", className: "text-xs font-medium text-emerald-600", children: "Decline Request (Resume)" })
            ] })
          ] })
        ] })
      ] }),
      o.cancellation_reason && /* @__PURE__ */ jsxs("div", { className: "bg-amber-500/5 p-4 flex gap-2.5 items-start text-xs border-t border-border/20", children: [
        /* @__PURE__ */ jsx(HelpCircle, { className: "h-4 w-4 text-amber-600 shrink-0 mt-0.5" }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-0.5", children: [
          /* @__PURE__ */ jsx("span", { className: "font-bold text-foreground", children: "Customer's Stated Reason:" }),
          /* @__PURE__ */ jsxs("p", { className: "text-muted-foreground italic font-medium", children: [
            '"',
            o.cancellation_reason,
            '"'
          ] })
        ] })
      ] })
    ] }) }, o.id)) })
  ] });
}
export {
  AdminEscalationsDashboard as component
};
