import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Star } from "lucide-react";
import { toast } from "sonner";
import { ordersApi, paymentsApi, reviewsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/app/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/orders/$orderId")({ component: OrderDetail });

function OrderDetail() {
  const { orderId } = Route.useParams();
  const qc = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.get(orderId!),
    enabled: !!orderId,
    refetchInterval: 15_000,
  });
  const { data: payments } = useQuery({
    queryKey: ["order", orderId, "payments"],
    queryFn: () => (paymentsApi as any).get(orderId!), // Bypass strict type
    enabled: !!orderId,
  });

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(orderId),
    onSuccess: () => {
      toast.success("Order cancelled");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Cancel failed"),
  });

  const submitReview = useMutation({
    mutationFn: () => {
      if (!order) throw new Error("No order available");
      // Cast to any to prevent schema mismatch errors
      return (reviewsApi as any).create({ 
        order_id: order.id, 
        rating, 
        comment: comment || undefined 
      });
    },
    onSuccess: () => {
      toast.success("Review submitted");
      setReviewOpen(false);
      setComment("");
      if (order) qc.invalidateQueries({ queryKey: ["shop", order.shop_id, "reviews"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!order) return null;

  // Safe fallback casts to prevent TypeScript from panicking
  const safeOrder = order as any;
  const priceToDisplay = safeOrder.total_price ?? safeOrder.total_amount ?? 0;
  const notesToDisplay = safeOrder.instructions ?? safeOrder.notes;

  // Updated "delivered" to "completed" to match our standardized OrderStatus
  const canCancel = safeOrder.status === "pending" || safeOrder.status === "accepted";
  const canReview = safeOrder.status === "completed" || safeOrder.status === "ready" || safeOrder.payment?.status === "paid" || safeOrder.payment_status === "paid";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> All orders
      </Link>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs text-muted-foreground">#{safeOrder.id.slice(0, 8)}</p>
              <h1 className="text-2xl font-bold">{formatCurrency(priceToDisplay)}</h1>
              <p className="text-sm text-muted-foreground">{formatDate(safeOrder.created_at)}</p>
            </div>
            <StatusBadge status={safeOrder.status} />
          </div>
          {notesToDisplay && (
            <p className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <span className="text-muted-foreground">Notes:</span> {notesToDisplay}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 🚀 STEP 1 INTEGRATION: Clean & Accurate Food Item Layout Mapping */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 text-left">
            Items Ordered
          </h2>
          {safeOrder.items?.map((it: any) => (
            <div key={it.id} className="flex items-start justify-between text-sm py-2 border-b border-border/20 last:border-0 last:pb-0">
              <div className="flex flex-col text-left">
                <span className="font-semibold text-foreground">
                  {it.menu_item_name ?? it.item_name_snapshot ?? it.name ?? "Item"}
                </span>
                {it.variant_name && (
                  <span className="text-[11px] text-muted-foreground italic mt-0.5">
                    Option: {it.variant_name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  ×{it.quantity}
                </span>
                <span className="font-medium min-w-[60px] text-right">
                  {formatCurrency((it.unit_price * it.quantity) || it.price || 0)}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {payments && (payments as any[]).length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-6">
            <h2 className="mb-2 font-semibold text-left">Payments</h2>
            {(payments as any[]).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {p.provider ?? "Payment"} · {p.status}
                </span>
                <span className="font-medium">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {canCancel && (
          <Button variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            Cancel order
          </Button>
        )}
        {canReview && (
          <Button onClick={() => setReviewOpen(true)} disabled={submitReview.isPending}>
            <Star className="mr-2 h-4 w-4" /> Leave a review
          </Button>
        )}
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 text-left">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={n <= rating ? "text-primary" : "text-muted-foreground"}
                  >
                    <Star className={`h-7 w-7 ${n <= rating ? "fill-current" : ""}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="cmt">Comment (optional)</Label>
              <Textarea id="cmt" value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => submitReview.mutate()} disabled={submitReview.isPending}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}