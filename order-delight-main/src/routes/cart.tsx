import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Trash2,
  ShoppingBag,
  ChevronLeft,
  Store,
  AlertTriangle,
} from "lucide-react";

import { PublicNav } from "@/components/app/PublicNav";
import { useCart, cart } from "@/lib/cart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { shopsApi } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { lines, total, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isShopOwner = user?.role === "shop_owner";
  const currentShopId = lines[0]?.shop_id;

  const { data: shop } = useQuery({
    queryKey: ["shop", currentShopId],
    queryFn: () => shopsApi.get(currentShopId!),
    enabled: !!currentShopId,
  });

  // Total quantity currently inside cart
  const currentTotalQuantity = lines.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  const handleIncrement = (
    itemId: string,
    variantId: string | null | undefined,
    currentQty: number
  ) => {
    // Prevent cart overflow
    if (currentTotalQuantity >= 10) {
      toast.warning(
        "Cart Limit Reached: You can only place a maximum of 10 items per single order ticket."
      );
      return;
    }

    cart.setQuantity(itemId, variantId ?? null, currentQty + 1);
  };

  const handleDecrement = (
    itemId: string,
    variantId: string | null | undefined,
    currentQty: number
  ) => {
    cart.setQuantity(
      itemId,
      variantId ?? null,
      Math.max(1, currentQty - 1)
    );
  };

  function checkout() {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    if (isShopOwner) return;

    navigate({ to: "/checkout" });
  }

  return (
    <div className="min-h-screen">
      <PublicNav />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          to="/"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Continue shopping
        </Link>

        <h1 className="mb-6 text-2xl font-bold tracking-tight">
          Your cart
        </h1>

        {count === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground" />

              <p className="text-muted-foreground">
                Your cart is empty.
              </p>

              <Link to="/" className="mt-4">
                <Button>Browse shops</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {shop && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-4 animate-in fade-in duration-200">
                <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                  <Store className="h-4 w-4" />
                </div>

                <div className="space-y-0.5 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Items Selected From
                  </p>

                  <h2 className="text-sm font-bold tracking-tight text-foreground">
                    {shop.name}
                  </h2>
                </div>
              </div>
            )}

            {isShopOwner && (
              <div className="my-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left shadow-sm animate-in zoom-in-95 duration-200">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">
                    Action Restricted for Shop Owners
                  </h4>

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    You are currently authenticated via a{" "}
                    <span className="font-semibold text-foreground">
                      Shop Owner Account
                    </span>
                    . To protect merchant balances, store managers
                    cannot submit checkout orders. Please sign out
                    and create a dedicated{" "}
                    <span className="font-semibold text-amber-500">
                      Customer Account
                    </span>{" "}
                    to complete your purchase.
                  </p>
                </div>
              </div>
            )}

            {lines.map((l) => (
              <Card key={`${l.item_id}-${l.variant_id ?? "_"}`}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">
                      {l.name}
                    </p>

                    {l.variant_name && (
                      <p className="text-xs text-muted-foreground">
                        {l.variant_name}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(l.unit_price)} each
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDecrement(
                          l.item_id,
                          l.variant_id,
                          l.quantity
                        )
                      }
                    >
                      −
                    </Button>

                    <span className="w-6 text-center text-sm font-semibold">
                      {l.quantity}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleIncrement(
                          l.item_id,
                          l.variant_id,
                          l.quantity
                        )
                      }
                    >
                      +
                    </Button>
                  </div>

                  <div className="w-20 text-right text-sm font-semibold text-foreground">
                    {formatCurrency(l.unit_price * l.quantity)}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      cart.remove(l.item_id, l.variant_id ?? null)
                    }
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground transition-colors hover:text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Card className="mt-6">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Subtotal
                  </span>

                  <span className="font-medium">
                    {formatCurrency(total)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-base font-bold">
                  <span>Total</span>

                  <span className="text-foreground">
                    {formatCurrency(total)}
                  </span>
                </div>

                <Button
                  className="h-11 w-full rounded-xl text-xs font-bold"
                  size="lg"
                  onClick={checkout}
                  disabled={isShopOwner}
                >
                  {isShopOwner
                    ? "Checkout Disabled for Shop Owners"
                    : user
                    ? "Proceed to checkout"
                    : "Sign in to checkout"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}