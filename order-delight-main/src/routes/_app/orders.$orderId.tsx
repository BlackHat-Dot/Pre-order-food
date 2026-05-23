import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { ChevronLeft, AlertTriangle, HelpCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

// 🚀 FIXED: Register and export the route instance cleanly
export const Route = createFileRoute("/_app/orders/$orderId")({
  component: OrderDetailsPage,
});

// ==========================================
// CANCELLATION ACTION COMPONENT
// ==========================================
export function CustomerOrderActionModule({ order }: { order: any }) {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");

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
    },
    onError: (err: any) => {
      toast.error(err?.message || "Lifecycle status alteration error occurred.");
    }
  });

  const canInstantlyCancel = order.status === "pending";
  const canRequestCancel = ["accepted", "preparing", "ready"].includes(order.status);

  if (!canInstantlyCancel && !canRequestCancel) return null;

  return (
    <div className="mt-4 p-4 border border-destructive/20 bg-destructive/5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="space-y-1 text-center sm:text-left">
        <p className="text-xs font-bold flex items-center gap-1.5 justify-center sm:justify-start text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" /> Need to cancel this meal ticket request?
        </p>
        <p className="text-[11px] text-muted-foreground max-w-md leading-normal">
          {canInstantlyCancel 
            ? "Since this purchase is still pending kitchen processing authorization metrics, you are entitled to execute an instant order tear-down down here."
            : "The kitchen is actively processing your order. You can submit a cancellation request to the shop owner along with a short message."}
        </p>
      </div>

      {canInstantlyCancel ? (
        <Button
          variant="destructive"
          size="sm"
          className="rounded-xl text-xs font-semibold gap-1.5 shrink-0 px-4 transition-transform active:scale-95"
          disabled={updateStatusMutation.isPending}
          onClick={() => updateStatusMutation.mutate({ status: "cancelled" })}
        >
          <XCircle className="h-4 w-4" /> Cancel Order
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-medium gap-1.5 shrink-0 border-destructive/30 hover:bg-destructive/10 text-destructive bg-transparent"
          onClick={() => setIsModalOpen(true)}
        >
          <HelpCircle className="h-4 w-4" /> Request Cancellation
        </Button>
      )}

      {/* 🚀 FIXED: Set onOpenChange directly to the functional state setter callback function */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black tracking-tight">Specify Cancellation Reason</DialogTitle>
            <DialogDescription className="text-xs leading-normal pt-1">
              Please tell the shop owner why you need to cancel this order. They will view your explanation inside their live order tracker lines to approve the change.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="e.g., Changed my mind / Selected wrong pickup storefront location..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="text-xs rounded-xl min-h-[90px] focus-visible:ring-destructive"
              maxLength={250}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" className="text-xs rounded-xl h-9" onClick={() => setIsModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              className="text-xs rounded-xl h-9 font-semibold px-4"
              disabled={!reasonText.trim() || updateStatusMutation.isPending}
              onClick={() => updateStatusMutation.mutate({ status: "cancel_requested", reason: reasonText.trim() })}
            >
              {updateStatusMutation.isPending ? "Submitting..." : "Send Request Line"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// PARENT DETAILED PAGE COMPONENT
// ==========================================
function OrderDetailsPage() {
  const { orderId } = Route.useParams();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiRequest<any>(`/api/v1/orders/${orderId}`, { method: "GET" }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-xs text-muted-foreground animate-pulse">
        Loading purchase itinerary specifications...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-xs text-destructive">
        Failed to pull up this order file profile record.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to="/orders" className="mb-4 inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> View full purchase log history
      </Link>

      <Card className="rounded-2xl border-border/80 shadow-sm overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-4">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Order Reference ID</p>
              <h2 className="font-mono text-xs font-bold text-foreground truncate max-w-xs">{order.id}</h2>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary self-start uppercase tracking-tight">
              <Clock className="h-3.5 w-3.5" /> {order.status.replace("_", " ")}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-foreground">Selected Cart Selections</p>
            <div className="divide-y rounded-xl border bg-muted/20 px-3.5 py-1">
              {order.items?.map((l: any) => (
                <div key={l.id} className="flex justify-between items-center py-2.5 text-xs">
                  <span className="text-muted-foreground">
                    {l.quantity} × <span className="font-semibold text-foreground">{l.item_name_snapshot}</span>
                    {l.variant_name_snapshot && ` (${l.variant_name_snapshot})`}
                  </span>
                  <span className="font-medium text-foreground">{formatCurrency(l.unit_price * l.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 border-t pt-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Total Price Invoice Sum</span>
              <span className="font-medium text-foreground">{formatCurrency(order.total_price)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Payment Type Channel</span>
              <span className="font-mono uppercase text-foreground">{order.payment_method}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Settlement Network Status</span>
              <span className="font-bold text-emerald-600 uppercase tracking-tight">{order.payment_status}</span>
            </div>
          </div>

          <CustomerOrderActionModule order={order} />
        </CardContent>
      </Card>
    </div>
  );
}