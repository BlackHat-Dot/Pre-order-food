import { jsxs, jsx } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, Utensils, Bike, Coins, CreditCard, Tag, Info, MapPin, CheckCircle2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { P as PublicNav } from "./PublicNav-Ce66gdj8.js";
import { u as useCart, c as cart } from "./dropdown-menu-CRgp8eCB.js";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { u as useAuth, s as shopsApi, a as apiRequest, B as Button, T as Textarea, b as TooltipProvider, c as Tooltip, d as TooltipTrigger, e as TooltipContent, D as Dialog, f as DialogContent, g as DialogHeader, h as DialogTitle, i as DialogDescription, j as DialogFooter } from "./router-DQr6eapq.js";
import { I as Input } from "./input-B-ZXk5uj.js";
import { L as Label } from "./label-D-IOUQFS.js";
import { R as RadioGroup, a as RadioGroupItem } from "./radio-group-2MWZD7N6.js";
import { f as formatCurrency } from "./format-BBidFSeC.js";
import "./nav-CWlJKvXT.js";
import "@radix-ui/react-popover";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-label";
import "@radix-ui/react-radio-group";
function CheckoutAddressModule({
  onAddressSelected,
  disabled
}) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [title, setTitle] = useState("Home");
  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");
  const {
    data: addresses = []
  } = useQuery({
    queryKey: ["addresses", "me"],
    queryFn: () => apiRequest("/api/v1/addresses", {
      method: "GET"
    })
  });
  useEffect(() => {
    if (addresses.length > 0 && !selectedId) {
      const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
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
        body: {
          title,
          address_line: addressLine,
          landmark: landmark || void 0
        }
      });
    },
    onSuccess: () => {
      toast.success("New location profile added");
      setIsAddingNew(false);
      setAddressLine("");
      setLandmark("");
      qc.invalidateQueries({
        queryKey: ["addresses", "me"]
      });
    }
  });
  const changeDefaultMutation = useMutation({
    mutationFn: async (id) => {
      return await apiRequest(`/api/v1/addresses/${id}/default`, {
        method: "PUT"
      });
    },
    onSuccess: () => {
      toast.success("Default address updated");
      qc.invalidateQueries({
        queryKey: ["addresses", "me"]
      });
    }
  });
  if (disabled) return null;
  return /* @__PURE__ */ jsx(Card, { className: "border-border/60 shadow-sm rounded-2xl overflow-hidden", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-5 space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4 text-primary" }),
      /* @__PURE__ */ jsx("h3", { className: "font-bold text-sm tracking-tight text-foreground", children: "Delivery Address" }),
      /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsxs(Tooltip, { children: [
        /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx("button", { type: "button", className: "text-muted-foreground/60 hover:text-foreground outline-none transition-colors", children: /* @__PURE__ */ jsx(Info, { className: "h-3.5 w-3.5" }) }) }),
        /* @__PURE__ */ jsxs(TooltipContent, { className: "max-w-xs p-3 bg-popover border text-popover-foreground rounded-xl shadow-xl space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-bold", children: "💡 Quick Checkout Tip:" }),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground leading-normal", children: "Setting a default address bypasses manual selections and fills in your delivery point automatically on future orders!" })
        ] })
      ] }) })
    ] }),
    addresses.length > 0 && !isAddingNew && /* @__PURE__ */ jsxs("div", { className: "grid gap-2.5", children: [
      addresses.map((addr) => {
        const isSelected = selectedId === addr.id;
        return /* @__PURE__ */ jsxs("div", { "box-id": addr.id, onClick: () => {
          setSelectedId(addr.id);
          onAddressSelected(addr.id);
        }, className: `p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col gap-1 text-left ${isSelected ? "bg-primary/5 border-primary shadow-sm" : "bg-card/40 hover:bg-card/80 border-border"}`, children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold uppercase tracking-wider text-primary", children: addr.title }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              addr.is_default ? /* @__PURE__ */ jsx("span", { className: "text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20", children: "Default" }) : /* @__PURE__ */ jsx("button", { type: "button", onClick: (e) => {
                e.stopPropagation();
                changeDefaultMutation.mutate(addr.id);
              }, className: "text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium underline", children: "Make Default" }),
              isSelected && /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-primary shrink-0" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-foreground font-medium leading-relaxed mt-1", children: addr.address_line }),
          addr.landmark && /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
            "Landmark: ",
            addr.landmark
          ] })
        ] }, addr.id);
      }),
      /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", className: "h-10 rounded-xl text-xs font-medium gap-1.5 mt-1 border-dashed", onClick: () => setIsAddingNew(true), children: [
        /* @__PURE__ */ jsx(PlusCircle, { className: "h-3.5 w-3.5" }),
        " Add Another Location"
      ] })
    ] }),
    (addresses.length === 0 || isAddingNew) && /* @__PURE__ */ jsxs("div", { className: "border border-border p-4 rounded-xl bg-muted/30 space-y-3 animate-in fade-in-50 duration-200", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-bold text-foreground", children: "Create New Address Profile" }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2.5", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-[11px] text-muted-foreground", children: "Label" }),
          /* @__PURE__ */ jsx(Input, { value: title, onChange: (e) => setTitle(e.target.value), className: "h-9 rounded-lg mt-1 text-xs", placeholder: "Home, Office, etc." })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-[11px] text-muted-foreground", children: "Full Address" }),
          /* @__PURE__ */ jsx(Input, { value: addressLine, onChange: (e) => setAddressLine(e.target.value), className: "h-9 rounded-lg mt-1 text-xs", placeholder: "Door No, Street Name, Area..." })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-[11px] text-muted-foreground", children: "Landmark (Optional)" }),
          /* @__PURE__ */ jsx(Input, { value: landmark, onChange: (e) => setLandmark(e.target.value), className: "h-9 rounded-lg mt-1 text-xs", placeholder: "Opposite Metro Station..." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 justify-end pt-1", children: [
        addresses.length > 0 && /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", onClick: () => setIsAddingNew(false), className: "h-8 text-xs rounded-lg", children: "Cancel" }),
        /* @__PURE__ */ jsx(Button, { type: "button", disabled: !addressLine || addAddressMutation.isPending, onClick: () => addAddressMutation.mutate(), className: "h-8 text-xs rounded-lg font-semibold px-4", children: addAddressMutation.isPending ? "Saving..." : "Save Address" })
      ] })
    ] })
  ] }) });
}
function CheckoutPage() {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const {
    lines,
    total,
    count
  } = useCart();
  const shopId = lines[0]?.shop_id;
  const [notes, setNotes] = useState("");
  const [pickup, setPickup] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [orderType, setOrderType] = useState("delivery");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [showPaymentGatewayModal, setShowPaymentGatewayModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  useEffect(() => {
    if (!loading && !user) navigate({
      to: "/login"
    });
  }, [loading, user, navigate]);
  const {
    data: shop
  } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => shopsApi.get(shopId),
    enabled: !!shopId
  });
  const couponDiscount = appliedCoupon ? Math.min(total, appliedCoupon.discount_value) : 0;
  const payableTotal = Math.max(total - couponDiscount, 0);
  const estimatedEarn = Math.floor(payableTotal / 10);
  const combinedPaymentLabel = appliedCoupon ? payableTotal === 0 ? "COUPON VOUCHER" : `SPLIT (${paymentMethod.toUpperCase()} + COUPON)` : paymentMethod.toUpperCase();
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const couponData = await apiRequest(`/api/v1/coupons/validate/${couponCode.trim()}?shop_id=${shopId}&_t=${Date.now()}`, {
        method: "GET"
      });
      setAppliedCoupon(couponData);
      toast.success(`Coupon code applied: ${formatCurrency(couponData.discount_value)} discount added!`);
    } catch (err) {
      toast.error(err?.message || "Invalid or unresolvable shop voucher code.");
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };
  const placePaidOrderMutation = useMutation({
    mutationFn: async () => {
      const isOnlinePay = paymentMethod === "online" && payableTotal > 0;
      const payload = {
        shop_id: shopId,
        items: lines.map((l) => ({
          item_id: l.item_id,
          variant_id: l.variant_id ?? void 0,
          quantity: l.quantity
        })),
        instructions: notes || void 0,
        scheduled_at: pickup || void 0,
        delivery_address_id: orderType === "delivery" ? selectedAddressId : null,
        coupon_id: appliedCoupon ? appliedCoupon.id : void 0,
        payment_method: paymentMethod,
        order_type: orderType,
        payment_confirmed: isOnlinePay ? true : false
      };
      return await apiRequest("/api/v1/orders", {
        method: "POST",
        body: payload
      });
    },
    onSuccess: async (order) => {
      qc.invalidateQueries({
        queryKey: ["coupons"]
      });
      qc.invalidateQueries({
        queryKey: ["coupon"]
      });
      if (appliedCoupon?.code) {
        qc.invalidateQueries({
          queryKey: ["coupons", "validate", appliedCoupon.code]
        });
      }
      setAppliedCoupon(null);
      setCouponCode("");
      cart.clear();
      qc.invalidateQueries({
        queryKey: ["my-orders"]
      });
      setShowPaymentGatewayModal(false);
      if (payableTotal === 0) {
        toast.success("Free Order claimed and placed successfully!");
      } else {
        toast.success(paymentMethod === "online" ? "Payment confirmed & order successfully placed!" : "Order placed successfully!");
      }
      navigate({
        to: "/orders/$orderId",
        params: {
          orderId: order.id
        }
      });
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to complete checkout processing payload parameters.");
    }
  });
  function handleCheckoutClick() {
    if (payableTotal === 0) {
      placePaidOrderMutation.mutate();
    } else if (paymentMethod === "online") {
      setShowPaymentGatewayModal(true);
    } else {
      placePaidOrderMutation.mutate();
    }
  }
  const isFormValid = orderType === "table_booking" || !!selectedAddressId;
  if (count === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
      /* @__PURE__ */ jsx(PublicNav, {}),
      /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl px-4 py-16 text-center", children: [
        /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mb-4", children: "Your cart is empty." }),
        /* @__PURE__ */ jsx(Button, { onClick: () => navigate({
          to: "/"
        }), children: "Browse shops" })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx(PublicNav, {}),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl px-4 py-8 sm:px-6", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/cart", className: "mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground", children: [
        /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }),
        " Back to cart"
      ] }),
      /* @__PURE__ */ jsx("h1", { className: "mb-6 text-2xl font-bold tracking-tight", children: "Checkout" }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-6 md:grid-cols-[1fr_320px]", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsx(Card, { className: "border-border/60 shadow-sm rounded-2xl overflow-hidden", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-5 space-y-3 text-left", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Utensils, { className: "h-4 w-4 text-primary" }),
              /* @__PURE__ */ jsx(Label, { className: "text-sm font-bold text-foreground", children: "Fulfillment Choice" })
            ] }),
            /* @__PURE__ */ jsxs(RadioGroup, { value: orderType, onValueChange: (v) => setOrderType(v), className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(RadioGroupItem, { value: "delivery", id: "delivery", className: "sr-only" }),
                /* @__PURE__ */ jsxs(Label, { htmlFor: "delivery", className: `flex flex-col items-center justify-between rounded-xl border-2 p-3.5 bg-popover hover:bg-muted/50 cursor-pointer text-center transition-all ${orderType === "delivery" ? "border-primary bg-primary/5 font-semibold" : "border-border/60"}`, children: [
                  /* @__PURE__ */ jsx(Bike, { className: `h-5 w-5 mb-1 ${orderType === "delivery" ? "text-primary" : "text-muted-foreground"}` }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs", children: "Food Delivery" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(RadioGroupItem, { value: "table_booking", id: "table_booking", className: "sr-only" }),
                /* @__PURE__ */ jsxs(Label, { htmlFor: "table_booking", className: `flex flex-col items-center justify-between rounded-xl border-2 p-3.5 bg-popover hover:bg-muted/50 cursor-pointer text-center transition-all ${orderType === "table_booking" ? "border-primary bg-primary/5 font-semibold" : "border-border/60"}`, children: [
                  /* @__PURE__ */ jsx(Utensils, { className: `h-5 w-5 mb-1 ${orderType === "table_booking" ? "text-primary" : "text-muted-foreground"}` }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs", children: "Book a Table" })
                ] })
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(CheckoutAddressModule, { onAddressSelected: setSelectedAddressId, disabled: orderType === "table_booking" }),
          /* @__PURE__ */ jsx(Card, { className: "border-border/60 shadow-sm rounded-2xl overflow-hidden", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-5 space-y-3 text-left", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Coins, { className: "h-4 w-4 text-primary" }),
              /* @__PURE__ */ jsx(Label, { className: "text-sm font-bold text-foreground", children: appliedCoupon && payableTotal > 0 ? "Settle Remaining Balance Via" : "Select Payment Mode" })
            ] }),
            /* @__PURE__ */ jsxs(RadioGroup, { value: paymentMethod, onValueChange: (v) => setPaymentMethod(v), className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(RadioGroupItem, { value: "cod", id: "cod", className: "sr-only" }),
                /* @__PURE__ */ jsxs(Label, { htmlFor: "cod", className: `flex flex-col items-center justify-between rounded-xl border-2 p-3.5 bg-popover hover:bg-muted/50 cursor-pointer text-center transition-all ${payableTotal === 0 ? "opacity-50 pointer-events-none" : ""} ${paymentMethod === "cod" ? "border-primary bg-primary/5 font-semibold" : "border-border/60"}`, children: [
                  /* @__PURE__ */ jsx(Coins, { className: `h-5 w-5 mb-1 ${paymentMethod === "cod" ? "text-primary" : "text-muted-foreground"}` }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs", children: "Cash on Delivery" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(RadioGroupItem, { value: "online", id: "online", className: "sr-only" }),
                /* @__PURE__ */ jsxs(Label, { htmlFor: "online", className: `flex flex-col items-center justify-between rounded-xl border-2 p-3.5 bg-popover hover:bg-muted/50 cursor-pointer text-center transition-all ${payableTotal === 0 ? "opacity-50 pointer-events-none" : ""} ${paymentMethod === "online" ? "border-primary bg-primary/5 font-semibold" : "border-border/60"}`, children: [
                  /* @__PURE__ */ jsx(CreditCard, { className: `h-5 w-5 mb-1 ${paymentMethod === "online" ? "text-primary" : "text-muted-foreground"}` }),
                  /* @__PURE__ */ jsx("span", { className: "text-xs", children: "Online Banking" })
                ] })
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4 p-6", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-left", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Ordering from" }),
              /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold", children: shop?.name ?? "Shop" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-left", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "pickup", children: orderType === "table_booking" ? "Table Reservation Timing Slot" : "Scheduled Delivery Time (optional)" }),
              /* @__PURE__ */ jsx(Input, { id: "pickup", type: "datetime-local", value: pickup, onChange: (e) => setPickup(e.target.value) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-left", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "notes", children: "Notes for the kitchen / host (optional)" }),
              /* @__PURE__ */ jsx(Textarea, { id: "notes", value: notes, onChange: (e) => setNotes(e.target.value), placeholder: orderType === "table_booking" ? "Window seat preference, allergies, etc." : "Allergies, extra spicy, leave at door..." })
            ] }),
            shop && !shop.is_verified && /* @__PURE__ */ jsx("p", { className: "text-sm text-destructive text-left font-medium", children: "Warning: This shop is not admin-verified. Proceed with caution." })
          ] }) }),
          /* @__PURE__ */ jsx(Card, { className: "border-border/60 shadow-sm rounded-2xl overflow-hidden", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 space-y-3 text-left", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Tag, { className: "h-4 w-4 text-primary" }),
              /* @__PURE__ */ jsx(Label, { className: "text-sm font-bold text-foreground", children: "Have a Gift Coupon Voucher?" }),
              /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsxs(Tooltip, { children: [
                /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx("button", { type: "button", className: "text-muted-foreground/60 hover:text-foreground outline-none transition-colors", children: /* @__PURE__ */ jsx(Info, { className: "h-4 w-4" }) }) }),
                /* @__PURE__ */ jsxs(TooltipContent, { className: "p-3 max-w-xs space-y-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-xs font-bold", children: "🎟️ Shared Discounts:" }),
                  /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground leading-relaxed", children: "You can convert loyalty points into vouchers inside your Loyalty Wallet profile section. Vouchers are transferable to friends!" })
                ] })
              ] }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Input, { placeholder: "e.g. CHET-A8F2NB", value: couponCode, onChange: (e) => setCouponCode(e.target.value.toUpperCase()), disabled: !!appliedCoupon || isValidatingCoupon, className: "font-mono tracking-wider h-10 rounded-xl focused uppercase text-xs" }),
              appliedCoupon ? /* @__PURE__ */ jsx(Button, { type: "button", variant: "destructive", onClick: () => {
                setAppliedCoupon(null);
                setCouponCode("");
              }, className: "h-10 rounded-xl text-xs font-medium px-4", children: "Remove" }) : /* @__PURE__ */ jsx(Button, { type: "button", onClick: handleApplyCoupon, disabled: isValidatingCoupon || !couponCode.trim(), className: "h-10 rounded-xl text-xs px-5 font-semibold", children: isValidatingCoupon ? "Checking..." : "Apply" })
            ] }),
            appliedCoupon && /* @__PURE__ */ jsxs("div", { className: "mt-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/5 p-3 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-400 space-y-1 animate-in slide-in-from-top-1 duration-200", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center font-bold", children: [
                /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
                  "🎉 Coupon Active: ",
                  /* @__PURE__ */ jsx("code", { className: "text-primary bg-background border px-1 rounded uppercase font-mono", children: appliedCoupon.code })
                ] }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "Max Balance: ",
                  formatCurrency(appliedCoupon.discount_value)
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "h-px bg-emerald-500/20 my-1" }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[11px] font-medium opacity-90", children: [
                /* @__PURE__ */ jsx("span", { children: "Deducted on checkout:" }),
                /* @__PURE__ */ jsxs("span", { className: "font-bold text-foreground", children: [
                  "-",
                  formatCurrency(couponDiscount)
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[11px] font-medium opacity-90", children: [
                /* @__PURE__ */ jsx("span", { children: "Remaining balance for next order:" }),
                /* @__PURE__ */ jsx("span", { className: "font-bold underline text-emerald-600 dark:text-emerald-400", children: formatCurrency(Math.max(0, appliedCoupon.discount_value - total)) })
              ] })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx(Card, { className: "h-fit text-left", children: /* @__PURE__ */ jsxs(CardContent, { className: "space-y-3 p-6", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-semibold text-sm", children: "Order Summary" }),
          /* @__PURE__ */ jsx("div", { className: "space-y-1.5 text-xs", children: lines.map((l) => /* @__PURE__ */ jsxs("div", { className: "flex justify-between gap-4", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground line-clamp-2", children: [
              l.quantity,
              " × ",
              l.name,
              l.variant_name ? ` (${l.variant_name})` : ""
            ] }),
            /* @__PURE__ */ jsx("span", { className: "shrink-0 font-medium", children: formatCurrency(l.unit_price * l.quantity) })
          ] }, `${l.item_id}-${l.variant_id ?? "_"}`)) }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t border-border pt-3 text-sm font-semibold", children: [
            /* @__PURE__ */ jsx("span", { children: "Items Subtotal" }),
            /* @__PURE__ */ jsx("span", { children: formatCurrency(total) })
          ] }),
          couponDiscount > 0 && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 animate-in fade-in-50 duration-200", children: [
            /* @__PURE__ */ jsx("span", { children: "🎟️ Voucher Savings" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "-",
              formatCurrency(couponDiscount)
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-xs text-muted-foreground py-0.5", children: [
            /* @__PURE__ */ jsx("span", { children: "Fulfillment Type:" }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold capitalize text-foreground", children: orderType.replace("_", " ") })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-xs text-muted-foreground pb-1", children: [
            /* @__PURE__ */ jsx("span", { children: "Payment Mode:" }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold uppercase text-foreground", children: combinedPaymentLabel })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t border-dashed pt-2.5 text-base font-bold", children: [
            /* @__PURE__ */ jsx("span", { children: "Payable Total" }),
            /* @__PURE__ */ jsx("span", { className: payableTotal === 0 ? "text-emerald-600 dark:text-emerald-400 font-black animate-pulse" : "", children: payableTotal === 0 ? "FREE" : formatCurrency(payableTotal) })
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-muted-foreground leading-normal", children: [
            "You will accumulate approximately ",
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-primary", children: estimatedEarn }),
            " loyalty points balance items post confirmation."
          ] }),
          /* @__PURE__ */ jsx(Button, { className: `w-full rounded-xl mt-2 ${payableTotal === 0 && isFormValid ? "bg-emerald-600 hover:bg-emerald-500 text-white font-bold" : ""}`, size: "lg", disabled: placePaidOrderMutation.isPending || !isFormValid, onClick: handleCheckoutClick, children: !isFormValid ? "Select Delivery Address" : placePaidOrderMutation.isPending ? "Processing..." : payableTotal === 0 ? "Claim Free Order! 🎉" : paymentMethod === "online" ? "Proceed to Online Pay" : "Place COD Order" })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Dialog, { open: showPaymentGatewayModal, onOpenChange: setShowPaymentGatewayModal, children: /* @__PURE__ */ jsxs(DialogContent, { className: "rounded-2xl", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { className: "text-left", children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Confirm Secure Online Payment" }),
        /* @__PURE__ */ jsx(DialogDescription, { className: "text-xs pt-1", children: "This is a sandbox online checkout gateway authentication frame module. Confirming this sequence completes the transaction and passes parameters to your back-end ecosystem instantly." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border bg-muted/40 p-4 text-xs space-y-1 text-left", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Original Total" }),
          /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground", children: formatCurrency(total) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-emerald-600 dark:text-emerald-400 font-medium", children: [
          /* @__PURE__ */ jsx("span", { children: "Voucher Applied" }),
          /* @__PURE__ */ jsxs("span", { children: [
            "-",
            formatCurrency(couponDiscount)
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "h-px bg-border my-1" }),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between font-bold", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Net Amount Due" }),
          /* @__PURE__ */ jsx("span", { className: "text-foreground", children: formatCurrency(payableTotal) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { className: "gap-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "ghost", className: "rounded-xl text-xs", onClick: () => setShowPaymentGatewayModal(false), children: "Cancel Transaction" }),
        /* @__PURE__ */ jsx(Button, { className: "rounded-xl text-xs font-semibold px-5", onClick: () => placePaidOrderMutation.mutate(), disabled: placePaidOrderMutation.isPending, children: placePaidOrderMutation.isPending ? "Authorizing..." : "Confirm & Pay" })
      ] })
    ] }) })
  ] });
}
export {
  CheckoutPage as component
};
