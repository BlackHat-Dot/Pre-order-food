import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Gift, Sparkles, ArrowRight, CheckCircle } from "lucide-react";
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
import { loyaltyApi, ordersApi, paymentsApi, shopsApi } from "@/lib/api";
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

// ==========================================
// ENGAGING, PREMIUM "FREE ORDER" SUCCESS MODAL
// ==========================================
interface FreeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
}

function FreeOrderSuccessModal({ isOpen, onClose, shopName }: FreeOrderModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md border-none bg-gradient-to-b from-emerald-500/10 to-background p-6 text-center shadow-2xl rounded-2xl overflow-hidden relative">
        <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none animate-pulse" />
        <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-primary/15 blur-2xl pointer-events-none" />

        <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transform transition-transform hover:scale-110 duration-200">
            <Gift className="h-8 w-8 animate-bounce" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center justify-center gap-1.5">
              It's on the house! <Sparkles className="h-5 w-5 text-amber-400 fill-amber-400" />
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Your loyalty points fully covered this meal from <span className="font-semibold text-foreground">{shopName}</span>.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mx-auto">
            <CheckCircle className="h-3.5 w-3.5" /> Free Order Placed Successfully
          </div>

          <div className="pt-2">
            <Button 
              onClick={onClose} 
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              Track Your Order <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckoutPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { lines, total, count } = useCart();
  const shopId = lines[0]?.shop_id;
  const [notes, setNotes] = useState("");
  const [pickup, setPickup] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [providerOrderId, setProviderOrderId] = useState<string | null>(null);
  const [providerPaymentId, setProviderPaymentId] = useState<string | null>(null);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState<string>("");
  const [finalAmount, setFinalAmount] = useState<number>(0);
  
  // Free order state tracking node
  const [freeOrderShopName, setFreeOrderShopName] = useState<string | null>(null);
  const [freeOrderId, setFreeOrderId] = useState<string | null>(null);

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

  const shopDiscount = (shop as any)?.loyalty_discount_per_point ?? 0.1;
  const loyaltyBalance = (loyalty as any)?.points_balance ?? (loyalty as any)?.points ?? 0;

  const discountPerPoint = shopDiscount;
  const maxRedeemByTotal = Math.floor(total / Math.max(discountPerPoint, 0.01));
  const parsedRedeemPoints = Math.max(0, parseInt(redeemPoints, 10) || 0);
  const appliedRedeemPoints = useLoyalty ? Math.min(parsedRedeemPoints, loyaltyBalance, maxRedeemByTotal) : 0;
  const loyaltyDiscount = appliedRedeemPoints * discountPerPoint;
  const payableTotal = Math.max(total - loyaltyDiscount, 0);
  const estimatedEarn = Math.floor(payableTotal * 0.05);

  const cancelOrder = useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onError: () => {},
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      const payload: any = {
        shop_id: shopId!,
        items: lines.map((l) => ({
          item_id: l.item_id,
          variant_id: l.variant_id ?? undefined,
          quantity: l.quantity,
        })),
        instructions: notes || undefined,    
        scheduled_at: pickup || undefined,   
        redeem_loyalty_points: appliedRedeemPoints,
        payment_method: payableTotal === 0 ? "loyalty" : "online", // Intelligent adjustment for full conversions
      };
      
      const order = await ordersApi.create(payload);
      return order;
    },

    onSuccess: async (order: any) => {
      // 🚨 INTERCEPT POINT 1: If payableTotal is zero, trigger the free experience directly
      if (payableTotal === 0) {
        try {
          // Verify with the backend that the 0-amount transaction is fully confirmed
          await paymentsApi.create({ order_id: order.id });
          await paymentsApi.verify({
            order_id: order.id,
            provider_order_id: `loyalty_free_${order.id}`,
            provider_payment_id: `loyalty_pay_${order.id}`,
            signature: "free_loyalty_signature",
          } as any);

          // Fire off success states cleanly
          setFreeOrderShopName((shop as any)?.name ?? "the shop");
          setFreeOrderId(order.id);
          cart.clear();
          qc.invalidateQueries({ queryKey: ["my-orders"] });
        } catch (err) {
          await ordersApi.cancel(order.id).catch(() => {});
          toast.error("Failed to complete loyalty voucher deduction.");
        }
        return;
      }

      // Fallback for normal transaction verification routes
      try {
        const pay: any = await paymentsApi.create({ order_id: order.id });
        setFinalAmount(order.total_price ?? order.total_amount ?? 0); 
        setPendingOrderId(order.id);
        setProviderOrderId(pay.provider_order_id || `mock_order_${order.id}`);
        setProviderPaymentId(pay.provider_payment_id || `mock_pay_${order.id}`);
      } catch (err) {
        await ordersApi.cancel(order.id).catch(() => {});
        toast.error(err instanceof Error ? err.message : "Failed to start payment");
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Order failed"),
  });

  const verify = useMutation({
    mutationFn: async () => {
      await paymentsApi.verify({
        order_id: pendingOrderId!,
        provider_order_id: providerOrderId || `mock_order_${pendingOrderId}`,
        provider_payment_id: providerPaymentId || `mock_pay_${pendingOrderId}`,
        signature: "mock_signature",
      } as any);
    },
    onSuccess: () => {
      toast.success("Payment confirmed");
      cart.clear();
      const id = pendingOrderId!;
      setPendingOrderId(null);
      navigate({ to: "/orders/$orderId", params: { orderId: id } });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Verification failed"),
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

  if (count === 0 && !freeOrderId) {
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
                <p className="text-lg font-semibold">{(shop as any)?.name ?? "Shop"}</p>
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
                    Shop loyalty balance: <span className="font-semibold text-primary">{loyaltyBalance}</span> points
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
                      <Label>Points to use (max {Math.min(loyaltyBalance, maxRedeemByTotal)})</Label>
                      <Input
                        type="number"
                        min={0}
                        max={Math.min(loyaltyBalance, maxRedeemByTotal)}
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
              {shop && !(shop as any).is_verified && (
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
                ={lines.map((l) => (
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
                <div className="flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Loyalty discount ({appliedRedeemPoints} points)</span>
                  <span>-{formatCurrency(loyaltyDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Payable</span>
                <span className={payableTotal === 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}>
                  {payableTotal === 0 ? "FREE" : formatCurrency(payableTotal)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                You will earn approximately <span className="font-semibold text-primary">{estimatedEarn}</span> shop loyalty points after payment.
              </p>
              <Button
                className={`w-full ${payableTotal === 0 ? "bg-emerald-600 hover:bg-emerald-500 text-white" : ""}`}
                size="lg"
                disabled={placeOrder.isPending}
                onClick={() => placeOrder.mutate()}
              >
                {placeOrder.isPending ? "Placing order…" : payableTotal === 0 ? "Claim Free Order! 🎉" : "Place order & pay"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Standard Demo Payment Confirmation Prompt Dialog */}
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
              <span className="font-semibold">{formatCurrency(finalAmount)}</span> 
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="max-w-[200px] truncate font-mono text-xs">
                {providerPaymentId || "mock_payment"}
              </span>
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

      {/* 🚨 INTERCEPT POINT 2: Free Order Success Pop-up Modal Rendering Asset */}
      <FreeOrderSuccessModal
        isOpen={!!freeOrderId}
        shopName={freeOrderShopName || ""}
        onClose={() => {
          const targetId = freeOrderId!;
          setFreeOrderId(null);
          setFreeOrderShopName(null);
          navigate({ to: "/orders/$orderId", params: { orderId: targetId } });
        }}
      />
    </div>
  );
}