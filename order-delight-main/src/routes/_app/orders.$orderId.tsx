import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Star } from "lucide-react";
import { toast } from "sonner";
import { ordersApi, paymentsApi, reviewsApi, ApiError } from "@/lib/api";
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
    queryFn: () => ordersApi.get(orderId),
    refetchInterval: 15_000,
  });
  const { data: payments } = useQuery({
    queryKey: ["order", orderId, "payments"],
    queryFn: () => paymentsApi.list(orderId),
  });

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(orderId),
    onSuccess: () => {
      toast.success("Order cancelled");
      qc.invalidateQueries({ queryKey: ["order", orderId] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Cancel failed"),
  });

  const submitReview = useMutation({
    mutationFn: () => reviewsApi.create({ order_id: order!.id, rating, comment: comment || undefined }),
    onSuccess: () => {
      toast.success("Review submitted");
      setReviewOpen(false);
      setComment("");
      qc.invalidateQueries({ queryKey: ["shop", order!.shop_id, "reviews"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed"),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!order) return null;

  const canCancel = order.status === "pending" || order.status === "confirmed";
  const canReview = order.status === "completed" || order.status === "ready" || order.payment_status === "paid";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> All orders
      </Link>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</p>
              <h1 className="text-2xl font-bold">{formatCurrency(order.total)}</h1>
              <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          {order.notes && (
            <p className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <span className="text-muted-foreground">Notes:</span> {order.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-6">
          <h2 className="mb-2 font-semibold">Items</h2>
          {order.items?.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <span>
                {it.quantity} × {it.name ?? "Item"}
              </span>
              <span className="font-medium">
                {formatCurrency((it.subtotal ?? it.unit_price * it.quantity) || 0)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {payments && payments.length > 0 && (
        <Card>
          <CardContent className="space-y-2 p-6">
            <h2 className="mb-2 font-semibold">Payments</h2>
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {p.method ?? "Payment"} · {p.status}
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
