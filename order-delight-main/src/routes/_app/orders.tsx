import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersApi, type OrderStatus } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/_app/orders")({ component: OrdersPage });

const tabs: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function OrdersPage() {
  const [status, setStatus] = useState<string>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-orders", status],
    queryFn: () =>
      ordersApi.list({ page: 1, page_size: 50, status: status === "all" ? undefined : (status as OrderStatus) }),
  });

  // 🚀 FIXED: Status filtering layer prunes the card elements array in real-time
  const visibleOrders = Array.isArray(data) 
    ? data.filter((o: any) => {
        if (status === "all") return true;
        if (status === "cancelled") return o.status === "cancelled" || o.status === "cancel_requested";
        return o.status === status;
      })
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="text-left">
        <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
        <p className="text-sm text-muted-foreground">Track and manage your pre-orders.</p>
      </div>

      <Tabs value={status} onValueChange={setStatus} className="w-full">
        <TabsList className="flex flex-wrap h-auto p-1 bg-muted rounded-xl">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="rounded-lg text-xs py-1.5 px-3">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : visibleOrders.length === 0 ? (
        <Card className="border-dashed rounded-2xl">
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            No orders found matching this status window.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((o) => (
            /* 🚀 FIXED: Absolute path router template mapping targets details view with no conflicting properties */
            <Link 
              key={o.id} 
              to="/orders/$orderId" 
              params={{ orderId: o.id }} 
              className="block cursor-pointer transition-transform active:scale-[0.995]"
            >
              <Card className="transition-all hover:border-primary/40 text-left rounded-2xl">
                <CardContent className="p-5 space-y-4">
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60 font-bold">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {formatDate(o.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-foreground">{formatCurrency(o.total_price)}</p>
                      {o.shop_name && (
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">{o.shop_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/40 border border-border/40 rounded-xl p-3 text-xs space-y-2">
                    {o.items && o.items.length > 0 ? (
                      <div className="space-y-1.5 divide-y divide-border/20">
                        {o.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between pt-1.5 first:pt-0 gap-4 text-left">
                            <span className="font-semibold text-foreground">
                              {item.item_name_snapshot || item.name} {item.variant_name_snapshot ? `(${item.variant_name_snapshot})` : ""}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border shrink-0 font-bold">
                              ×{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic">Standard Basket Content</p>
                    )}
                  </div>

                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}