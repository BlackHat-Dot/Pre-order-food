import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PublicNav } from "@/components/app/PublicNav";
import { useCart, cart } from "@/lib/cart";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const { lines, total, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="po" style={{ minHeight: "100vh" }}>
      <PublicNav />
      <div className="wrap">
        <h1 style={{ fontSize: "clamp(40px,6vw,72px)" }}>Your cart</h1>
        {count === 0 ? (
          <div style={{ marginTop: 40, borderTop: "1px solid var(--ink)", paddingTop: 24 }}>
            <p className="hint" style={{ fontSize: 17 }}>Nothing here yet. A cart holds items from one kitchen at a time.</p>
            <Link to="/" className="po-btn" style={{ marginTop: 20 }}>Find a kitchen</Link>
          </div>
        ) : (
          <div className="split" style={{ marginTop: 40 }}>
            <div style={{ borderTop: "1px solid var(--ink)" }}>
              {lines.map((l) => (
                <div className="ln" key={`${l.item_id}-${l.variant_id ?? "_"}`} style={{ alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <p className="disp" style={{ fontSize: 22 }}>{l.name}</p>
                    <p className="hint" style={{ marginTop: 2 }}>{l.variant_name ? `${l.variant_name} · ` : ""}{formatCurrency(l.unit_price)} each</p>
                    <button onClick={() => cart.remove(l.item_id, l.variant_id)} className="hint" style={{ background: "none", border: 0, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Remove</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button className="step" aria-label={`Decrease ${l.name}`} onClick={() => cart.setQuantity(l.item_id, l.variant_id, l.quantity - 1)}>−</button>
                    <span style={{ width: 24, textAlign: "center" }}>{l.quantity}</span>
                    <button className="step" aria-label={`Increase ${l.name}`} disabled={l.quantity >= 10} onClick={() => cart.setQuantity(l.item_id, l.variant_id, l.quantity + 1)}>+</button>
                  </div>
                  <strong style={{ width: 84, textAlign: "right" }}>{formatCurrency(l.unit_price * l.quantity)}</strong>
                </div>
              ))}
              <p className="hint">Maximum 10 of each item per order.</p>
            </div>
            <div style={{ borderTop: "1px solid var(--ink)", paddingTop: 20 }}>
              <div className="ln" style={{ border: 0, padding: "0 0 16px" }}>
                <span className="disp" style={{ fontSize: 22 }}>Subtotal</span>
                <span className="disp" style={{ fontSize: 22 }}>{formatCurrency(total)}</span>
              </div>
              <p className="hint">Loyalty points and pickup time are chosen at checkout.</p>
              <button className="po-btn" style={{ marginTop: 20, width: "100%", justifyContent: "center" }} onClick={() => navigate({ to: user ? "/checkout" : "/login" })}>
                {user ? "Continue to checkout" : "Sign in to check out"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
