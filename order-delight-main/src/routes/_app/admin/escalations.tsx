import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { ShieldAlert, ArrowLeft, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/_app/admin/escalations")({
  component: AdminEscalationsDashboard,
});

function AdminEscalationsDashboard() {
  const qc = useQueryClient();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { data: escalatedOrders, isLoading } = useQuery({
    queryKey: ["admin", "escalated-orders"],
    queryFn: async () => {
      return await apiRequest<any[]>("/api/v1/admin/orders/escalated", { method: "GET" });
    },
    refetchInterval: 5000,
  });

  const adminOverrideMutation = useMutation({
    mutationFn: async ({ orderId, action, reason }: { orderId: string; action: string; reason?: string }) => {
      setResolvingId(orderId);
      return await apiRequest(`/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        body: { status: action, reason },
      });
    },
    onSuccess: () => {
      toast.success("Resolution applied successfully");
      qc.invalidateQueries({ queryKey: ["admin", "escalated-orders"] });
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (err: any) => {
      if (err?.message && typeof err.message === "string") {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong");
      }
    },
    onSettled: () => setResolvingId(null),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Global Cancellation Requests</h1>
            <p className="text-xs text-muted-foreground">
              Direct administrative overriding dashboard for handling platform-wide user dispute concerns.
            </p>
          </div>
        </div>
        <Link to="/admin/orders">
          <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 h-9">
            <ArrowLeft className="h-4 w-4" /> Back to Master Orders
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : !escalatedOrders || escalatedOrders.length === 0 ? (
        <Card className="border-dashed border-2 rounded-2xl bg-muted/10">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No pending cancellation requests found across the platform.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {escalatedOrders.map((o: any) => (
            <Card key={o.id} className="overflow-hidden rounded-2xl border border-border text-left shadow-sm bg-card">
              <CardContent className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-bold text-muted-foreground">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </p>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Placed on {formatDate(o.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-sm">{formatCurrency(o.total_price)}</span>
                    
                    <Select
                      value={o.status}
                      disabled={resolvingId !== null}
                      onValueChange={(v) => {
                        adminOverrideMutation.mutate({ 
                          orderId: o.id, 
                          action: v, 
                          reason: v === "accepted" ? "" : o.cancellation_reason 
                        });
                      }}
                    >
                      <SelectTrigger className="w-48 capitalize font-semibold text-xs rounded-xl h-8">
                        <SelectValue placeholder="Select Resolution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cancel_requested" disabled className="text-muted-foreground text-xs font-bold">
                          Select Resolution
                        </SelectItem>
                        <SelectItem value="cancelled" className="text-xs font-medium text-destructive">
                          Accept Request (Cancel)
                        </SelectItem>
                        <SelectItem value="accepted" className="text-xs font-medium text-emerald-600">
                          Decline Request (Resume)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {o.cancellation_reason && (
                  <div className="bg-amber-500/5 p-4 flex gap-2.5 items-start text-xs border-t border-border/20">
                    <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground">Customer's Stated Reason:</span>
                      <p className="text-muted-foreground italic font-medium">"{o.cancellation_reason}"</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}