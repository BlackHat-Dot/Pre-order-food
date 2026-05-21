import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Copy, MapPin, Phone, Star, ShieldCheck, Plus, ShoppingBag, MessageSquarePlus, Loader2, Trash2 } from "lucide-react";
import { reviewsApi, menuApi, ordersApi, shopsApi, type MenuItemOut, type ShopOut, type ReviewOut, ApiError } from "@/lib/api";
import { PublicNav } from "@/components/app/PublicNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { cart, useCart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/shops/$shopId")({ component: ShopDetail });

const FALLBACK_DETAIL_IMAGES = [
  "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1400&q=80",
];

function getFallbackDetailImage(shopId: string, shopName: string) {
  const key = `${shopId}-${shopName}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_DETAIL_IMAGES[Math.abs(hash) % FALLBACK_DETAIL_IMAGES.length];
}

function getUserRole(): string | null {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload).role || null;
  } catch {
    return null;
  }
}

function ShopDetail() {
  const params = Route.useParams() as { shopId: string };
  const { shopId } = params;
  
  const { lines } = useCart();
  const currentShopCartCount = useMemo(() => {
    return lines
      .filter((l) => l.shop_id === shopId)
      .reduce((acc, curr) => acc + curr.quantity, 0);
  }, [lines, shopId]);

  const qc = useQueryClient();
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const [picked, setPicked] = useState<MenuItemOut | null>(null);
  const [conflictItem, setConflictItem] = useState<MenuItemOut | null>(null);

  const currentUserRole = useMemo(() => getUserRole(), []);
  const isShopOwner = currentUserRole === "shop_owner";

  const { data: shop, isLoading, isError: shopError, error: shopErrorObj } = useQuery<ShopOut, Error>({
    queryKey: ["shop", shopId],
    queryFn: () => shopsApi.get(shopId),
  });
  
  const {
    data: items,
    isLoading: itemsLoading,
  } = useQuery<MenuItemOut[], Error>({
    queryKey: ["shop", shopId, "items"],
    queryFn: () => menuApi.listItems(shopId),
  });

  const {
    data: reviews,
    isError: reviewsError,
    error: reviewsErrorObj,
  } = useQuery<ReviewOut[], Error>({
    queryKey: ["shop", shopId, "reviews"],
    queryFn: () => reviewsApi.list(shopId),
  });

  const submitReview = useMutation({
    mutationFn: (payload: { rating: number | null; comment: string; order_id: string }) => 
      ordersApi.submitReview(shopId, payload),
    onSuccess: () => {
      toast.success("Review posted successfully!");
      setReviewComment("");
      setReviewRating(null);
      setShowReviewForm(false);
      qc.invalidateQueries({ queryKey: ["shop", shopId] });
      qc.invalidateQueries({ queryKey: ["shop", shopId, "reviews"] });
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Failed to post review");
    }
  });

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReview.mutate({ rating: reviewRating, comment: reviewComment, order_id: "" });
  };

  const handleClearAndReplaceCart = () => {
    if (!conflictItem) return;
    cart.clear(); 
    const targetItem = conflictItem;
    setConflictItem(null);
    setPicked(targetItem); 
    toast.success("Your cart has been reset. You can now add items from this shop.");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <PublicNav />
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Syncing merchant profile data...</p>
        </div>
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <div className="min-h-screen">
        <PublicNav />
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="py-10 text-center text-destructive">
              <p className="text-sm font-bold">Failed to load shop details.</p>
              <p className="text-xs text-muted-foreground mt-1">
                {shopErrorObj instanceof Error ? shopErrorObj.message : "The requested shop coordinate is unavailable."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const heroImage = !heroImageFailed && shop.image_url
    ? shop.image_url
    : getFallbackDetailImage(shop.id, shop.name);

  const grouped = (items ?? []).reduce<Record<string, MenuItemOut[]>>((acc, it) => {
    const key = it.category || "Menu";
    (acc[key] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="min-h-screen text-left">
      <PublicNav />
      <div className="relative h-[320px] w-full overflow-hidden sm:h-[380px]">
        <img
          src={heroImage}
          alt={shop.name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => {
            if (!heroImageFailed) setHeroImageFailed(true);
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-background" />
      </div>
      <div className="mx-auto -mt-28 max-w-6xl px-4 sm:px-6">
        <Link to="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> All shops
        </Link>
        <Card className="border-white/15 bg-card/65 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl">
          <CardContent className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{shop.name}</h1>
                {shop.is_verified && <ShieldCheck className="h-5 w-5 text-primary" />}
              </div>
              {shop.cuisine && <p className="text-sm text-muted-foreground">{shop.cuisine}</p>}
              <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
                {shop.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {shop.address}</span>}
                {shop.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {shop.phone}</span>}
                <span className="flex items-center gap-1 border-l pl-4 border-border/50">
                  <span className="font-mono">ID: {shop.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shop.id);
                      toast.success("Shop ID copied!");
                    }}
                    className="rounded-md p-1 hover:text-foreground transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </span>
                {shop.rating != null && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current text-primary" />
                    {Number(shop.rating).toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <span className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-bold border ${
                shop.is_open ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-muted text-muted-foreground border-border"
              }`}>
                {shop.is_open ? "Open" : "Closed"}
              </span>

              {currentShopCartCount > 0 && (
                <Link to="/cart">
                  <Button size="sm" className="h-7 rounded-md bg-primary hover:bg-primary/90 px-3 text-xs font-semibold gap-1.5 shadow-sm">
                    <ShoppingBag className="h-3.5 w-3.5" /> View Cart ({currentShopCartCount})
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {shop.description && <p className="mt-4 text-sm text-muted-foreground">{shop.description}</p>}

        <Tabs defaultValue="menu" className="mt-6">
          <TabsList>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews?.length ?? 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="menu" className="mt-6 space-y-8">
            {itemsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              Object.entries(grouped).map(([cat, list]) => (
                <section key={cat}>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {list.map((item) => {
                      const isItemAvailable = item.is_available !== false;
                      return (
                        <Card 
                          key={item.id} 
                          className={`flex h-full flex-row gap-4 overflow-hidden p-4 hover:border-primary/40 transition-colors ${
                            !isItemAvailable ? "opacity-60 bg-muted/20 border-dashed" : ""
                          }`}
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm text-foreground">{item.name}</h3>
                              {!isItemAvailable && (
                                <span className="text-[9px] bg-red-500/10 text-red-500 font-black px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-wide">
                                  Sold Out
                                </span>
                              )}
                            </div>
                            {item.description && <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
                            <div className="flex items-center justify-between pt-2">
                              <span className="font-semibold text-primary text-sm">{formatCurrency(item.price)}</span>
                              
                              {isShopOwner ? (
                                <Button
                                  disabled
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-xl text-[11px] font-bold text-muted-foreground bg-muted/60 cursor-not-allowed border"
                                >
                                  Owners Blocked
                                </Button>
                              ) : !isItemAvailable ? (
                                <Button
                                  disabled
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 rounded-xl text-[11px] font-bold text-red-400 bg-red-500/5 cursor-not-allowed border border-red-500/10 uppercase"
                                >
                                  Unavailable
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!shop.is_open}
                                  onClick={() => {
                                    const currentTotalInCart = lines.reduce((acc, curr) => acc + curr.quantity, 0);
                                    const standardLineConflict = lines.find((l) => l.shop_id !== undefined && l.shop_id !== shopId);

                                    if (standardLineConflict) {
                                      setConflictItem(item);
                                      return;
                                    }

                                    if (currentTotalInCart >= 10) {
                                      toast.warning("Cart Limit Reached", {
                                        description: "Your cart is capped at a maximum of 10 items. Please check out your current selection before adding more items.",
                                      });
                                      return;
                                    }

                                    setPicked(item);
                                  }}
                                  className="h-8 rounded-xl text-xs font-semibold gap-1"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Add
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <img
                              src={item.image_url ?? getFallbackDetailImage(item.id, item.name)}
                              alt={item.name}
                              className={`h-full w-full object-cover ${!isItemAvailable ? "grayscale contrast-75" : ""}`}
                            />
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="reviews" className="mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-sm font-semibold text-foreground">
                Customer Reviews ({reviews?.length ?? 0})
              </h3>
              {!showReviewForm && (
                <Button 
                  onClick={() => setShowReviewForm(true)} 
                  variant="outline" 
                  size="sm"
                  className="gap-1.5 h-8 text-xs font-medium rounded-xl"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" /> Write a review
                </Button>
              )}
            </div>

            {showReviewForm && (
              <Card className="border-border/60 bg-muted/20 animate-in fade-in duration-200 rounded-xl shadow-inner text-left">
                <CardContent className="p-4 space-y-4">
                  <form onSubmit={handleReviewSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground block">Your Rating</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setReviewRating(star === reviewRating ? null : star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(null)}
                            className="transform transition-transform active:scale-95 p-0.5 outline-none"
                          >
                            <Star
                              className={`h-5 w-5 transition-colors ${
                                star <= (hoveredRating ?? reviewRating ?? 0)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/20"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground block">Review Message</label>
                      <Textarea
                        placeholder="Tell others about the food quality..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="resize-none min-h-[80px] text-sm bg-background rounded-xl focus-visible:ring-primary"
                        maxLength={300}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs font-medium rounded-lg"
                        onClick={() => { setShowReviewForm(false); setReviewRating(null); setReviewComment(""); }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="h-8 text-xs font-medium rounded-lg"
                        disabled={submitReview.isPending}
                      >
                        Submit
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {reviewsError ? (
              <Card className="border-destructive/40 bg-destructive/10">
                <CardContent className="py-10 text-center text-destructive">
                  <p className="text-sm font-bold">Unable to load reviews.</p>
                  <p className="text-xs mt-1">{reviewsErrorObj instanceof Error ? reviewsErrorObj.message : "Please try again later."}</p>
                </CardContent>
              </Card>
            ) : !reviews || reviews.length === 0 ? (
              <Card className="border-dashed bg-muted/5 rounded-xl">
                <CardContent className="py-12 text-center text-muted-foreground text-xs font-medium">
                  No reviews yet. Be the first to share your experience!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2.5 text-left">
                {reviews.map((r) => (
                  <Card key={r.id} className="border-border/40 shadow-none rounded-xl">
                    <CardContent className="space-y-1.5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">{r.customer_name || "Customer"}</span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatDateShort(r.created_at)}
                        </span>
                      </div>
                      {r.rating > 0 && (
                        <div className="flex items-center gap-0.5 text-primary">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-3 w-3 ${i < r.rating ? "fill-current text-amber-400" : "text-muted-foreground/10"}`} 
                            />
                          ))}
                        </div>
                      )}
                      {r.comment && <p className="text-xs text-muted-foreground/90 leading-relaxed">{r.comment}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AddItemDialog item={picked} shopId={shopId} onClose={() => setPicked(null)} />

      <Dialog open={!!conflictItem} onOpenChange={(o) => !o && setConflictItem(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 text-center">
          <DialogHeader className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <Trash2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold tracking-tight">
              Replace existing cart items?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-normal px-2">
              Your cart currently contains selections from another store. To order from <span className="font-semibold text-foreground">{shop.name}</span> instead, your previous basket will be cleared.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setConflictItem(null)} 
              className="text-xs font-semibold rounded-xl h-9"
            >
              Keep Existing Cart
            </Button>
            <Button 
              variant="destructive"
              onClick={handleClearAndReplaceCart}
              className="text-xs font-bold rounded-xl h-9"
            >
              Clear Cart & Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="h-16" />
    </div>
  );
}

function AddItemDialog({ item, shopId, onClose }: { item: MenuItemOut | null; shopId: string; onClose: () => void }) {
  const { data: variants } = useQuery({
    queryKey: ["item", item?.id, "variants"],
    queryFn: () => (item ? menuApi.listVariants(item.id) : Promise.resolve([])),
    enabled: !!item,
  });
  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const { lines } = useCart();

  useEffect(() => {
    if (!item) return;
    setQty(1);
    setVariantId(variants?.[0]?.id ?? "");
  }, [item?.id, variants]);

  if (!item) return null;
  const selectedVariant = variants?.find((x) => x.id === variantId) ?? variants?.[0] ?? null;
  const price = selectedVariant?.price ?? item.price;

  function add() {
    if (!item) return;

    const currentTotalInCart = lines.reduce((acc, curr) => acc + curr.quantity, 0);
    
    if (currentTotalInCart + qty > 10) {
      toast.error("Maximum Cart Capacity Exceeded", {
        description: `You can only add up to ${10 - currentTotalInCart} more items. Please check out your current selection first.`,
      });
      return;
    }
    
    cart.addItem(item, (selectedVariant as any) ?? null, qty);
    toast.success(`Added ${qty} × ${item.name}`);
    onClose();
    setQty(1);
    setVariantId("");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg font-bold tracking-tight">{item.name}</DialogTitle>
          {item.description && <DialogDescription className="text-xs line-clamp-3">{item.description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">
          {variants && variants.length > 0 && (
            <div className="space-y-2 text-left">
              <Label className="text-xs font-semibold text-muted-foreground">Choose option</Label>
              <RadioGroup value={variantId} onValueChange={setVariantId}>
                {variants.map((v) => {
                  const isVariantAvailable = v.is_available !== false;
                  return (
                    <Label
                      key={v.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 transition-all ${
                        !isVariantAvailable ? "opacity-50 bg-muted/20 cursor-not-allowed border-dashed" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <RadioGroupItem value={v.id} disabled={!isVariantAvailable} /> 
                        <span>{v.name}</span>
                        {!isVariantAvailable && (
                          <span className="text-[8px] bg-red-500/10 text-red-500 font-extrabold px-1 py-0.5 rounded ml-1 uppercase">
                            Out of Stock
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(v.price)}</span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>
          )}
          
          <div className="flex items-center justify-between border-t border-dashed pt-4 border-border/60">
            <div className="space-y-0.5 text-left">
              <Label className="text-sm font-bold text-foreground">Quantity</Label>
              <p className="text-[11px] text-muted-foreground">Maximum limit: 10 items total per cart</p>
            </div>
            
            <div className="flex items-center gap-1.5 bg-muted/40 border border-border/50 p-1 rounded-xl">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg font-bold" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Button>
              <span className="w-8 text-center font-mono text-sm font-bold">{qty}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg font-bold"
                onClick={() => {
                  const currentTotalInCart = lines.reduce((acc, curr) => acc + curr.quantity, 0);
                  if (currentTotalInCart + qty >= 10) {
                    toast.warning("Cart Limit Reached", { description: "You cannot exceed a total of 10 items in your cart." });
                    return;
                  }
                  setQty((q) => q + 1);
                }}
              >
                +
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row sm:justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-xs font-semibold rounded-xl">Cancel</Button>
          <Button onClick={add} className="flex-1 sm:flex-initial text-xs font-bold rounded-xl px-5">
            Add — {formatCurrency(price * qty)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}