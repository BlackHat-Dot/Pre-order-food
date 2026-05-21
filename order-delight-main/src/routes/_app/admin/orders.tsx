import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi, apiRequest, type AdminOrderOut } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { ShoppingBag, User2, Store, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/orders")({ component: AdminOrders });

// 🚀 ENFORCED: State matrix transition workflow rules
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "cancelled"], // Only place cancel can take place
  accepted: ["preparing"],            // 🚫 Cancellation is blocked once accepted!
  preparing: ["ready"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

const STATUS_COLORS: Record<string, string> = {
  pending: "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  accepted: "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  preparing: "border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  ready: "border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  completed: "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400",
  cancelled: "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400",
};

const STATUSES = ["pending", "accepted", "preparing", "ready", "completed", "cancelled"];

export function OrderRow({ o }: { o: AdminOrderOut }) {
  const qc = useQueryClient();
  
  const updateStatus = useMutation({
    // 🚀 FIXED: Route pointed specifically to the admin status modifier endpoint context
    mutationFn: (newStatus: string) =>
      apiRequest(`/api/v1/admin/orders/${o.id}/status`, {
        method: "PUT", // Matches administrative pipeline signature update
        body: { status: newStatus },
      }),
    onSuccess: () => {
      toast.success("Order status updated by admin");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update state parameters.");
    }
  });

  const currentStatus = o.status.toLowerCase();
  const availableOptions = ALLOWED_TRANSITIONS[currentStatus] || [];
  const badgeStyle = STATUS_COLORS[currentStatus] || "bg-muted text-muted-foreground";

  return (
    <Card className="border-border/50 hover:border-border transition-colors text-left">
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 10)}</span>
            
            {availableOptions.length === 0 ? (
              <Badge variant="outline" className={`text-xs capitalize ${badgeStyle}`}>
                {o.status}
              </Badge>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={`text-xs capitalize cursor-pointer hover:opacity-80 transition-opacity ${badgeStyle} ${updateStatus.isPending ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {updateStatus.isPending ? "Updating..." : `${o.status} ▾`}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {availableOptions.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      className="capitalize cursor-pointer text-xs font-semibold"
                      onClick={() => updateStatus.mutate(status)}
                    >
                      Move to {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
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
      <div className="flex flex-wrap items-end justify-between gap-4 text-left">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders Registry (Admin)</h1>
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