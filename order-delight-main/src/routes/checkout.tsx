import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Gift, Sparkles, ArrowRight, CheckCircle, Info, Tag, MapPin, PlusCircle, CheckCircle2 } from "lucide-react";
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
import { ordersApi, paymentsApi, shopsApi, apiRequest } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

// ==========================================
// 1. ENGAGING, PREMIUM "FREE ORDER" SUCCESS MODAL
// ==========================================
interface FreeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
  couponCode?: string;
  couponDiscountUsed: number;
  leftoverBalance?: number;
}

function FreeOrderSuccessModal({ 
  isOpen, 
  onClose, 
  shopName, 
  couponCode, 
  couponDiscountUsed,
  leftoverBalance = 0 
}: FreeOrderModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md border-none bg-gradient-to-b from-emerald-500/10 to-background p-6 text-center shadow-2xl rounded-2xl overflow-hidden relative">
        <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none animate-pulse" />
        <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-primary/15 blur-2xl pointer-events-none" />

        <div className="space-y-6 py-2 animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transform transition-transform hover:scale-110 duration-200">
            <Gift className="h-7 w-7 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center justify-center gap-1.5">
              Invoice Settled! <Sparkles className="h-5 w-5 text-amber-400 fill-amber-400" />
            </h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Your transaction at <span className="font-semibold text-foreground">{shopName}</span> has been completely covered by your gift voucher.
            </p>
          </div>

          {couponCode && (
            <div className="rounded-xl bg-muted/50 border border-border/80 p-3.5 text-left space-y-2.5 max-w-xs mx-auto shadow-inner">
              <div className="flex justify-between items-center text-[11px] text-muted-foreground font-medium">
                <span>Voucher Reference</span>
                <code className="font-mono bg-background px-2 py-0.5 rounded border border-border font-bold text-primary tracking-wider uppercase text-[10px]">
                  {couponCode}
                </code>
              </div>
              <div className="h-px bg-border/60" />
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-muted-foreground font-normal">Redeemed This Order</span>
                <span className="text-foreground">{formatCurrency(couponDiscountUsed)}</span>
              </div>
              {leftoverBalance > 0 && (
                <div className="flex justify-between items-center text-xs font-bold bg-emerald-500/10 dark:bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/20 mt-1">
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">Remaining Coupon Value</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(leftoverBalance)}</span>
                </div>
              )}
            </div>
          )}

          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mx-auto">
            <CheckCircle className="h-3.5 w-3.5" /> Order Successfully Processed
          </div>

          <div className="pt-2">
            <Button 
              onClick={onClose} 
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              Track Order Real-Time <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 2. INTERACTIVE ADDRESS SELECTION MODULE
// ==========================================
function CheckoutAddressModule({ onAddressSelected }: { onAddressSelected: (id: string | null) => void }) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  const [title, setTitle] = useState("Home");
  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");

  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses", "me"],
    queryFn: () => apiRequest<any[]>("/api/v1/addresses", { method: "GET" })
  });

  useEffect(() => {
    if (addresses.length > 0 && !selectedId) {
      const defaultAddr = addresses.find((a: any) => a.is_default) || addresses[0];
      setSelectedId(defaultAddr.id);
      onAddressSelected(defaultAddr.id);
    } else if (addresses.length === 0) {
      onAddressSelected(null);
    }
  }, [addresses, selectedId, onAddressSelected]);

  const addAddressMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/v1/addresses", {
        method: "POST",
        body: { title, address_line: addressLine, landmark: landmark || undefined }
      });
    },
    onSuccess: () => {
      toast.success("New location profile added");
      setIsAddingNew(false);
      setAddressLine("");
      setLandmark("");
      qc.invalidateQueries({ queryKey: ["addresses", "me"] });
    }
  });

  const changeDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/v1/addresses/${id}/default`, { method: "PUT" });
    },
    onSuccess: () => {
      toast.success("Default address updated");
      qc.invalidateQueries({ queryKey: ["addresses", "me"] });
    }
  });

  return (
    <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm tracking-tight text-foreground">Delivery Address</h3>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/60 hover:text-foreground outline-none transition-colors">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3 bg-popover border text-popover-foreground rounded-xl shadow-xl space-y-1">
                <p className="text-xs font-bold">💡 Quick Checkout Tip:</p>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Setting a default address bypasses manual selections and fills in your delivery point automatically on future orders!
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {addresses.length > 0 && !isAddingNew && (
          <div className="grid gap-2.5">
            {addresses.map((addr: any) => {
              const isSelected = selectedId === addr.id;
              return (
                <div 
                  key={addr.id}
                  onClick={() => {
                    setSelectedId(addr.id);
                    onAddressSelected(addr.id);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col gap-1 text-left ${
                    isSelected ? "bg-primary/5 border-primary shadow-sm" : "bg-card/40 hover:bg-card/80 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {addr.title}
                    </span>
                    <div className="flex items-center gap-2">
                      {addr.is_default ? (
                        <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                          Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            changeDefaultMutation.mutate(addr.id);
                          }}
                          className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium underline"
                        >
                          Make Default
                        </button>
                      )}
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  </div>
                  <p className="text-xs text-foreground font-medium leading-relaxed mt-1">
                    {addr.address_line}
                  </p>
                  {addr.landmark && (
                    <p className="text-[11px] text-muted-foreground">Landmark: {addr.landmark}</p>
                  )}
                </div>
              );
            })}
            
            <Button 
              type="button" 
              variant="outline" 
              className="h-10 rounded-xl text-xs font-medium gap-1.5 mt-1 border-dashed"
              onClick={() => setIsAddingNew(true)}
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Another Location
            </Button>
          </div>
        )}

        {(addresses.length === 0 || isAddingNew) && (
          <div className="border border-border p-4 rounded-xl bg-muted/30 space-y-3 animate-in fade-in-50 duration-200">
            <p className="text-xs font-bold text-foreground">Create New Address Profile</p>
            <div className="space-y-2.5">
              <div>
                <Label className="text-[11px] text-muted-foreground">Label</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 rounded-lg mt-1 text-xs" placeholder="Home, Office, etc." />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Full Address</Label>
                <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} className="h-9 rounded-lg mt-1 text-xs" placeholder="Door No, Street Name, Area..." />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Landmark (Optional)</Label>
                <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} className="h-9 rounded-lg mt-1 text-xs" placeholder="Opposite Metro Station..." />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              {addresses.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => setIsAddingNew(false)} className="h-8 text-xs rounded-lg">Cancel</Button>
              )}
              <Button 
                type="button" 
                disabled={!addressLine || addAddressMutation.isPending}
                onClick={() => addAddressMutation.mutate()} 
                className="h-8 text-xs rounded-lg font-semibold px-4"
              >
                {addAddressMutation.isPending ? "Saving..." : "Save Address"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// 3. MAIN CHECKOUT PAGE
// ==========================================
function CheckoutPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { lines, total, count } = useCart();
  const shopId = lines[0]?.shop_id;
  
  const [notes, setNotes] = useState("");
  const [pickup, setPickup] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [providerOrderId, setProviderOrderId] = useState<string | null>(null);
  const [providerPaymentId, setProviderPaymentId] = useState<string | null>(null);
  const [finalAmount, setFinalAmount] = useState<number>(0);
  
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

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

  const couponDiscount = appliedCoupon ? appliedCoupon.discount_value : 0;
  
  const payableTotal = Math.max(total - couponDiscount, 0);
  const estimatedEarn = Math.floor(payableTotal * 0.05);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const couponData = await apiRequest<any>(`/api/v1/coupons/validate/${couponCode.trim()}?shop_id=${shopId}`, {
        method: "GET"
      });
      setAppliedCoupon(couponData);
      toast.success(`Coupon code applied: ${formatCurrency(couponData.discount_value)} discount added!`);
    } catch (err: any) {
      toast.error(err?.message || "Invalid or unresolvable shop voucher code.");
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

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
        delivery_address_id: selectedAddressId, 
        coupon_id: appliedCoupon ? appliedCoupon.id : undefined,
        payment_method: "online",
      };
      
      return await ordersApi.create(payload);
    },
    onSuccess: async (order: any) => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      qc.invalidateQueries({ queryKey: ["coupon"] });
      if (appliedCoupon?.code) {
        qc.invalidateQueries({ queryKey: ["coupons", "validate", appliedCoupon.code] });
      }

      setAppliedCoupon(null);
      setCouponCode("");

      if (payableTotal === 0) {
        setFreeOrderShopName((shop as any)?.name ?? "the shop");
        setFreeOrderId(order.id);
        cart.clear();
        qc.invalidateQueries({ queryKey: ["my-orders"] });
        return;
      }

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
          <div className="space-y-4">
            
            <CheckoutAddressModule onAddressSelected={setSelectedAddressId} />

            <Card>
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-sm text-muted-foreground">Ordering from</p>
                  <p className="text-lg font-semibold">{(shop as any)?.name ?? "Shop"}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup">Scheduled Time (optional)</Label>
                  <Input
                    id="pickup"
                    type="datetime-local"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes for the kitchen (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Allergies, extra spicy, etc."
                  />
                </div>
                {shop && !(shop as any).is_verified && (
                  <p className="text-sm text-destructive">
                    Warning: This shop is not admin-verified. Order at your own risk.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-bold text-foreground">Have a Gift Coupon Voucher?</Label>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/60 hover:text-foreground outline-none transition-colors">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="p-3 max-w-xs space-y-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl">
                        <p className="text-xs font-bold">🎟️ Shared Discounts:</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          You can convert your loyalty points into a code voucher inside your <Link to="/loyalty" className="text-primary font-semibold underline">Loyalty Wallet</Link>.
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium leading-relaxed">
                          Vouchers are public! If you don't have points, a friend can generate a code from their account and send it to you to apply here.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. CHET-A8F2NB"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={!!appliedCoupon || isValidatingCoupon}
                    className="font-mono tracking-wider h-10 rounded-xl focus-visible:ring-primary uppercase"
                  />
                  {appliedCoupon ? (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                      className="h-10 rounded-xl text-xs font-medium px-4"
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      onClick={handleApplyCoupon}
                      disabled={isValidatingCoupon || !couponCode.trim()}
                      className="h-10 rounded-xl text-xs px-5 font-semibold"
                    >
                      {isValidatingCoupon ? "Checking..." : "Apply"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

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
              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Voucher Discount</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Payable</span>
                <span className={payableTotal === 0 ? "text-emerald-600 dark:text-emerald-400 font-black tracking-tight animate-pulse" : ""}>
                  {payableTotal === 0 ? "FREE" : formatCurrency(payableTotal)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                You will earn approximately <span className="font-semibold text-primary">{estimatedEarn}</span> shop loyalty points after payment.
              </p>
              
              <Button
                className={`w-full ${payableTotal === 0 && selectedAddressId ? "bg-emerald-600 hover:bg-emerald-500 text-white font-bold" : ""}`}
                size="lg"
                disabled={placeOrder.isPending || !selectedAddressId}
                onClick={() => placeOrder.mutate()}
              >
                {!selectedAddressId 
                  ? "Select Delivery Address" 
                  : placeOrder.isPending 
                    ? "Placing order…" 
                    : payableTotal === 0 
                      ? "Claim Free Order! 🎉" 
                      : "Place order & pay"}
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

      <FreeOrderSuccessModal
        isOpen={!!freeOrderId}
        shopName={freeOrderShopName || ""}
        couponCode={appliedCoupon?.code}
        couponDiscountUsed={total} 
        leftoverBalance={appliedCoupon ? Math.max(0, appliedCoupon.discount_value - total) : 0}
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