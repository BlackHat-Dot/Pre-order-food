import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { ChevronRight, AlertOctagon, CheckCircle, XCircle, ShieldAlert, Clock, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/escalations")({
  component: AdminEscalationsDashboard,
});

function AdminEscalationsDashboard() {
  const qc = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // 🚀 Fetch all orders marked with excessive cancellation request attempts across the entire platform
  const { data: escalatedOrders, isLoading } = useQuery({
    queryKey: ["admin", "escalated-orders"],
    queryFn: async () => {
      const orders = await apiRequest<any[]>("/api/v1/admin/orders/escalated", { method: "GET" });
      return orders;
    },
    refetchInterval: 15_000, // Polls every 15 seconds for real-time security tracking
  });

  // 🚀 Admin Override Mutation: Bypasses shop owner permissions to change state directly
  const adminOverrideMutation = useMutation({
    mutationFn: async ({ orderId, action }: { orderId: string; action: "cancelled" | "accepted" }) => {
      setResolvingId(orderId);
      return await apiRequest(`/api/v1/admin/orders/${orderId}/override`, {
        method: "POST",
        body: { status: action },
      });
    },
    onSuccess: (_, variables) => {
      if (variables.action === "cancelled") {
        toast.success("Admin Overrode: Order successfully terminated and customer refunded.");
      } else {
        toast.success("Admin Overrode: Order successfully returned to active kitchen queue.");
      }
      qc.invalidateQueries({ queryKey: ["admin", "escalated-orders"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to execute global override command.");
    },
    onSettled: () => setResolvingId(null),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 text-left">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-destructive/10 text-destructive rounded-xl">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Admin Escalation Center</h1>
          <p className="text-xs text-muted-foreground">
            Reviewing orders with more than 3 cancellation attempts that remain unaddressed by shop owners.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : !escalatedOrders || escalatedOrders.length === 0 ? (
        <Card className="border-dashed border-2 rounded-2xl bg-muted/10">
          <CardContent className="py-12 text-center text-muted-foreground text-xs font-medium">
            Clear skies! No orders have triggered the emergency threshold filter right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {escalatedOrders.map((order: any) => (
            <Card key={order.id} className="overflow-hidden border-destructive/30 shadow-md rounded-2xl bg-background transition-all">
              <div className="bg-destructive/[0.03] px-4 py-2.5 border-b border-destructive/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                  <AlertOctagon className="h-4 w-4 animate-pulse" />
                  <span>CRITICAL DISPUTE THRESHOLD EXCEEDED ({order.cancellation_attempts ?? 4} ATTEMPTS)</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">Registered: {formatDate(order.created_at)}</span>
              </div>
              
              <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="font-mono text-xs font-black bg-muted px-2 py-0.5 rounded border border-border">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-foreground inline-flex items-center gap-1">
                      <Store className="h-3.5 w-3.5 text-muted-foreground" /> Shop ID: {order.shop_id.slice(0, 8)}...
                    </span>
                    <span className="text-xs font-black text-foreground">{formatCurrency(order.total_price)}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border text-xs">
                    <span className="font-bold text-foreground block mb-0.5">Last Logged Reason:</span>
                    <p className="text-muted-foreground italic">"{order.cancellation_reason || "No description provided."}"</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 md:flex-none text-xs rounded-xl h-9 font-bold gap-1.5 px-4"
                    disabled={resolvingId !== null}
                    onClick={() => adminOverrideMutation.mutate({ orderId: order.id, action: "cancelled" })}
                  >
                    <XCircle className="h-4 w-4" /> Force Cancel & Refund
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 md:flex-none text-xs rounded-xl h-9 font-medium gap-1.5 border-input bg-background hover:bg-muted text-foreground px-4"
                    disabled={resolvingId !== null}
                    onClick={() => adminOverrideMutation.mutate({ orderId: order.id, action: "accepted" })}
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-600" /> Overrule & Resume Flow
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}