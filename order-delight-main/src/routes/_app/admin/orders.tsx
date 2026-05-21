import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi, type AdminOrderOut } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";
import { ShoppingBag, User2, Store, ChevronLeft, ChevronRight, Loader2, Key, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/orders")({ component: AdminOrders });

// State matrix transition workflow rules
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

const STATUSES = ["all", "pending", "accepted", "preparing", "ready", "completed", "cancelled"];

export function OrderRow({ o }: { o: AdminOrderOut }) {
  const qc = useQueryClient();
  
  // FIXED: Points directly to adminApi.updateOrderStatus to leverage your custom URL queries
  const updateStatus = useMutation({
    mutationFn: (newStatus: string) => adminApi.updateOrderStatus(o.id, newStatus),
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
    <Card className="border-border/40 hover:border-amber-500/30 bg-card/40 backdrop-blur-sm transition-all duration-300 group shadow-sm text-left">
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">#{o.id.slice(0, 10)}</span>
            
            {availableOptions.length === 0 ? (
              <Badge variant="outline" className={`text-xs capitalize font-bold ${badgeStyle}`}>
                {o.status}
              </Badge>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={`text-xs capitalize font-bold cursor-pointer hover:opacity-80 transition-opacity shadow-sm ${badgeStyle} ${updateStatus.isPending ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {updateStatus.isPending ? "Updating..." : `${o.status} ▾`}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-xl p-1 shadow-md border-border/60">
                  {availableOptions.map((status) => (
                    <DropdownMenuItem
                      key={status}
                      className="capitalize cursor-pointer text-xs font-bold rounded-lg m-0.5 focus:bg-muted"
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
            {/* 🚀 HIGH UTILITY: Interactive, stylized raw User UID badge container */}
            <span 
              onClick={() => {
                navigator.clipboard.writeText(o.customer_id);
                toast.success("User UID copied to clipboard!");
              }}
              className="inline-flex items-center gap-1 font-mono text-[10px] bg-muted hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30 text-foreground/80 px-2 py-0.5 rounded-md border border-border/60 transition-all cursor-pointer select-all shadow-sm shrink-0"
              title="Click to copy full User UID"
            >
              <Key className="h-2.5 w-2.5 text-muted-foreground/70 group-hover:text-amber-400" />
              <span>UID: {o.customer_id.slice(0, 8)}...</span>
            </span>

            <span className="flex items-center gap-1 font-medium">
              <User2 className="h-3 w-3 text-muted-foreground/70" />{o.customer_name}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Store className="h-3 w-3 text-muted-foreground/70" />{o.shop_name}
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground/60">
              <ShoppingBag className="h-3 w-3 text-muted-foreground/70 inline mr-1" />{o.payment_method} · {o.payment_status}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <p className="text-base font-black tracking-tight text-foreground">{formatCurrency(o.total_price)}</p>
          <p className="text-xs font-mono text-muted-foreground/70">{formatDate(o.created_at)}</p>
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
      
      {/* 🚀 ELITE VIEW UPGRADE: High-Authority Core Terminal Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 text-left border-b border-amber-500/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Platform Transaction Ledger
            </h1>
            <Badge variant="outline" className="font-mono text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20 px-2 py-0.5 rounded-md uppercase tracking-widest font-black shadow-[0_0_12px_-3px_rgba(245,158,11,0.2)] animate-pulse">
              System Override Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            {data ? `${data.length} records buffered · ${formatCurrency(total)} aggregate transaction volume` : "All platform orders"}
          </p>
        </div>
      </div>

      {/* 🚀 GLOWING AUTHORITY SUB-HEADER DECORATION BAR */}
      <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent px-4 py-3 text-[11px] font-mono tracking-wider text-amber-400 uppercase shadow-[0_0_20px_-6px_rgba(245,158,11,0.15)]">
        <ShieldCheck className="h-4 w-4 text-amber-400 waves-animation animate-spin [animation-duration:5s]" />
        <span>Audit Privileges: Authorized to intercept and modify live state machines</span>
      </div>

      <Tabs value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
        <TabsList className="flex-wrap h-auto gap-1 p-1 rounded-xl border border-border/60">
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs capitalize font-semibold rounded-lg px-3 py-1.5 data-[state=active]:bg-muted data-[state=active]:text-foreground">
              {s}
            </TabsTrigger>
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
            <Card className="border-dashed border-border/60 rounded-2xl">
              <CardContent className="py-12 text-center text-muted-foreground text-sm font-medium">
                No active transaction contracts found matching criteria.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" className="h-8 rounded-xl" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 py-2 text-xs font-mono font-bold bg-muted/40 border rounded-xl">PAGE {page}</span>
        <Button variant="outline" size="sm" className="h-8 rounded-xl" disabled={!data || data.length < 25} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}