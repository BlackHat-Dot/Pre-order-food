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

// --- RENDER COMPONENT 1: ORDER DETAILS VIEW ---
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

// --- RENDER COMPONENT 2: CANCELLATION ENGINE ACTIONS MODULE ---
export function CustomerOrderActionModule({ order, onActionComplete }: { order: any; onActionComplete?: () => void }) {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");

  const { data: shopDetails } = useQuery({
    queryKey: ["shop-contact", order.shop_id],
    queryFn: () => apiRequest<any>(`/api/v1/shops/${order.shop_id}`, { method: "GET" }),
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
      toast.success(`Cancellation request ${updatedOrder.cancellation_requests_sent}/3 submitted successfully.`);
      setIsModalOpen(false);
      setReasonText("");
      qc.invalidateQueries({ queryKey: ["order", order.id] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      if (onActionComplete) onActionComplete();
    },
    onError: (err: any) => {
      qc.invalidateQueries({ queryKey: ["order", order.id] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      toast.error(err?.message || "Maximum cancellation limits reached.");
    }
  });

  const canInstantlyCancel = order.status === "pending";
  const hasExceededRequestLimit = (order.cancellation_requests_sent ?? 0) >= 3;
  const canRequestCancel = ["accepted", "preparing", "ready", "cancel_requested"].includes(order.status) && !hasExceededRequestLimit;

  // 🚨 REPLACES ENTIRE BOX COMPONENT WITH CLEAN CORPORATE FOOTER NOTE
  if (hasExceededRequestLimit && ["accepted", "preparing", "ready", "cancel_requested"].includes(order.status)) {
    return (
      <div className="mt-5 pt-4 border-t border-border/80 space-y-2.5 text-left">
        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Contact shop owner for cancellation queries</span>
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-4 text-xs text-muted-foreground">
          {shopDetails?.phone && (
            <a href={`tel:${shopDetails.phone}`} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
              <Phone className="h-3 w-3 text-muted-foreground/70" />
              <span>Phone: {shopDetails.phone}</span>
            </a>
          )}
          {(shopDetails?.email || (shopDetails as any).owner_email) && (
            <a href={`mailto:${shopDetails.email || (shopDetails as any).owner_email}`} className="inline-flex items-center gap-1 hover:text-primary transition-colors min-w-0">
              <Mail className="h-3 w-3 text-muted-foreground/70" />
              <span className="truncate">Email: {shopDetails.email || (shopDetails as any).owner_email}</span>
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
          <AlertTriangle className="h-4 w-4 text-destructive" /> Manage Order Cancellation
        </p>
        <p className="text-[11px] text-muted-foreground max-w-md leading-normal">
          {canInstantlyCancel 
            ? "This order is pending kitchen verification. You can cancel it for an immediate full refund."
            : `Active kitchen workflow item. Request attempts: (${order.cancellation_requests_sent ?? 0}/3 used).`}
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
              Attempt { (order.cancellation_requests_sent ?? 0) + 1 } of 3. Let the owner know why you need to drop this order.
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
              disabled={!reasonText.trim() || updateStatusMutation.isPending || (order.cancellation_requests_sent ?? 0) >= 3}
              onClick={() => {
                if ((order.cancellation_requests_sent ?? 0) >= 3) {
                  toast.error("Action denied: Maximum request limits reached.");
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

// --- RENDER COMPONENT 3: MAIN DASHBOARD ---
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
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-1.5 mb-1.5 font-medium uppercase tracking-wider">
                      <span>Order Activity Context</span>
                      <span className="font-semibold text-foreground normal-case font-mono">
                        {((o as any).cancellation_requests_sent ?? 0) >= 3
                          ? "Contact Shop Owner"
                          : `Attempts: ${((o as any).cancellation_requests_sent ?? 0)}/3`}
                      </span>
                    </div>

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