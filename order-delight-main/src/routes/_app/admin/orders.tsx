import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi, type OrderStatus } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/app/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/orders")({ component: AdminOrders });

const STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];

function AdminOrders() {
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", status],
    queryFn: () => adminApi.listOrders({ page: 1, page_size: 100, status: status === "all" ? undefined : status }),
  });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
      <Tabs value={status} onValueChange={setStatus}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((o) => (
            <Card key={o.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                <StatusBadge status={o.status} />
                <span className="text-sm text-muted-foreground">{formatDate(o.created_at)}</span>
                <span className="ml-auto font-semibold">{formatCurrency(o.total)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
