import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MapPin, Phone, Star, ShieldCheck, Plus, ShoppingBag, AlertTriangle } from "lucide-react";
import { menuApi, reviewsApi, shopsApi, type MenuItemOut, type MenuItemVariantOut, type ShopOut, type ReviewOut } from "@/lib/api";
import { PublicNav } from "@/components/app/PublicNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useAuth } from "@/lib/auth";

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

function ShopDetail() {
  const params = Route.useParams() as { shopId: string };
  const { shopId } = params;
  const { count } = useCart();
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const { data: shop, isLoading, isError: shopError, error: shopErrorObj } = useQuery<ShopOut, Error>({
    queryKey: ["shop", shopId],
    queryFn: () => shopsApi.get(shopId),
  });
  const {
    data: items,
    isLoading: itemsLoading,
    isError: itemsError,
    error: itemsErrorObj,
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

  const [picked, setPicked] = useState<MenuItemOut | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <PublicNav />
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      </div>
    );
  }
  if (shopError) {
    return (
      <div className="min-h-screen">
        <PublicNav />
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="py-10 text-center text-destructive">
              <p className="text-lg font-semibold">Failed to load shop details.</p>
              <p>{shopErrorObj instanceof Error ? shopErrorObj.message : "Please try again later."}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  if (!shop) return null;
  const heroImage = !heroImageFailed && shop.image_url
    ? shop.image_url
    : getFallbackDetailImage(shop.id, shop.name);

  const grouped = useMemo(() => {
    return (items ?? []).reduce<Record<string, MenuItemOut[]>>((acc, it) => {
      const key = it.category || "Menu";
      (acc[key] ||= []).push(it);
      return acc;
    }, {});
  }, [items]);

  return (
    <div className="min-h-screen">
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,178,54,0.28),transparent_38%)]" />
      </div>
      <div className="mx-auto -mt-28 max-w-6xl px-4 sm:px-6">
        <Link to="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> All shops
        </Link>
        <Card className="border-white/15 bg-card/65 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl">
          <CardContent className="relative flex flex-wrap items-start justify-between gap-4 p-6">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/25 blur-2xl" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{shop.name}</h1>
                {shop.is_verified && <ShieldCheck className="h-5 w-5 text-primary" />}
              </div>
              {shop.cuisine && <p className="text-sm text-muted-foreground">{shop.cuisine}</p>}
              <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
                {shop.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {shop.address}
                  </span>
                )}
                {shop.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {shop.phone}
                  </span>
                )}
                {shop.rating != null && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current text-primary" />
                    {Number(shop.rating).toFixed(1)}
                    <span className="text-[11px] text-muted-foreground">({shop.total_reviews} reviews)</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={shop.is_open ? "default" : "secondary"}>
                {shop.is_open ? "Open" : "Closed"}
              </Badge>
              {count > 0 && (
                <Link to="/cart">
                  <Button>
                    <ShoppingBag className="mr-2 h-4 w-4" /> View cart ({count})
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
        {items && items.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {items.slice(0, 3).map((item, idx) => (
              <div
                key={item.id}
                className={`rounded-2xl border border-white/10 bg-card/55 px-4 py-3 shadow-lg backdrop-blur-lg ${
                  idx % 2 === 0 ? "sm:-translate-y-2" : "sm:translate-y-2"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wide text-primary/90">Popular</p>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
              </div>
            ))}
          </div>
        )}

        {shop.description && (
          <p className="mt-4 text-sm text-muted-foreground">{shop.description}</p>
        )}
        {!shop.is_verified && (
          <Card className="mt-4 border-destructive/40 bg-destructive/10">
            <CardContent className="flex items-center gap-2 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              This shop is not admin-verified. Ordering may be unsafe. Proceed at your own risk.
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="menu" className="mt-6">
          <TabsList>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews?.length ?? 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="menu" className="mt-6 space-y-8">
            {itemsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : itemsError ? (
              <Card className="border-destructive/40 bg-destructive/10">
                <CardContent className="py-10 text-center text-destructive">
                  <p className="text-lg font-semibold">Unable to load menu.</p>
                  <p>{itemsErrorObj instanceof Error ? itemsErrorObj.message : "Please try again later."}</p>
                </CardContent>
              </Card>
            ) : !items || items.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  No items yet.
                </CardContent>
              </Card>
            ) : (
              Object.entries(grouped).map(([cat, list]) => (
                <section key={cat}>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {cat}
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {list.map((item) => (
                      <Card
                        key={item.id}
                        className="flex h-full flex-row gap-4 overflow-hidden p-4 transition-colors hover:border-primary/40"
                      >
                        <div className="flex-1 space-y-1">
                          <h3 className="font-medium">{item.name}</h3>
                          {item.description && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-2">
                            <span className="font-semibold text-primary">
                              {formatCurrency(item.price)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={item.is_available === false || !shop.is_open}
                              onClick={() => setPicked(item)}
                            >
                              <Plus className="mr-1 h-3 w-3" /> Add
                            </Button>
                          </div>
                        </div>
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <img
                            src={item.image_url ?? getFallbackDetailImage(item.id, item.name)}
                            alt={item.name || "Menu item"}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = getFallbackDetailImage(item.id, item.name);
                            }}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ))
            )}
          </TabsContent>
          <TabsContent value="reviews" className="mt-6 space-y-3">
            {reviewsError ? (
              <Card className="border-destructive/40 bg-destructive/10">
                <CardContent className="py-10 text-center text-destructive">
                  <p className="text-lg font-semibold">Unable to load reviews.</p>
                  <p>{reviewsErrorObj instanceof Error ? reviewsErrorObj.message : "Please try again later."}</p>
                </CardContent>
              </Card>
            ) : !reviews || reviews.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  No reviews yet.
                </CardContent>
              </Card>
            ) : (
              reviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.customer_name || "Customer"}</span>
                        <span className="flex items-center gap-0.5 text-primary">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateShort(r.created_at)}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AddItemDialog item={picked} onClose={() => setPicked(null)} />
      <div className="h-16" />
    </div>
  );
}

function AddItemDialog({ item, onClose }: { item: MenuItemOut | null; onClose: () => void }) {
  const { user } = useAuth();
  const { data: variants } = useQuery({
    queryKey: ["item", item?.id, "variants"],
    queryFn: () => (item ? menuApi.listVariants(item.id) : Promise.resolve([])),
    enabled: !!item,
  });
  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);

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

    // 1. Find the actual variant object using your variantId state
    // (If your variants are stored in a separate variable, replace 'item.variants' with 'variants')
    const selectedVariant = (item as any).variants?.find((v: any) => v.id === variantId) || undefined;

    // 2. Add it to the cart
    cart.addItem(item, selectedVariant, qty);
    
    toast.success(`Added ${qty} × ${item.name}`);
    onClose();
    setQty(1);
    setVariantId("");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          {item.description && <DialogDescription>{item.description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">
          {variants && variants.length > 0 && (
            <div className="space-y-2">
              <Label>Choose option</Label>
              <RadioGroup value={variantId} onValueChange={setVariantId}>
                {variants.map((v) => (
                  <Label
                    key={v.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={v.id} /> {v.name}
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(v.price)}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label>Quantity</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </Button>
              <span className="w-8 text-center font-medium">{qty}</span>
              <Button variant="outline" size="sm" onClick={() => setQty((q) => q + 1)}>
                +
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={add}>Add — {formatCurrency(price * qty)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
