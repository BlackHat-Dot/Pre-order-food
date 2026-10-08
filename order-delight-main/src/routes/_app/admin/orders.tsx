import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi, type AdminOrderOut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { ShoppingBag, User2, Store, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/admin/orders")({ component: AdminOrders });

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  accepted: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  confirmed: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  preparing: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  ready: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  completed: "border-green-500/40 bg-green-500/10 text-green-400",
  cancelled: "border-red-500/40 bg-red-500/10 text-red-400",
};

const STATUSES = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];

function OrderRow({ o }: { o: AdminOrderOut }) {
  const style = STATUS_STYLES[o.status] ?? "";
  return (
    <Card className="border-border/50 hover:border-border transition-colors">
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 10)}</span>
            <Badge variant="outline" className={`text-xs capitalize ${style}`}>{o.status}</Badge>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User2 className="h-3 w-3" />{o.customer_name}
            </span>
            <span className="flex items-center gap-1">
              <Store className="h-3 w-3" />{o.shop_name}
            </span>
            <span className="flex items-center gap-1">
              <ShoppingBag className="h-3 w-3" />{o.payment_method} · {o.payment_status}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <p className="text-base font-bold">{formatCurrency(o.total_price)}</p>
          <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminOrders() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", status, page],
    queryFn: () => adminApi.listOrders({
      page,
      page_size: 25,
      status: status === "all" ? undefined : status,
    }),
  });

  const total = data?.reduce((s, o) => s + o.total_price, 0) ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.length} orders shown · ${formatCurrency(total)} total` : "All platform orders"}
          </p>
        </div>
      </div>

      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize">{s}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((o) => <OrderRow key={o.id} o={o} />)}
          {data?.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">No orders found.</CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 py-2 text-sm font-medium">Page {page}</span>
        <Button variant="outline" size="sm" disabled={!data || data.length < 25} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
