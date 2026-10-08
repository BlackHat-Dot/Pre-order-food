import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ordersApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/app/StatusBadge";
import { PO_CSS } from "@/components/app/PublicNav";

export const Route = createFileRoute("/_app/orders")({ component: OrdersPage });

const tabs = ["all", "pending", "preparing", "ready", "completed", "cancelled"];

function OrdersPage() {
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", status],
    queryFn: () => ordersApi.myOrders({ page: 1, page_size: 50, status: status === "all" ? undefined : status }),
  });

  return (
    <div className="po" style={{ margin: -24, padding: "40px 24px", minHeight: "100%" }}>
      <style>{PO_CSS}{`.tabs{display:flex;flex-wrap:wrap;gap:4px 20px;margin-top:28px;border-bottom:1px solid var(--rule)}
      .tabs button{background:none;border:0;border-bottom:2px solid transparent;padding:8px 0;font:500 15px "Instrument Sans";color:var(--mute);cursor:pointer;text-transform:capitalize}
      .tabs button[aria-selected=true]{color:var(--ink);border-color:var(--sig)}
      .orow{display:grid;grid-template-columns:1fr auto;gap:16px;padding:18px 0;border-bottom:1px solid var(--rule)}
      .orow:hover .disp{color:var(--sig)}`}</style>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(36px,5vw,60px)" }}>My orders</h1>
        <p className="hint" style={{ fontSize: 16 }}>Every pre-order you have placed, newest first.</p>
        <div className="tabs" role="tablist">
          {tabs.map((t) => <button key={t} role="tab" aria-selected={status === t} onClick={() => setStatus(t)}>{t}</button>)}
        </div>
        {isLoading ? (
          <p className="hint" style={{ marginTop: 24 }}>Loading orders…</p>
        ) : !data || data.length === 0 ? (
          <p className="hint" style={{ marginTop: 24, fontSize: 16 }}>
            {status === "all" ? "You haven't placed an order yet. Pick a kitchen from the home page to start." : `No ${status} orders.`}
          </p>
        ) : (
          data.map((o) => (
            <Link key={o.id} to="/orders/$orderId" params={{ orderId: o.id }} className="orow">
              <div>
                <p className="disp" style={{ fontSize: 22 }}>{formatCurrency(o.total)}</p>
                <p className="hint" style={{ marginTop: 2 }}>#{o.id.slice(0, 8)} · {o.items?.length ?? 0} {o.items?.length === 1 ? "item" : "items"} · {formatDate(o.created_at)}</p>
              </div>
              <StatusBadge status={o.status} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
