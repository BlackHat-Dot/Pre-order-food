import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PublicNav } from "@/components/app/PublicNav";
import { useCart, cart } from "@/lib/cart";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { ApiError, loyaltyApi, ordersApi, paymentsApi, shopsApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

function CheckoutPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { lines, total, count } = useCart();
  const shopId = lines[0]?.shop_id;
  const [notes, setNotes] = useState("");
  const [pickup, setPickup] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [providerOrderId, setProviderOrderId] = useState<string | null>(null);
  const [providerPaymentId, setProviderPaymentId] = useState<string | null>(null);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: shop } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => shopsApi.get(shopId!),
    enabled: !!shopId,
  });
  const { data: loyalty } = useQuery({
    queryKey: ["loyalty", "me"],
    queryFn: () => loyaltyApi.me(shopId!),
    enabled: !!user && !!shopId,
  });

  const discountPerPoint = shop?.loyalty_discount_per_point ?? 0.1;
  const maxRedeemByTotal = Math.floor(total / Math.max(discountPerPoint, 0.01));
  const parsedRedeemPoints = Math.max(0, parseInt(redeemPoints, 10) || 0);
  const appliedRedeemPoints = useLoyalty ? Math.min(parsedRedeemPoints, loyalty?.points ?? 0, maxRedeemByTotal) : 0;
  const loyaltyDiscount = appliedRedeemPoints * discountPerPoint;
  const payableTotal = Math.max(total - loyaltyDiscount, 0);
  const estimatedEarn = Math.floor(payableTotal * 0.05);

  const cancelOrder = useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onError: () => {},
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      const order = await ordersApi.create({
        shop_id: shopId!,
        items: lines.map((l) => ({
          item_id: l.item_id,
          variant_id: l.variant_id ?? undefined,
          quantity: l.quantity,
          notes: l.notes,
        })),
        notes: notes || undefined,
        pickup_time: pickup || undefined,
        redeem_loyalty_points: appliedRedeemPoints,
      });
      return order;
    },
    onSuccess: async (order) => {
      try {
        const pay = await paymentsApi.create({ order_id: order.id });
        setPendingOrderId(order.id);
        setProviderOrderId(pay.provider_order_id ?? null);
        setProviderPaymentId(pay.provider_payment_id ?? `mock_pay_${order.id}`);
      } catch (err) {
        await ordersApi.cancel(order.id).catch(() => {});
        toast.error(err instanceof ApiError ? err.message : "Failed to start payment");
      }
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Order failed"),
  });

  const verify = useMutation({
    mutationFn: async () => {
      if (!pendingOrderId || !providerOrderId || !providerPaymentId) {
        throw new ApiError(400, "Invalid payment state");
      }
      await paymentsApi.verify({
        order_id: pendingOrderId,
        provider_order_id: providerOrderId,
        provider_payment_id: providerPaymentId,
        signature: "mock_signature",
      });
    },
    onSuccess: () => {
      toast.success("Payment confirmed");
      cart.clear();
      const id = pendingOrderId!;
      setPendingOrderId(null);
      navigate({ to: "/orders/$orderId", params: { orderId: id } });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Verification failed"),
  });

  function handleDialogOpenChange(open: boolean) {
    if (!open && pendingOrderId) {
      cancelOrder.mutate(pendingOrderId);
      setPendingOrderId(null);
      setProviderOrderId(null);
      setProviderPaymentId(null);
      toast.info("Order cancelled — payment was not completed.");
    }
  }

  if (count === 0) {
    return (
      <div className="po" style={{ minHeight: "100vh" }}>
        <PublicNav />
        <div className="wrap">
          <h1 style={{ fontSize: 56 }}>Nothing to check out.</h1>
          <Link to="/" className="po-btn" style={{ marginTop: 24 }}>Find a kitchen</Link>
        </div>
      </div>
    );
  }
  const maxPts = Math.min(loyalty?.points ?? 0, maxRedeemByTotal);

  return (
    <div className="po" style={{ minHeight: "100vh" }}>
      <PublicNav />
      <div className="wrap">
        <Link to="/cart" className="hint">← Back to cart</Link>
        <h1 style={{ fontSize: "clamp(40px,6vw,72px)", marginTop: 12 }}>Checkout</h1>
        <p className="hint" style={{ fontSize: 17, marginTop: 12 }}>Ordering from <strong style={{ color: "var(--ink)" }}>{shop?.name ?? "this kitchen"}</strong></p>
        {!shop?.is_verified && shop && (
          <p style={{ marginTop: 16, borderLeft: "3px solid var(--sig)", paddingLeft: 12 }}>This kitchen has not been verified by an admin. You can still order, but check the details first.</p>
        )}
        <div className="split" style={{ marginTop: 32 }}>
          <div style={{ borderTop: "1px solid var(--ink)" }}>
            <label className="l" htmlFor="pickup">Pickup time (optional)</label>
            <input id="pickup" className="fld" type="datetime-local" value={pickup} onChange={(e) => setPickup(e.target.value)} />
            <label className="l" htmlFor="notes">Notes for the kitchen (optional)</label>
            <textarea id="notes" className="fld" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, preferences" />
            {loyalty && (
              <div style={{ marginTop: 28, borderTop: "1px solid var(--rule)", paddingTop: 16 }}>
                <p className="disp" style={{ fontSize: 20 }}>Loyalty points: {loyalty.points}</p>
                <p className="hint">At this kitchen, 1 point takes off {formatCurrency(discountPerPoint)}.</p>
                <label style={{ display: "flex", gap: 10, marginTop: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={useLoyalty} onChange={(e) => { setUseLoyalty(e.target.checked); setRedeemPoints(""); }} />
                  Use points on this order
                </label>
                {useLoyalty && (
                  <>
                    <label className="l" htmlFor="pts">Points to use (up to {maxPts})</label>
                    <input id="pts" className="fld" type="number" min={0} max={maxPts} value={redeemPoints} placeholder="0" onChange={(e) => setRedeemPoints(e.target.value.replace(/^0+(?=\d)/, ""))} />
                  </>
                )}
              </div>
            )}
          </div>
          <div style={{ borderTop: "1px solid var(--ink)" }}>
            {lines.map((l) => (
              <div className="ln" key={`${l.item_id}-${l.variant_id ?? "_"}`}>
                <span>{l.quantity} × {l.name}{l.variant_name ? ` (${l.variant_name})` : ""}</span>
                <span>{formatCurrency(l.unit_price * l.quantity)}</span>
              </div>
            ))}
            <div className="ln"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
            {appliedRedeemPoints > 0 && <div className="ln" style={{ color: "var(--ok)" }}><span>Loyalty ({appliedRedeemPoints} points)</span><span>−{formatCurrency(loyaltyDiscount)}</span></div>}
            <div className="ln" style={{ border: 0 }}><span className="disp" style={{ fontSize: 24 }}>Payable</span><span className="disp" style={{ fontSize: 24 }}>{formatCurrency(payableTotal)}</span></div>
            <p className="hint">You will earn about {estimatedEarn} points at this kitchen after payment.</p>
            <button className="po-btn" style={{ marginTop: 20, width: "100%", justifyContent: "center" }} disabled={placeOrder.isPending} onClick={() => placeOrder.mutate()}>
              {placeOrder.isPending ? "Placing order…" : "Place order and pay"}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={!!pendingOrderId} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm payment</DialogTitle>
            <DialogDescription>This is a demo payment. Confirming marks it as paid. Closing this window cancels the order.</DialogDescription>
          </DialogHeader>
          <div className="po" style={{ padding: "4px 0" }}>
            <div className="ln"><span>Amount</span><strong>{formatCurrency(payableTotal)}</strong></div>
            <div className="ln"><span>Reference</span><span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", fontFamily: "monospace", fontSize: 12 }}>{providerPaymentId}</span></div>
          </div>
          <DialogFooter>
            <button className="po-btn ghost po" onClick={() => handleDialogOpenChange(false)}>Cancel order</button>
            <button className="po-btn po" onClick={() => verify.mutate()} disabled={verify.isPending}>{verify.isPending ? "Verifying…" : "Confirm payment"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
