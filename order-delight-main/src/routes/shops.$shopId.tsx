import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, MapPin, Phone, Star, ShieldCheck, Plus, ShoppingBag, AlertTriangle } from "lucide-react";
import { menuApi, reviewsApi, shopsApi, type MenuItemOut, type VariantOut } from "@/lib/api";
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

function ShopDetail() {
  const { shopId } = Route.useParams();
  const { count } = useCart();
  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => shopsApi.get(shopId),
  });
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["shop", shopId, "items"],
    queryFn: () => menuApi.listItems(shopId),
  });
  const { data: reviews } = useQuery({
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
  if (!shop) return null;

  const grouped = (items ?? []).reduce<Record<string, MenuItemOut[]>>((acc, it) => {
    const k = it.category || "Menu";
    (acc[k] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      <PublicNav />
      <div className="relative h-56 w-full overflow-hidden sm:h-72">
        {shop.image_url ? (
          <img
            src={shop.image_url}
            alt={shop.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const p = el.parentElement;
              if (p) p.style.background = "var(--gradient-primary)";
            }}
          />
        ) : null}
        {!shop.image_url && <div className="h-full w-full" style={{ background: "var(--gradient-primary)" }} />}
      </div>
      <div className="mx-auto -mt-16 max-w-6xl px-4 sm:px-6">
        <Link to="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> All shops
        </Link>
        <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
          <CardContent className="flex flex-wrap items-start justify-between gap-4 p-6">
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
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : null}
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ))
            )}
          </TabsContent>
          <TabsContent value="reviews" className="mt-6 space-y-3">
            {!reviews || reviews.length === 0 ? (
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: variants } = useQuery({
    queryKey: ["item", item?.id, "variants"],
    queryFn: () => menuApi.listVariants(item!.id),
    enabled: !!item,
  });
  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);

  if (!item) return null;
  const v: VariantOut | null = variants?.find((x) => x.id === variantId) ?? null;
  const price = v?.price ?? item.price;

  function add() {
    cart.addItem(item!, v, qty);
    toast.success(`Added ${qty} × ${item!.name}`);
    onClose();
    setQty(1);
    setVariantId("");
    if (!user) {
      // ok — they can still browse cart
    }
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
