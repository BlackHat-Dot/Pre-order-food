import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { Loader2, ChevronLeft, ShieldCheck, MapPin, Phone, Copy, Star, ShoppingBag, Plus, MessageSquarePlus, Trash2 } from "lucide-react";
import { R as Route, u as useAuth, s as shopsApi, m as menuApi, r as reviewsApi, A as ApiError, o as ordersApi, B as Button, T as Textarea, D as Dialog, f as DialogContent, g as DialogHeader, i as DialogDescription, j as DialogFooter, h as DialogTitle } from "./router-DQr6eapq.js";
import { P as PublicNav } from "./PublicNav-Ce66gdj8.js";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { S as Skeleton } from "./skeleton-B35717OU.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CoISGPZI.js";
import { R as RadioGroup, a as RadioGroupItem } from "./radio-group-2MWZD7N6.js";
import { L as Label } from "./label-D-IOUQFS.js";
import { f as formatCurrency, a as formatDateShort } from "./format-BBidFSeC.js";
import { u as useCart, c as cart } from "./dropdown-menu-CRgp8eCB.js";
import { toast } from "sonner";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "./nav-CWlJKvXT.js";
import "@radix-ui/react-popover";
import "@radix-ui/react-tabs";
import "@radix-ui/react-radio-group";
import "@radix-ui/react-label";
import "@radix-ui/react-dropdown-menu";
const FALLBACK_DETAIL_IMAGES = ["https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=1400&q=80", "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1400&q=80", "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1400&q=80"];
function getFallbackDetailImage(shopId, shopName) {
  const key = `${shopId}-${shopName}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_DETAIL_IMAGES[Math.abs(hash) % FALLBACK_DETAIL_IMAGES.length];
}
function ShopDetail() {
  const params = Route.useParams();
  const {
    shopId
  } = params;
  const {
    lines
  } = useCart();
  const currentShopCartCount = useMemo(() => {
    return lines.filter((l) => l.shop_id === shopId).reduce((acc, curr) => acc + curr.quantity, 0);
  }, [lines, shopId]);
  const qc = useQueryClient();
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(null);
  const [hoveredRating, setHoveredRating] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [picked, setPicked] = useState(null);
  const [conflictItem, setConflictItem] = useState(null);
  const {
    user
  } = useAuth();
  const isShopOwner = user?.role === "shop_owner";
  const {
    data: shop,
    isLoading,
    isError: shopError,
    error: shopErrorObj
  } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => shopsApi.get(shopId)
  });
  const {
    data: items,
    isLoading: itemsLoading
  } = useQuery({
    queryKey: ["shop", shopId, "items"],
    queryFn: () => menuApi.listItems(shopId)
  });
  const {
    data: reviews,
    isError: reviewsError,
    error: reviewsErrorObj
  } = useQuery({
    queryKey: ["shop", shopId, "reviews"],
    queryFn: () => reviewsApi.list(shopId)
  });
  const handleReviewSubmit = (e) => {
    e.preventDefault();
    submitReview.mutate({
      rating: reviewRating,
      comment: reviewComment,
      order_id: ""
    });
  };
  const submitReview = useMutation({
    mutationFn: (payload) => ordersApi.submitReview(shopId, payload),
    onSuccess: () => {
      toast.success("Review posted successfully!");
      setReviewComment("");
      setReviewRating(null);
      setShowReviewForm(false);
      qc.invalidateQueries({
        queryKey: ["shop", shopId]
      });
      qc.invalidateQueries({
        queryKey: ["shop", shopId, "reviews"]
      });
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Failed to post review");
    }
  });
  const handleClearAndReplaceCart = () => {
    if (!conflictItem) return;
    cart.clear();
    const targetItem = conflictItem;
    setConflictItem(null);
    setPicked(targetItem);
    toast.success("Your cart has been reset. You can now add items from this shop.");
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
      /* @__PURE__ */ jsx(PublicNav, {}),
      /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-6xl space-y-4 px-4 py-8 flex flex-col items-center justify-center min-h-[50vh]", children: [
        /* @__PURE__ */ jsx(Loader2, { className: "h-6 w-6 animate-spin text-primary" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground font-medium", children: "Syncing merchant profile data..." })
      ] })
    ] });
  }
  if (shopError || !shop) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
      /* @__PURE__ */ jsx(PublicNav, {}),
      /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-6xl px-4 py-8", children: /* @__PURE__ */ jsx(Card, { className: "border-destructive/40 bg-destructive/10", children: /* @__PURE__ */ jsxs(CardContent, { className: "py-10 text-center text-destructive", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm font-bold", children: "Failed to load shop details." }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-1", children: shopErrorObj instanceof Error ? shopErrorObj.message : "The requested shop coordinate is unavailable." })
      ] }) }) })
    ] });
  }
  const heroImage = !heroImageFailed && shop.image_url ? shop.image_url : getFallbackDetailImage(shop.id, shop.name);
  const grouped = (items ?? []).reduce((acc, it) => {
    const key = it.category || "Menu";
    (acc[key] ||= []).push(it);
    return acc;
  }, {});
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen text-left", children: [
    /* @__PURE__ */ jsx(PublicNav, {}),
    /* @__PURE__ */ jsxs("div", { className: "relative h-[320px] w-full overflow-hidden sm:h-[380px]", children: [
      /* @__PURE__ */ jsx("img", { src: heroImage, alt: shop.name, className: "h-full w-full object-cover", referrerPolicy: "no-referrer", onError: () => {
        if (!heroImageFailed) setHeroImageFailed(true);
      } }),
      /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-background" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto -mt-28 max-w-6xl px-4 sm:px-6", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground", children: [
        /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }),
        " All shops"
      ] }),
      /* @__PURE__ */ jsx(Card, { className: "border-white/15 bg-card/65 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl", children: /* @__PURE__ */ jsxs(CardContent, { className: "relative flex flex-wrap items-start justify-between gap-4 p-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight sm:text-3xl", children: shop.name }),
            shop.is_verified && /* @__PURE__ */ jsx(ShieldCheck, { className: "h-5 w-5 text-primary" })
          ] }),
          shop.cuisine && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: shop.cuisine }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground", children: [
            shop.address && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(MapPin, { className: "h-3 w-3" }),
              " ",
              shop.address
            ] }),
            shop.phone && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(Phone, { className: "h-3 w-3" }),
              " ",
              shop.phone
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 border-l pl-4 border-border/50", children: [
              /* @__PURE__ */ jsxs("span", { className: "font-mono", children: [
                "ID: ",
                shop.id
              ] }),
              /* @__PURE__ */ jsx("button", { onClick: () => {
                navigator.clipboard.writeText(shop.id);
                toast.success("Shop ID copied!");
              }, className: "rounded-md p-1 hover:text-foreground transition-colors", children: /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }) })
            ] }),
            shop.rating != null && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(Star, { className: "h-3 w-3 fill-current text-primary" }),
              Number(shop.rating).toFixed(1)
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-2 sm:mt-0", children: [
          /* @__PURE__ */ jsx("span", { className: `inline-flex h-7 items-center rounded-md px-2.5 text-xs font-bold border ${shop.is_open ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-muted text-muted-foreground border-border"}`, children: shop.is_open ? "Open" : "Closed" }),
          currentShopCartCount > 0 && !isShopOwner && /* @__PURE__ */ jsx(Link, { to: "/cart", children: /* @__PURE__ */ jsxs(Button, { size: "sm", className: "h-7 rounded-md bg-primary hover:bg-primary/90 px-3 text-xs font-semibold gap-1.5 shadow-sm", children: [
            /* @__PURE__ */ jsx(ShoppingBag, { className: "h-3.5 w-3.5" }),
            " View Cart (",
            currentShopCartCount,
            ")"
          ] }) })
        ] })
      ] }) }),
      shop.description && /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm text-muted-foreground", children: shop.description }),
      /* @__PURE__ */ jsxs(Tabs, { defaultValue: "menu", className: "mt-6", children: [
        /* @__PURE__ */ jsxs(TabsList, { children: [
          /* @__PURE__ */ jsx(TabsTrigger, { value: "menu", children: "Menu" }),
          /* @__PURE__ */ jsxs(TabsTrigger, { value: "reviews", children: [
            "Reviews (",
            reviews?.length ?? 0,
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsx(TabsContent, { value: "menu", className: "mt-6 space-y-8", children: itemsLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-32 w-full" }) : Object.entries(grouped).map(([cat, list]) => /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { className: "mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground", children: cat }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2", children: list.map((item) => {
            const isItemAvailable = item.is_available !== false;
            return /* @__PURE__ */ jsxs(Card, { className: `flex h-full flex-row gap-4 overflow-hidden p-4 hover:border-primary/40 transition-colors ${!isItemAvailable ? "opacity-60 bg-muted/20 border-dashed" : ""}`, children: [
              /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-1", children: [
                /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsx("h3", { className: "font-medium text-sm text-foreground", children: item.name }) }),
                item.description && /* @__PURE__ */ jsx("p", { className: "line-clamp-2 text-xs text-muted-foreground", children: item.description }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pt-2", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-semibold text-primary text-sm", children: formatCurrency(item.price) }),
                  isShopOwner ? /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                    toast.error("Carting Restrained", {
                      description: "You are logged into a Shop Owner account. Owners cannot place or build orders. Please create a new Customer Account to buy food items.",
                      duration: 5e3
                    });
                  }, className: "h-8 rounded-xl text-[11px] font-bold text-muted-foreground bg-muted/60 border hover:bg-destructive hover:text-white transition-colors", children: "Owners Blocked" }) : !isItemAvailable ? /* @__PURE__ */ jsx(Button, { disabled: true, size: "sm", variant: "ghost", className: "h-8 rounded-xl text-[11px] font-bold text-red-400 bg-red-500/5 cursor-not-allowed border border-red-500/10 uppercase", children: "Unavailable" }) : /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", disabled: !shop.is_open, onClick: () => {
                    const currentTotalInCart = lines.reduce((acc, curr) => acc + curr.quantity, 0);
                    const standardLineConflict = lines.find((l) => l.shop_id !== void 0 && l.shop_id !== shopId);
                    if (standardLineConflict) {
                      setConflictItem(item);
                      return;
                    }
                    if (currentTotalInCart >= 10) {
                      toast.warning("Cart Limit Reached", {
                        description: "Your cart is capped at a maximum of 10 items. Please check out your current selection before adding more items."
                      });
                      return;
                    }
                    setPicked(item);
                  }, className: "h-8 rounded-xl text-xs font-semibold gap-1", children: [
                    /* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }),
                    " Add"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted", children: /* @__PURE__ */ jsx("img", { src: item.image_url ?? getFallbackDetailImage(item.id, item.name), alt: item.name, className: "h-full w-full object-cover" }) })
            ] }, item.id);
          }) })
        ] }, cat)) }),
        /* @__PURE__ */ jsxs(TabsContent, { value: "reviews", className: "mt-6 space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-border/50 pb-3", children: [
            /* @__PURE__ */ jsxs("h3", { className: "text-sm font-semibold text-foreground", children: [
              "Customer Reviews (",
              reviews?.length ?? 0,
              ")"
            ] }),
            !showReviewForm && !isShopOwner && /* @__PURE__ */ jsxs(Button, { onClick: () => setShowReviewForm(true), variant: "outline", size: "sm", className: "gap-1.5 h-8 text-xs font-medium rounded-xl", children: [
              /* @__PURE__ */ jsx(MessageSquarePlus, { className: "h-3.5 w-3.5" }),
              " Write a review"
            ] })
          ] }),
          showReviewForm && /* @__PURE__ */ jsx(Card, { className: "border-border/60 bg-muted/20 animate-in fade-in duration-200 rounded-xl shadow-inner text-left", children: /* @__PURE__ */ jsx(CardContent, { className: "p-4 space-y-4", children: /* @__PURE__ */ jsxs("form", { onSubmit: handleReviewSubmit, className: "space-y-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsx("label", { className: "text-xs font-medium text-muted-foreground block", children: "Your Rating" }),
              /* @__PURE__ */ jsx("div", { className: "flex items-center gap-1", children: [1, 2, 3, 4, 5].map((star) => /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setReviewRating(star === reviewRating ? null : star), onMouseEnter: () => setHoveredRating(star), onMouseLeave: () => setHoveredRating(null), className: "transform transition-transform active:scale-95 p-0.5 outline-none", children: /* @__PURE__ */ jsx(Star, { className: `h-5 w-5 transition-colors ${star <= (hoveredRating ?? reviewRating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}` }) }, star)) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx("label", { className: "text-xs font-medium text-muted-foreground block", children: "Review Message" }),
              /* @__PURE__ */ jsx(Textarea, { placeholder: "Tell others about the food quality...", value: reviewComment, onChange: (e) => setReviewComment(e.target.value), className: "resize-none min-h-[80px] text-sm bg-background rounded-xl focus-visible:ring-primary", maxLength: 300 })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end gap-2 pt-1", children: [
              /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "sm", className: "h-8 text-xs font-medium rounded-lg", onClick: () => {
                setShowReviewForm(false);
                setReviewRating(null);
                setReviewComment("");
              }, children: "Cancel" }),
              /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", className: "h-8 text-xs font-medium rounded-lg", disabled: submitReview.isPending, children: "Submit" })
            ] })
          ] }) }) }),
          reviewsError ? /* @__PURE__ */ jsx(Card, { className: "border-destructive/40 bg-destructive/10", children: /* @__PURE__ */ jsxs(CardContent, { className: "py-10 text-center text-destructive", children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-bold", children: "Unable to load reviews." }),
            /* @__PURE__ */ jsx("p", { className: "text-xs mt-1", children: reviewsErrorObj instanceof Error ? reviewsErrorObj.message : "Please try again later." })
          ] }) }) : !reviews || reviews.length === 0 ? /* @__PURE__ */ jsx(Card, { className: "border-dashed bg-muted/5 rounded-xl", children: /* @__PURE__ */ jsx(CardContent, { className: "py-12 text-center text-muted-foreground text-xs font-medium", children: "No reviews yet. Be the first to share your experience!" }) }) : /* @__PURE__ */ jsx("div", { className: "space-y-2.5 text-left", children: reviews.map((r) => /* @__PURE__ */ jsx(Card, { className: "border-border/40 shadow-none rounded-xl", children: /* @__PURE__ */ jsxs(CardContent, { className: "space-y-1.5 p-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-xs text-foreground", children: r.customer_name || "Customer" }),
              /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground/70", children: formatDateShort(r.created_at) })
            ] }),
            r.rating > 0 && /* @__PURE__ */ jsx("div", { className: "flex items-center gap-0.5 text-primary", children: Array.from({
              length: 5
            }).map((_, i) => /* @__PURE__ */ jsx(Star, { className: `h-3 w-3 ${i < r.rating ? "fill-current text-amber-400" : "text-muted-foreground/10"}` }, i)) }),
            r.comment && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground/90 leading-relaxed", children: r.comment })
          ] }) }, r.id)) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(AddItemDialog, { item: picked, shopId, onClose: () => setPicked(null) }),
    /* @__PURE__ */ jsx(Dialog, { open: !!conflictItem, onOpenChange: (o) => !o && setConflictItem(null), children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-[400px] rounded-2xl p-6 text-center", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { className: "flex flex-col items-center gap-2", children: [
        /* @__PURE__ */ jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2", children: /* @__PURE__ */ jsx(Trash2, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsx("div", { className: "text-base font-bold tracking-tight", children: "Replace existing cart items?" }),
        /* @__PURE__ */ jsxs(DialogDescription, { className: "text-xs text-muted-foreground leading-normal px-2", children: [
          "Your cart currently contains selections from another store. To order from ",
          /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: shop.name }),
          " instead, your previous basket will be cleared."
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { className: "grid grid-cols-2 gap-2 mt-4", children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setConflictItem(null), className: "text-xs font-semibold rounded-xl h-9", children: "Keep Existing Cart" }),
        /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: handleClearAndReplaceCart, className: "text-xs font-bold rounded-xl h-9", children: "Clear Cart & Add" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "h-16" })
  ] });
}
function AddItemDialog({
  item,
  shopId,
  onClose
}) {
  const {
    data: variants,
    isLoading: isLoadingVariants
  } = useQuery({
    queryKey: ["item", item?.id, "variants"],
    queryFn: () => item ? menuApi.listVariants(item.id) : Promise.resolve([]),
    enabled: !!item
  });
  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState(1);
  const {
    lines
  } = useCart();
  const {
    user
  } = useAuth();
  const isShopOwner = user?.role === "shop_owner";
  useEffect(() => {
    if (!item || isLoadingVariants) return;
    setQty(1);
    setVariantId(variants?.[0]?.id ?? "");
  }, [item?.id, variants, isLoadingVariants]);
  if (!item) return null;
  const selectedVariant = variants?.find((x) => x.id === variantId) ?? variants?.[0] ?? null;
  const price = selectedVariant?.price ?? item.price;
  const hasVariantsArray = variants && variants.length > 0;
  const isFormLocked = isLoadingVariants || hasVariantsArray && !variantId;
  function add() {
    if (!item || isFormLocked) return;
    if (isShopOwner) {
      toast.error("Carting Restrained", {
        description: "You are logged into a Shop Owner account. Owners cannot place or build orders. Please create a new Customer Account to buy food items.",
        duration: 5e3
      });
      onClose();
      return;
    }
    const currentTotalInCart = lines.reduce((acc, curr) => acc + curr.quantity, 0);
    if (currentTotalInCart + qty > 10) {
      toast.error("Maximum Cart Capacity Exceeded", {
        description: `You can only add up to ${10 - currentTotalInCart} more items. Please check out your current selection first.`
      });
      return;
    }
    cart.addItem(item, selectedVariant ?? null, qty);
    toast.success(`Added ${qty} × ${item.name}`);
    onClose();
    setQty(1);
    setVariantId("");
  }
  return /* @__PURE__ */ jsx(Dialog, { open: true, onOpenChange: (o) => !o && onClose(), children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-[420px] rounded-2xl", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { className: "text-left", children: [
      /* @__PURE__ */ jsx(DialogTitle, { className: "text-lg font-bold tracking-tight", children: item.name }),
      item.description && /* @__PURE__ */ jsx(DialogDescription, { className: "text-xs line-clamp-3", children: item.description })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      isLoadingVariants ? /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-left", children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold text-muted-foreground animate-pulse", children: "Syncing options..." }),
        /* @__PURE__ */ jsx(Skeleton, { className: "h-11 w-full rounded-xl" }),
        /* @__PURE__ */ jsx(Skeleton, { className: "h-11 w-full rounded-xl" })
      ] }) : variants && variants.length > 0 ? /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-left", children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold text-muted-foreground", children: "Choose option" }),
        /* @__PURE__ */ jsx(RadioGroup, { value: variantId, onValueChange: setVariantId, children: variants.map((v) => {
          const isVariantAvailable = v.is_available !== false;
          return /* @__PURE__ */ jsxs(Label, { className: `flex cursor-pointer items-center justify-between rounded-xl border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 transition-all ${!isVariantAvailable ? "opacity-50 bg-muted/20 cursor-not-allowed border-dashed" : ""}`, children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm font-medium", children: [
              /* @__PURE__ */ jsx(RadioGroupItem, { value: v.id, disabled: !isVariantAvailable }),
              /* @__PURE__ */ jsx("span", { children: v.name })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-foreground", children: formatCurrency(v.price) })
          ] }, v.id);
        }) })
      ] }) : null,
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t border-dashed pt-4 border-border/60", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-0.5 text-left", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-sm font-bold text-foreground", children: "Quantity" }),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground", children: "Maximum limit: 10 items total per cart" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 bg-muted/40 border border-border/50 p-1 rounded-xl", children: [
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", disabled: isFormLocked, className: "h-8 w-8 rounded-lg font-bold", onClick: () => setQty((q) => Math.max(1, q - 1)), children: "−" }),
          /* @__PURE__ */ jsx("span", { className: "w-8 text-center font-mono text-sm font-bold", children: qty }),
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", disabled: isFormLocked, className: "h-8 w-8 rounded-lg font-bold", onClick: () => {
            const currentTotalInCart = lines.reduce((acc, curr) => acc + curr.quantity, 0);
            if (currentTotalInCart + qty >= 10) {
              toast.warning("Cart Limit Reached", {
                description: "You cannot exceed a total of 10 items in your cart."
              });
              return;
            }
            setQty((q) => q + 1);
          }, children: "+" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { className: "flex-row sm:justify-end gap-2 pt-2", children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: onClose, className: "text-xs font-semibold rounded-xl", children: "Cancel" }),
      /* @__PURE__ */ jsx(Button, { onClick: add, disabled: isShopOwner || isFormLocked, className: "flex-1 sm:flex-initial text-xs font-bold rounded-xl px-5 transition-all", children: isShopOwner ? "Action Blocked" : isLoadingVariants ? /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Loader2, { className: "h-3 w-3 animate-spin" }),
        " Loading choices..."
      ] }) : `Add — ${formatCurrency(price * qty)}` })
    ] })
  ] }) });
}
export {
  ShopDetail as component
};
