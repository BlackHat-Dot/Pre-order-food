import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, ShoppingBag, ChevronLeft } from "lucide-react";
import { PublicNav } from "@/components/app/PublicNav";
import { useCart, cart } from "@/lib/cart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const { lines, total, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

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
