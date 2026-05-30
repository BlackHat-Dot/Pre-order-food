import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import {
  ChevronLeft,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_app/orders/$orderId")({
  component: OrderDetailsPage,
});

type OrderItem = {
  id?: string;
  quantity: number;
  unit_price: number;
  item_name_snapshot?: string;
  name?: string;
};

type Order = {
  id: string;
  status: string;
  total_price: number;
  payment_status: string;
  cancellation_reason?: string | null;
  cancellation_requests_sent?: number;
  items?: OrderItem[];
  shop?: {
    phone?: string;
    email?: string;
  };
};

function getErrorMessage(err: unknown) {
  if (!err) return "Something went wrong.";

  if (typeof err === "string") return err;

  if (err instanceof Error) return err.message || "Something went wrong.";

  if (typeof err === "object" && err !== null) {
    const anyErr = err as any;

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
      const locs = Array.isArray(first?.loc) ? first.loc.map((l: unknown) => String(l).toLowerCase()) : [];
      
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

function getOrderUiState(order: Order) {
  const status = (order.status || "").toLowerCase();

  const canInstantlyCancel = status === "pending";
  const canRequestCancel = ["accepted", "preparing", "ready"].includes(status);
  const requestPending = status === "cancel_requested";

  return {
    status,
    canInstantlyCancel,
    canRequestCancel,
    requestPending,
  };
}

function CustomerOrderActionModule({ order }: { order: Order }) {
  const qc = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");

  const { canInstantlyCancel, canRequestCancel, requestPending } =
    getOrderUiState(order);

  const cancellationAttempts = Number(
    (order as any)?.cancellation_requests_sent ?? 0
  );

  const MAX_REQUESTS = 3;

  const remainingRequests = Math.max(
    0,
    MAX_REQUESTS - cancellationAttempts
  );

  const limitReached = cancellationAttempts >= MAX_REQUESTS;

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: {
      status: string;
      reason?: string;
    }) => {
      return await apiRequest(`/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: payload,
      });
    },

    onSuccess: (updatedOrder: any, variables) => {
      const nextStatus = (
        updatedOrder?.status ||
        variables.status ||
        ""
      ).toLowerCase();

      if (nextStatus === "cancelled") {
        toast.success(
          "Order cancelled. Refund and rewards restored."
        );
      } else if (nextStatus === "cancel_requested") {
        toast.success(
          "Cancellation request submitted."
        );
      } else {
        toast.success("Order updated.");
      }

      setIsModalOpen(false);
      setReasonText("");

      qc.invalidateQueries({
        queryKey: ["order", order.id],
      });

      qc.invalidateQueries({
        queryKey: ["my-orders"],
      });
    },

    onError: (err: unknown) => {
      toast.error(getErrorMessage(err));
    },
  });

  if (requestPending) {
    return (
      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />

          <div className="flex-1">
            <p className="text-xs font-bold uppercase text-amber-500">
              Cancellation Request Pending
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Store owner is reviewing your request.
            </p>

            <div className="mt-2 text-[11px] text-muted-foreground">
              Attempts used:{" "}
              <span className="font-semibold text-foreground">
                {cancellationAttempts}/{MAX_REQUESTS}
              </span>
            </div>

            {order.cancellation_reason ? (
              <div className="mt-2 rounded-lg border border-border/50 bg-background/60 p-2 text-[11px]">
                <span className="font-semibold">Reason:</span>{" "}
                {order.cancellation_reason}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (!canInstantlyCancel && !canRequestCancel) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-left">
          <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Manage Order Cancellation
          </p>

          <p className="max-w-md text-[11px] leading-normal text-muted-foreground">
            {canInstantlyCancel
              ? "Order is still pending. Instant cancellation available."
              : "Kitchen already started processing. Request approval from store owner."}
          </p>

          {!canInstantlyCancel && (
            <div className="pt-1 text-[11px] text-muted-foreground">
              Attempts used:{" "}
              <span className="font-semibold text-foreground">
                {cancellationAttempts}/{MAX_REQUESTS}
              </span>
            </div>
          )}
        </div>

        {canInstantlyCancel ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={updateStatusMutation.isPending}
            className="rounded-xl px-4 text-xs font-semibold"
            onClick={() =>
              updateStatusMutation.mutate({
                status: "cancelled",
              })
            }
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Cancel Order
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={
              updateStatusMutation.isPending || limitReached
            }
            className={`rounded-xl px-4 text-xs font-semibold ${
              limitReached
                ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                : "border-destructive/20 text-destructive hover:bg-destructive/10"
            }`}
            onClick={() => setIsModalOpen(true)}
          >
            <HelpCircle className="mr-1.5 h-4 w-4" />

            {limitReached
              ? "Request Limit Reached"
              : "Request Cancellation"}
          </Button>
        )}
      </div>

      {limitReached && (
        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />

            <div className="flex-1">
              <p className="text-xs font-bold uppercase text-amber-500">
                Cancellation Request Limit Reached
              </p>

              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                You already used all 3 cancellation requests for this order.
                Please contact the shop owner directly for further assistance.
              </p>

              <div className="mt-3 rounded-lg border border-border/60 bg-background/60 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Shop Phone
                  </span>

                  <span className="font-semibold text-foreground">
                    {order.shop?.phone || "Not available"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Shop Email
                  </span>

                  <span className="font-semibold text-foreground">
                    {order.shop?.email || "Not available"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-left text-sm font-black tracking-tight">
              Request Cancellation
            </DialogTitle>

            <DialogDescription className="pt-1 text-left text-xs">
              Explain why you want to cancel this order.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              placeholder="Wrong item, delayed preparation, changed plans..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="min-h-[100px] rounded-xl text-xs"
              maxLength={250}
            />

            <div className="mt-2 text-right text-[10px] text-muted-foreground">
              {reasonText.length}/250
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="rounded-xl text-xs"
              onClick={() => setIsModalOpen(false)}
            >
              Back
            </Button>

            <Button
              variant="destructive"
              className="rounded-xl px-4 text-xs font-semibold"
              disabled={
                !reasonText.trim() ||
                updateStatusMutation.isPending
              }
              onClick={() =>
                updateStatusMutation.mutate({
                  status: "cancel_requested",
                  reason: reasonText.trim(),
                })
              }
            >
              {updateStatusMutation.isPending
                ? "Submitting..."
                : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderDetailsPage() {
  const { orderId } = Route.useParams();

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiRequest<Order>(`/api/v1/orders/${orderId}`, { method: "GET" }),
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
        Loading details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center text-xs text-destructive">
        Failed to find order record.
      </div>
    );
  }

  const statusLabel = order.status.replace(/_/g, " ");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/orders"
        className="mb-4 inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to My Orders
      </Link>

      <Card className="overflow-hidden rounded-2xl border shadow-sm text-left">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Order Reference ID
              </p>
              <h2 className="font-mono text-xs font-bold">{order.id}</h2>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase text-primary">
              <Clock className="h-3.5 w-3.5" />
              {statusLabel}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold">Items Ordered</p>
            <div className="divide-y rounded-xl border bg-muted/20 px-3.5 py-1">
              {(order.items || []).map((l) => (
                <div
                  key={l.id ?? `${l.item_name_snapshot ?? l.name}-${l.quantity}`}
                  className="flex items-center justify-between py-2.5 text-xs"
                >
                  <span>
                    {l.quantity} × {l.item_name_snapshot || l.name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency((l.unit_price || 0) * (l.quantity || 0))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 border-t pt-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Total Bill</span>
              <span className="font-medium text-foreground">
                {formatCurrency(order.total_price)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Payment Status</span>
              <span className="font-bold uppercase text-emerald-600">
                {order.payment_status}
              </span>
            </div>
          </div>

          <CustomerOrderActionModule order={order} />
        </CardContent>
      </Card>
    </div>
  );
}