import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ordersApi, paymentsApi, reviewsApi, ApiError } from "@/lib/api";
import { PO_CSS } from "@/components/app/PublicNav";
import { StatusBadge } from "@/components/app/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  if (isLoading) return <p className="hint">Loading order…</p>;
  if (!order) return null;

  const canCancel = order.status === "pending" || order.status === "confirmed";
  const canReview = order.status === "completed" || order.status === "ready" || order.payment_status === "paid";

  return (
    <div className="po" style={{ margin: -24, padding: "40px 24px", minHeight: "100%" }}>
      <style>{PO_CSS}</style>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link to="/orders" className="hint">← All orders</Link>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", marginTop: 12 }}>
          <div>
            <h1 style={{ fontSize: "clamp(40px,6vw,72px)" }}>{formatCurrency(order.total)}</h1>
            <p className="hint">Order #{order.id.slice(0, 8)} · placed {formatDate(order.created_at)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        {order.notes && <p style={{ marginTop: 20, borderLeft: "3px solid var(--rule)", paddingLeft: 12 }}>Your note: {order.notes}</p>}

        <h2 style={{ fontSize: 24, marginTop: 40, paddingBottom: 8, borderBottom: "1px solid var(--ink)" }}>Items</h2>
        {order.items?.map((it) => (
          <div className="ln" key={it.id}>
            <span>{it.quantity} × {it.name ?? "Item"}</span>
            <span>{formatCurrency((it.subtotal ?? it.unit_price * it.quantity) || 0)}</span>
          </div>
        ))}

        {payments && payments.length > 0 && (
          <>
            <h2 style={{ fontSize: 24, marginTop: 40, paddingBottom: 8, borderBottom: "1px solid var(--ink)" }}>Payments</h2>
            {payments.map((p) => (
              <div className="ln" key={p.id}>
                <span>{p.method ?? "Payment"} · {p.status}</span>
                <span>{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
          {canCancel && <button className="po-btn ghost" onClick={() => cancel.mutate()} disabled={cancel.isPending}>{cancel.isPending ? "Cancelling…" : "Cancel order"}</button>}
          {canReview && <button className="po-btn" onClick={() => setReviewOpen(true)}>Review this kitchen</button>}
          {!canCancel && !canReview && <p className="hint">This order can no longer be cancelled.</p>}
        </div>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review this kitchen</DialogTitle></DialogHeader>
          <div className="po" style={{ padding: "0 2px" }}>
            <label className="l" style={{ marginTop: 0 }}>Rating</label>
            <div style={{ display: "flex", gap: 8 }} role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} out of 5`} onClick={() => setRating(n)}
                  className="step" style={{ width: 40, height: 40, background: n <= rating ? "var(--ink)" : "none", color: n <= rating ? "var(--paper)" : "inherit" }}>{n}</button>
              ))}
            </div>
            <label className="l" htmlFor="cmt">Comment (optional)</label>
            <textarea id="cmt" className="fld" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <DialogFooter>
            <button className="po po-btn ghost" onClick={() => setReviewOpen(false)}>Cancel</button>
            <button className="po po-btn" onClick={() => submitReview.mutate()} disabled={submitReview.isPending}>{submitReview.isPending ? "Submitting…" : "Submit review"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
