import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { PublicNav } from "@/components/app/PublicNav";
import { useCart, cart } from "@/lib/cart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";

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
        })),
        instructions: notes || undefined,    // <-- Map notes to instructions
        scheduled_at: pickup || undefined,   // <-- Map pickup to scheduled_at
        redeem_loyalty_points: appliedRedeemPoints,
        payment_method: "online",
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
      <div className="min-h-screen">
        <PublicNav />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link to="/" className="mt-4 inline-block">
            <Button>Browse shops</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link to="/cart" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to cart
        </Link>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Checkout</h1>

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-sm text-muted-foreground">Ordering from</p>
                <p className="text-lg font-semibold">{shop?.name ?? "Shop"}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup">Pickup time (optional)</Label>
                <Input
                  id="pickup"
                  type="datetime-local"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes for the shop (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Allergies, preferences, etc."
                />
              </div>
              {loyalty && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">
                    Shop loyalty balance: <span className="font-semibold text-primary">{loyalty.points}</span> points
                    · 1 point = {formatCurrency(discountPerPoint)} discount.
                  </p>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={useLoyalty}
                      onCheckedChange={(v) => {
                        setUseLoyalty(Boolean(v));
                        setRedeemPoints("");
                      }}
                    />
                    <span className="text-sm">Use loyalty points for this order (optional)</span>
                  </div>
                  {useLoyalty && (
                    <div className="space-y-1">
                      <Label>Points to use (max {Math.min(loyalty.points, maxRedeemByTotal)})</Label>
                      <Input
                        type="number"
                        min={0}
                        max={Math.min(loyalty.points, maxRedeemByTotal)}
                        value={redeemPoints}
                        placeholder="0"
                        onChange={(e) => {
                          const raw = e.target.value.replace(/^0+(?=\d)/, "");
                          setRedeemPoints(raw);
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
              {!shop?.is_verified && (
                <p className="text-sm text-destructive">
                  Warning: This shop is not admin-verified. Order at your own risk.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardContent className="space-y-3 p-6">
              <h3 className="font-semibold">Summary</h3>
              <div className="space-y-1.5 text-sm">
                {lines.map((l) => (
                  <div key={`${l.item_id}-${l.variant_id ?? "_"}`} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {l.quantity} × {l.name}
                      {l.variant_name ? ` (${l.variant_name})` : ""}
                    </span>
                    <span>{formatCurrency(l.unit_price * l.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {appliedRedeemPoints > 0 && (
                <div className="flex items-center justify-between text-sm text-success">
                  <span>Loyalty discount ({appliedRedeemPoints} points)</span>
                  <span>-{formatCurrency(loyaltyDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Payable</span>
                <span>{formatCurrency(payableTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                You will earn approximately <span className="font-semibold text-primary">{estimatedEarn}</span> shop loyalty points after payment.
              </p>
              <Button
                className="w-full"
                size="lg"
                disabled={placeOrder.isPending}
                onClick={() => placeOrder.mutate()}
              >
                {placeOrder.isPending ? "Placing order…" : "Place order & pay"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!pendingOrderId} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm payment</DialogTitle>
            <DialogDescription>
              This is a demo payment. Confirm to mark the payment as successful. Closing this dialog will cancel your order.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">{formatCurrency(payableTotal)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="max-w-[200px] truncate font-mono text-xs">{providerPaymentId}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleDialogOpenChange(false)}>
              Cancel order
            </Button>
            <Button onClick={() => verify.mutate()} disabled={verify.isPending}>
              {verify.isPending ? "Verifying…" : "Confirm payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
