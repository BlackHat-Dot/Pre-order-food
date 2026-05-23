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

export const Route = createFileRoute("/_app/orders/$orderId")({
  component: OrderDetailsPage,
});

export function CustomerOrderActionModule({ order }: { order: any }) {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { status?: string; reason?: string }) => {
      // 🚀 FIXED: Passes payload containing metadata safely directly down to backend patches
      return await apiRequest(`/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: payload,
      });
    },
    onSuccess: (updatedOrder: any) => {
      if (updatedOrder.status === "cancelled") {
        toast.success("Order cancelled instantly. Vouchers and points have been restored.");
      } else {
        toast.success("Cancellation request successfully submitted to the store manager.");
      }
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
  const isAlreadyRequested = !!order.cancellation_reason;
  const canRequestCancel = ["accepted", "preparing", "ready"].includes(order.status) && !isAlreadyRequested;

  if (isAlreadyRequested) {
    return (
      <div className="mt-4 p-4 border border-amber-500/20 bg-amber-500/5 rounded-xl text-left flex items-start gap-3">
        <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-500">Cancellation Request Pending Approval</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            You requested to cancel this order with reason: <span className="italic text-foreground">"{order.cancellation_reason}"</span>. The store owner is reviewing your request.
          </p>
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
            <DialogTitle className="text-sm font-black tracking-tight text-left">Specify Cancellation Reason</DialogTitle>
            <DialogDescription className="text-xs pt-1 text-left">
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
              disabled={!reasonText.trim() || updateStatusMutation.isPending}
              onClick={() => updateStatusMutation.mutate({ reason: reasonText.trim() })}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderDetailsPage() {
  const { orderId } = Route.useParams();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiRequest<any>(`/api/v1/orders/${orderId}`, { method: "GET" }),
  });

  if (isLoading) return <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Loading details...</div>;
  if (error || !order) return <div className="p-8 text-center text-xs text-destructive">Failed to find order record.</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/orders" className="mb-4 inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to My Orders
      </Link>

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

          <CustomerOrderActionModule order={order} />
        </CardContent>
      </Card>
    </div>
  );
}