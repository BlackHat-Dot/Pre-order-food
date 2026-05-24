import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi, type AdminOrderOut } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { ShoppingBag, User2, Store, ChevronLeft, ChevronRight, Key, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/orders")({ component: AdminOrders });

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing"],
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

const STATUSES = ["all", "pending", "accepted", "preparing", "ready", "completed", "cancelled"];

export function OrderRow({ o }: { o: AdminOrderOut }) {
  const qc = useQueryClient();
  
  const updateStatus = useMutation({
    mutationFn: (newStatus: string) => adminApi.updateOrderStatus(o.id, newStatus),
    onSuccess: () => {
      toast.success("Order status updated successfully");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update order status.");
    }
  });

  const currentStatus = o.status.toLowerCase();
  const availableOptions = ALLOWED_TRANSITIONS[currentStatus] || [];
  const badgeStyle = STATUS_COLORS[currentStatus] || "bg-muted text-muted-foreground";

  return (
    <Card className="border-border/60 hover:border-border transition-colors text-left shadow-sm">
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">#{o.id.slice(0, 10)}</span>
            
            {availableOptions.length === 0 ? (
              <Badge variant="outline" className={`text-xs capitalize font-semibold ${badgeStyle}`}>
                {o.status}
              </Badge>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={`text-xs capitalize font-semibold cursor-pointer hover:opacity-80 transition-opacity ${badgeStyle} ${updateStatus.isPending ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {updateStatus.isPending ? "Updating..." : `${o.status} ▾`}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl p-1 shadow-md">
                  {availableOptions.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      className="capitalize cursor-pointer text-xs font-semibold rounded-lg"
                      onClick={() => updateStatus.mutate(status)}
                    >
                      Move to {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
            <span 
              onClick={() => {
                navigator.clipboard.writeText(o.customer_id);
                toast.success("User UID copied!");
              }}
              className="inline-flex items-center gap-1 font-mono text-[10px] bg-muted hover:bg-muted/80 text-foreground px-2 py-0.5 rounded border border-border/80 transition-colors cursor-pointer select-all shadow-sm"
              title="Click to copy full User UID"
            >
              <Key className="h-2.5 w-2.5 text-muted-foreground" />
              <span>UID: {o.customer_id.slice(0, 8)}...</span>
            </span>

            <span className="flex items-center gap-1">
              <User2 className="h-3 w-3 text-muted-foreground/70" />{o.customer_name}
            </span>
            <span className="flex items-center gap-1">
              <Store className="h-3 w-3 text-muted-foreground/70" />{o.shop_name}
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <ShoppingBag className="h-3 w-3 text-muted-foreground/70 inline" /> {o.payment_method} · {o.payment_status}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <p className="text-base font-bold text-foreground">{formatCurrency(o.total_price)}</p>
          <p className="text-xs text-muted-foreground font-mono">{formatDate(o.created_at)}</p>
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
      
      {/* 🚀 FIXED HEADER TOOLBAR: Clean placement architecture for the navigation button control */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-left border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Orders Dashboard <Badge variant="secondary" className="font-mono text-[10px]">Admin</Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data ? `${data.length} orders shown · ${formatCurrency(total)} platform volume` : "Manage system orders"}
          </p>
        </div>

        {/* 🚀 ACTION LINK GATEWAY: Connects administrators directly to customer cancellation requests with an alert icon */}
        <Link to="/admin/escalations">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs font-bold rounded-xl h-9 px-3.5 border-amber-500/30 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 transition-colors gap-2"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Cancellation Requests</span>
          </Button>
        </Link>
      </div>

      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
        <TabsList className="flex-wrap h-auto gap-1 p-1 rounded-xl">
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize px-3 py-1.5 rounded-lg">
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((o) => <OrderRow key={o.id} o={o} />)}
          {data?.length === 0 && (
            <Card className="border-dashed border-border/60 rounded-xl">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No orders found under this status filter.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 py-1.5 text-xs font-mono font-bold bg-muted border rounded-lg">Page {page}</span>
        <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={!data || data.length < 25} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}