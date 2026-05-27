import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Gift, Sparkles, CheckCircle, Info, Tag, MapPin, PlusCircle, CheckCircle2, Bike, Utensils, Coins, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { PublicNav } from "@/components/app/PublicNav";
import { useCart, cart } from "@/lib/cart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { shopsApi, apiRequest } from "@/lib/api";
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
// 1. INTERACTIVE ADDRESS SELECTION MODULE
// ==========================================
function CheckoutAddressModule({ onAddressSelected, disabled }: { onAddressSelected: (id: string | null) => void; disabled?: boolean }) {
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

  if (disabled) return null;

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
                  box-id={addr.id}
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
                        <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">Default</span>
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
// 2. MAIN CHECKOUT PAGE
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

  const [orderType, setOrderType] = useState<"delivery" | "table_booking">("delivery");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");

  const [showPaymentGatewayModal, setShowPaymentGatewayModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: shop } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => shopsApi.get(shopId!),
    enabled: !!shopId,
  });

  const couponDiscount = appliedCoupon ? Math.min(total, appliedCoupon.discount_value) : 0;
  const payableTotal = Math.max(total - couponDiscount, 0);
  const estimatedEarn = Math.floor(payableTotal * 0.05);

  const combinedPaymentLabel = appliedCoupon 
    ? payableTotal === 0 
      ? "COUPON VOUCHER" 
      : `SPLIT (${paymentMethod.toUpperCase()} + COUPON)`
    : paymentMethod.toUpperCase();

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

  const placePaidOrderMutation = useMutation({
    mutationFn: async () => {
      const isOnlinePay = paymentMethod === "online" && payableTotal > 0;
      
      const payload: any = {
        shop_id: shopId!,
        items: lines.map((l) => ({
          item_id: l.item_id,
          variant_id: l.variant_id ?? undefined,
          quantity: l.quantity,
        })),
        instructions: notes || undefined,    
        scheduled_at: pickup || undefined,
        delivery_address_id: orderType === "delivery" ? selectedAddressId : null, 
        coupon_id: appliedCoupon ? appliedCoupon.id : undefined,
        payment_method: paymentMethod,
        order_type: orderType,
        payment_confirmed: isOnlinePay ? true : false, 
      };
      
      return await apiRequest<any>("/api/v1/orders", {
        method: "POST",
        body: payload
      });
    },
    onSuccess: async (order: any) => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      qc.invalidateQueries({ queryKey: ["coupon"] });
      
      setAppliedCoupon(null);
      setCouponCode("");
      cart.clear();
      qc.invalidateQueries({ queryKey: ["my-orders"] });
      setShowPaymentGatewayModal(false);

      // ─── 🚀 IMMEDATE ROUTE SUCCESS REDIRECT ───
      toast.success("Order placed successfully!");
      navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to complete checkout processing payload parameters.");
    }
  });

  function handleCheckoutClick() {
    if (paymentMethod === "online" && payableTotal > 0) {
      setShowPaymentGatewayModal(true);
    } else {
      placePaidOrderMutation.mutate();
    }
  }

  const isFormValid = orderType === "table_booking" || !!selectedAddressId;

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
          <div className="space-y-4">
            <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5 space-y-3 text-left">
                <div className="flex items-center gap-1.5">
                  <Utensils className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-bold text-foreground">Fulfillment Choice</Label>
                </div>
                <RadioGroup value={orderType} onValueChange={(v: any) => setOrderType(v)} className="grid grid-cols-2 gap-3">
                  <div>
                    <RadioGroupItem value="delivery" id="delivery" className="sr-only" />
                    <Label htmlFor="delivery" className={`flex flex-col items-center justify-between rounded-xl border-2 p-3.5 cursor-pointer text-center transition-all ${orderType === "delivery" ? "border-primary bg-primary/5 font-semibold" : "border-border/60"}`}>
                      <Bike className="h-5 w-5 mb-1 text-primary" />
                      <span className="text-xs">Food Delivery</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="table_booking" id="table_booking" className="sr-only" />
                    <Label htmlFor="table_booking" className={`flex flex-col items-center justify-between rounded-xl border-2 p-3.5 cursor-pointer text-center transition-all ${orderType === "table_booking" ? "border-primary bg-primary/5 font-semibold" : "border-border/60"}`}>
                      <Utensils className="h-5 w-5 mb-1 text-muted-foreground" />
                      <span className="text-xs">Book a Table</span>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <CheckoutAddressModule onAddressSelected={setSelectedAddressId} disabled={orderType === "table_booking"} />

            <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-5 space-y-3 text-left">
                <div className="flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-bold text-foreground">
                    {payableTotal === 0 ? "Select Payment Mode" : "Settle Remaining Balance Via"}
                  </Label>
                </div>
                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-2 gap-3">
                  <div>
                    <RadioGroupItem value="cod" id="cod" className="sr-only" />
                    <Label htmlFor="cod" className={`flex flex-col items-center justify-between rounded-xl border-2 p-3.5 cursor-pointer text-center transition-all ${payableTotal === 0 ? "opacity-50 pointer-events-none" : ""} ${paymentMethod === "cod" ? "border-primary bg-primary/5 font-semibold" : "border-border/60"}`}>
                      <Coins className="h-5 w-5 mb-1 text-primary" />
                      <span className="text-xs">Cash on Delivery</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="online" id="online" className="sr-only" />
                    <Label htmlFor="online" className={`flex flex-col items-center justify-between rounded-xl border-2 p-3.5 cursor-pointer text-center transition-all ${payableTotal === 0 ? "opacity-50 pointer-events-none" : ""} ${paymentMethod === "online" ? "border-primary bg-primary/5 font-semibold" : "border-border/60"}`}>
                      <CreditCard className="h-5 w-5 mb-1 text-primary" />
                      <span className="text-xs">Online Banking</span>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Ordering from</p>
                  <p className="text-lg font-semibold">{(shop as any)?.name ?? "Shop"}</p>
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="pickup">
                    {orderType === "table_booking" ? "Table Reservation Timing Slot" : "Scheduled Delivery Time (optional)"}
                  </Label>
                  <Input id="pickup" type="datetime-local" value={pickup} onChange={(e) => setPickup(e.target.value)} />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="notes">Notes for the kitchen / host (optional)</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, extra spicy, etc." />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-4 space-y-3 text-left">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-bold text-foreground">Have a Gift Coupon Voucher?</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. CHET-A8F2NB"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={!!appliedCoupon || isValidatingCoupon}
                    className="font-mono tracking-wider h-10 rounded-xl text-xs uppercase"
                  />
                  {appliedCoupon ? (
                    <Button type="button" variant="destructive" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="h-10 rounded-xl text-xs">Remove</Button>
                  ) : (
                    <Button type="button" onClick={handleApplyCoupon} disabled={isValidatingCoupon || !couponCode.trim()} className="h-10 rounded-xl text-xs px-5">Apply</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit text-left">
            <CardContent className="space-y-3 p-6">
              <h3 className="font-semibold text-sm">Order Summary</h3>
              <div className="space-y-1.5 text-xs">
                {lines.map((l) => (
                  <div key={`${l.item_id}-${l.variant_id ?? "_"}`} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{l.quantity} × {l.name}</span>
                    <span className="font-medium">{formatCurrency(l.unit_price * l.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
                <span>Items Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600 font-bold bg-emerald-500/5 p-2 rounded-lg">
                  <span>🎟️ Voucher Savings</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-2.5 text-base font-bold">
                <span>Payable Total</span>
                <span className={payableTotal === 0 ? "text-emerald-600" : ""}>
                  {payableTotal === 0 ? "FREE" : formatCurrency(payableTotal)}
                </span>
              </div>
              <Button
                className="w-full rounded-xl mt-2"
                size="lg"
                disabled={placePaidOrderMutation.isPending || !isFormValid}
                onClick={handleCheckoutClick}
              >
                {!isFormValid ? "Select Address" : placePaidOrderMutation.isPending ? "Processing..." : payableTotal === 0 ? "Claim Free Order!" : "Place Order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}