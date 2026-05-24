import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, AlertTriangle, HelpCircle, XCircle, Clock, Mail, Phone, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ordersApi, type OrderStatus } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/_app/orders")({ component: OrdersPage });

const tabs: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// --- RENDER COMPONENT 1: ORDER DETAILS VIEW (WHEN FLAT DETAIL TRACKING IS ACTIVE) ---
function EmbeddedOrderDetailsPage({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiRequest<any>(`/api/v1/orders/${orderId}`, { method: "GET" }),
  });

  if (isLoading) return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading details...</div>;
  if (error || !order) return <div className="p-8 text-center text-xs text-destructive">Failed to find order record.</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button onClick={onBack} className="mb-4 inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground gap-1">
        <ChevronLeft className="h-4 w-4" /> Back to My Orders
      </button>

      <Card className="rounded-2xl border shadow-sm overflow-hidden text-left">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Order Reference ID</p>
              <h2 className="font-mono text-xs font-bold">{order.id}</h2>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary uppercase">
              <Clock className="h-3.5 w-3.5" /> {order.status.replace("_", " ")}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold">Items Ordered</p>
            <div className="divide-y rounded-xl border bg-muted/20 px-3.5 py-1">
              {order.items?.map((l: any) => (
                <div key={l.id} className="flex justify-between items-center py-2.5 text-xs">
                  <span>{l.quantity} × {l.item_name_snapshot || l.name}</span>
                  <span className="font-medium">{formatCurrency(l.unit_price * l.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 border-t pt-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Total Bill</span>
              <span className="font-medium text-foreground">{formatCurrency(order.total_price)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Payment Status</span>
              <span className="font-bold text-emerald-600 uppercase">{order.payment_status}</span>
            </div>
          </div>

          <CustomerOrderActionModule order={order} onActionComplete={onBack} />
        </CardContent>
      </Card>
    </div>
  );
}

// --- RENDER COMPONENT 2: CANCELLATION ENGINE ACTIONS BUTTONS MODULE ---
export function CustomerOrderActionModule({ order, onActionComplete }: { order: any; onActionComplete?: () => void }) {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");

  const { data: shopDetails } = useQuery({
    queryKey: ["shop-contact", order.shop_id],
    queryFn: async () => {
      return await apiRequest<any>(`/api/v1/shops/${order.shop_id}`, { method: "GET" });
    },
    enabled: !!order?.shop_id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { status: string; reason?: string }) => {
      return await apiRequest(`/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: payload,
      });
    },
    onSuccess: (updatedOrder: any) => {
      toast.success(
        updatedOrder.status === "cancelled" 
          ? "Order cancelled instantly. Vouchers and points have been restored."
          : "Cancellation request forwarded to store management tracking view lines."
      );
      setIsModalOpen(false);
      setReasonText("");
      qc.invalidateQueries({ queryKey: ["order", order.id] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      if (onActionComplete) onActionComplete();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Lifecycle status alteration error occurred.");
    }
  });

  const canInstantlyCancel = order.status === "pending";
  
  // 🚀 TIGHT LOCKDOWN TARGET: Evaluates immediately from local cached database object parameter properties
  const hasExceededRequestLimit = (order.cancellation_rejections ?? 0) >= 3;
  const canRequestCancel = ["accepted", "preparing", "ready"].includes(order.status) && !hasExceededRequestLimit;

  // 🚀 FALLBACK CONTACT DETAILS SCREEN OVERLAY IF LIMIT EXCEEDED
  if (hasExceededRequestLimit && ["accepted", "preparing", "ready", "cancel_requested"].includes(order.status)) {
    return (
      <div className="mt-4 p-4 border border-destructive/20 bg-destructive/[0.02] rounded-2xl space-y-3 text-left animate-in fade-in duration-200">
        <div className="flex items-center gap-2 text-destructive">
          <Lock className="h-4 w-4 shrink-0 animate-bounce" />
          <span className="font-bold text-xs uppercase tracking-wider">Cancellation Cap Limit Exceeded</span>
        </div>
        <p className="text-xs text-muted-foreground leading-normal">
          You have requested cancellation for this order 3 or more times, and the store manager has proceeded with your food preparation. Automated system requests are now locked. Please use the options below to contact the shop owner directly:
        </p>
        <div className="pt-2 flex flex-col gap-2 sm:flex-row sm:gap-4 text-xs font-semibold border-t border-border/60">
          {shopDetails?.phone && (
            <a 
              href={`tel:${shopDetails.phone}`} 
              className="inline-flex items-center justify-center gap-2 rounded-xl border bg-background px-4 py-2 hover:bg-muted text-primary border-primary/20 transition-all shadow-sm font-bold"
            >
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>Call Merchant: {shopDetails.phone}</span>
            </a>
          )}
          {(shopDetails?.email || (shopDetails as any).owner_email) && (
            <a 
              href={`mailto:${shopDetails.email || (shopDetails as any).owner_email}`} 
              className="inline-flex items-center justify-center gap-2 rounded-xl border bg-background px-4 py-2 hover:bg-muted text-primary border-primary/20 transition-all shadow-sm font-bold"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>Email Merchant: {shopDetails.email || (shopDetails as any).owner_email}</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  if (!canInstantlyCancel && !canRequestCancel) return null;

  return (
    <div className="mt-4 p-4 border border-border bg-muted/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="space-y-1 text-left">
        <p className="text-xs font-bold flex items-center gap-1.5 text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" /> Manage Order Lifecycle
        </p>
        <p className="text-[11px] text-muted-foreground max-w-md leading-normal">
          {canInstantlyCancel 
            ? "This order is pending kitchen verification. You can cancel it for an immediate full refund."
            : "The kitchen is preparing your food. Submitting a request allows the store owner to cancel the order for you."}
        </p>
      </div>

      {canInstantlyCancel ? (
        <Button
          variant="destructive"
          size="sm"
          className="rounded-xl text-xs font-semibold gap-1.5 shrink-0 px-4"
          disabled={updateStatusMutation.isPending}
          onClick={() => updateStatusMutation.mutate({ status: "cancelled" })}
        >
          <XCircle className="h-4 w-4" /> Cancel Order
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-medium gap-1.5 shrink-0 border-destructive/20 text-destructive bg-transparent hover:bg-destructive/10"
          onClick={() => setIsModalOpen(true)}
        >
          <HelpCircle className="h-4 w-4" /> Request Cancellation
        </Button>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black tracking-tight">Specify Cancellation Reason</DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Please let the shop owner know why you need to drop this pre-order.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-left">
            <Textarea
              placeholder="e.g., Selected wrong address / Pickup delays..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="text-xs rounded-xl min-h-[90px]"
              maxLength={250}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="text-xs rounded-xl h-9" onClick={() => setIsModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              className="text-xs rounded-xl h-9 font-semibold px-4"
              // 🚀 CRITICAL INTERCEPT UPGRADE: Disables button click action completely if rejections count dynamically meets criteria
              disabled={!reasonText.trim() || updateStatusMutation.isPending || (order.cancellation_rejections ?? 0) >= 3}
              onClick={() => {
                // 🚀 HARD CORED BACKUP DOUBLE CHECK: Intercepts action flow dynamically on click trigger
                if ((order.cancellation_rejections ?? 0) >= 3) {
                  toast.error("Action denied: This order has hit the maximum cancellation limit.");
                  setIsModalOpen(false);
                  return;
                }
                updateStatusMutation.mutate({ status: "cancel_requested", reason: reasonText.trim() });
              }}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- RENDER COMPONENT 3: MAIN TRACKING ORDERS LISTING DASHBOARD ---
function OrdersPage() {
  const [status, setStatus] = useState<string>("all");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-orders", status],
    queryFn: () =>
      ordersApi.list({ page: 1, page_size: 50, status: status === "all" ? undefined : (status as OrderStatus) }),
  });

  if (activeOrderId) {
    return <EmbeddedOrderDetailsPage orderId={activeOrderId} onBack={() => setActiveOrderId(null)} />;
  }

  const visibleOrders = Array.isArray(data) 
    ? data.filter((o: any) => {
        if (status === "all") return true;
        if (status === "cancelled") return o.status === "cancelled" || o.status === "cancel_requested";
        return o.status === status;
      })
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="text-left">
        <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
        <p className="text-sm text-muted-foreground">Track and manage your pre-orders.</p>
      </div>

      <Tabs value={status} onValueChange={setStatus} className="w-full">
        <TabsList className="flex flex-wrap h-auto p-1 bg-muted rounded-xl">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="rounded-lg text-xs py-1.5 px-3">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : visibleOrders.length === 0 ? (
        <Card className="border-dashed rounded-2xl">
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            No orders found matching this status window.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((o) => (
            <div 
              key={o.id} 
              onClick={() => setActiveOrderId(o.id)}
              className="block cursor-pointer transition-transform active:scale-[0.995] text-left"
            >
              <Card className="transition-all hover:border-primary/40 text-left rounded-2xl shadow-sm">
                <CardContent className="p-5 space-y-4">
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60 font-bold">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {formatDate(o.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-foreground">{formatCurrency(o.total_price)}</p>
                      {o.shop_name && (
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">{o.shop_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/40 border border-border/40 rounded-xl p-3 text-xs space-y-2">
                    {o.items && o.items.length > 0 ? (
                      <div className="space-y-1.5 divide-y divide-border/20">
                        {o.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between pt-1.5 first:pt-0 gap-4 text-left">
                            <span className="font-semibold text-foreground">
                              {item.item_name_snapshot || item.name} {item.variant_name_snapshot ? `(${item.variant_name_snapshot})` : ""}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border shrink-0 font-bold">
                              ×{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">Standard Basket Content</p>
                    )}
                  </div>

                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}