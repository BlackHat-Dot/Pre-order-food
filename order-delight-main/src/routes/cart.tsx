import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, ShoppingBag, ChevronLeft, Store } from "lucide-react";
import { PublicNav } from "@/components/app/PublicNav";
import { useCart, cart } from "@/lib/cart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { shopsApi } from "@/lib/api";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const { lines, total, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Extract current shop ID from active items
  const currentShopId = lines[0]?.shop_id;

  // 🚀 Fetch current shop information for header layout identity
  const { data: shop } = useQuery({
    queryKey: ["shop", currentShopId],
    queryFn: () => shopsApi.get(currentShopId!),
    enabled: !!currentShopId,
  });

  function checkout() {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    navigate({ to: "/checkout" });
  }

  return (
    <div className="min-h-screen">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link to="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Continue shopping
        </Link>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Your cart</h1>

        {count === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Your cart is empty.</p>
              <Link to="/" className="mt-4">
                <Button>Browse shops</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            
            {/* 🚀 THE FIXED IDENTITY BANNER: Explicitly tells customer who they are ordering from */}
            {shop && (
              <div className="mb-4 rounded-xl border border-border/60 bg-muted/40 p-4 flex items-center gap-3 animate-in fade-in duration-200">
                <div className="bg-primary/10 text-primary p-2 rounded-lg border border-primary/20 shrink-0">
                  <Store className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 text-left">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Items Selected From</p>
                  <h2 className="text-sm font-bold text-foreground tracking-tight">{shop.name}</h2>
                </div>
              </div>
            )}

            {lines.map((l) => (
              <Card key={`${l.item_id}-${l.variant_id ?? "_"}`}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <p className="font-medium">{l.name}</p>
                    {l.variant_name && (
                      <p className="text-xs text-muted-foreground">{l.variant_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatCurrency(l.unit_price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cart.setQuantity(l.item_id, l.variant_id, l.quantity - 1)}
                    >
                      −
                    </Button>
                    <span className="w-6 text-center text-sm">{l.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cart.setQuantity(l.item_id, l.variant_id, l.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <div className="w-20 text-right font-semibold">
                    {formatCurrency(l.unit_price * l.quantity)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => cart.remove(l.item_id, l.variant_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Card className="mt-6">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <Button className="w-full" size="lg" onClick={checkout}>
                  {user ? "Proceed to checkout" : "Sign in to checkout"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}