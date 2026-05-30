import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { 
  Clock, 
  Store, 
  User, 
  CreditCard, 
  Utensils, 
  Bike, 
  Phone, 
  MapPin, 
  Percent, 
  Trash2,
  Eye,
  X,
  Tag,
  Coins
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/orders")({ component: AdminGlobalOrdersPage });

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  accepted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  preparing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  ready: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

function AdminGlobalOrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-global-orders-ledger", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/api/v1/admin/orders" : `/api/v1/admin/orders?status=${statusFilter}`;
      return await apiRequest<any[]>(url, { method: "GET" });
    },
    refetchInterval: 5000,
  });

  const forceCancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setUpdatingId(orderId);
      return await apiRequest(`/api/v1/admin/orders/${orderId}/override`, {
        method: "POST",
        body: { status: "cancelled" }
      });
    },
    onSuccess: () => {
      toast.success("Administrative cancellation applied.");
      qc.invalidateQueries({ queryKey: ["admin-global-orders-ledger"] });
      setSelectedOrder(null);
    },
    onError: (err: any) => {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else if (err?.message && typeof err.message === "string") {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong");
      }
    },
    onSettled: () => setUpdatingId(null),
  });

  const visibleOrders = Array.isArray(orders) ? orders : [];

  const calculateDiscountPercentage = (order: any): number => {
    const couponDiscount = Number(order?.coupon_discount_applied || 0);
    const loyaltyDiscount = Number(order?.loyalty_discount_amount || 0);
    const totalDiscount = couponDiscount + loyaltyDiscount;
    const originalAmount = Number(order?.total_price || 0) + totalDiscount;

    if (originalAmount <= 0) {
      return totalDiscount > 0 ? 100 : 0;
    }

    return Math.round((totalDiscount / originalAmount) * 100);
  };

  useEffect(() => {
    if (selectedOrder && visibleOrders.length > 0) {
      const currentFreshInstance = visibleOrders.find((o: any) => o?.id === selectedOrder.id);
      if (currentFreshInstance) {
        setSelectedOrder(currentFreshInstance);
      }
    }
  }, [visibleOrders, selectedOrder]);

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      
      {/* ─── LEFT PANEL: HIGH-DENSITY SCAN LEAN LIST ─── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-5xl mx-auto w-full transition-all duration-300">
        <div className="flex items-center justify-between border-b pb-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Orders</h1>
          
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-8 p-0.5 bg-muted rounded-lg border shadow-none">
              <TabsTrigger value="all" className="text-xs px-2.5 py-1 rounded-md">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs px-2.5 py-1 rounded-md">Pending</TabsTrigger>
              <TabsTrigger value="accepted" className="text-xs px-2.5 py-1 rounded-md">Accepted</TabsTrigger>
              <TabsTrigger value="preparing" className="text-xs px-2.5 py-1 rounded-md">Preparing</TabsTrigger>
              <TabsTrigger value="ready" className="text-xs px-2.5 py-1 rounded-md">Ready</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs px-2.5 py-1 rounded-md">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
            No system order logs matching selection constraints.
          </div>
        ) : (
          <div className="space-y-2">
            {visibleOrders.map((o: any) => {
              if (!o) return null;
              
              const currentStatus = (o.status || "pending").toLowerCase();
              const badgeStyle = STATUS_COLORS[currentStatus] || "bg-muted text-muted-foreground border-transparent";
              const isTableMode = String(o.order_type || "").toLowerCase() === "table_booking" || !o.delivery_address;
              const hasCouponDiscount = Number(o.coupon_discount_applied || 0) > 0;

              return (
                <Card 
                  key={o.id} 
                  className={`border border-border/50 shadow-none rounded-lg hover:border-border/100 transition-all cursor-pointer ${
                    selectedOrder?.id === o.id ? "bg-muted/40 border-primary/30" : "bg-card"
                  }`}
                  onClick={() => setSelectedOrder(o)}
                >
                  <CardContent className="p-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-normal">
                    
                    <div className="flex items-center gap-3 w-full md:w-auto text-left shrink-0">
                      <span className="font-mono font-semibold text-foreground bg-muted border px-2 py-0.5 rounded text-[11px]">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 rounded border shadow-none capitalize ${badgeStyle}`}>
                        {currentStatus.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground bg-background px-2 py-0.5 rounded shadow-none border-border/50 gap-1 flex items-center">
                        {isTableMode ? <Utensils className="h-3 w-3 text-amber-500" /> : <Bike className="h-3 w-3 text-blue-500" />}
                        {isTableMode ? "Table" : "Delivery"}
                      </Badge>
                      {hasCouponDiscount && (
                        <Badge variant="outline" className={`text-[10px] ${currentStatus === 'cancelled' ? 'bg-rose-500/10 text-rose-700 border-rose-500/20 line-through opacity-70' : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'} font-medium px-1.5 py-0.5 rounded gap-1 flex items-center shadow-none`}>
                          <Tag className="h-2.5 w-2.5" /> Coupon
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-1 text-left sm:text-right text-muted-foreground text-[11px] flex-1 min-w-0">
                      <div className="truncate"><span className="text-foreground font-medium">Customer:</span> {o.customer_name || "Guest"}</div>
                      <div className="truncate"><span className="text-foreground font-medium">Shop:</span> {o.shop_name || "Store"}</div>
                      <div className="sm:ml-auto font-mono text-muted-foreground/80">{formatDate(o.created_at)}</div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-border/20 shrink-0">
                      <span className={`font-semibold text-sm text-foreground tracking-tight min-w-[70px] text-right ${currentStatus === 'cancelled' ? 'line-through text-muted-foreground opacity-60' : ''}`}>
                        {formatCurrency(o.total_price)}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] font-medium px-2 rounded text-primary gap-1">
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── RIGHT PANEL: SCALED ENTERPRISE DRAWER ─── */}
      {selectedOrder && (
        <div className="w-[380px] h-full bg-card border-l border-border/60 shadow-xl flex flex-col text-left animate-in slide-in-from-right duration-200 shrink-0 z-50">
          
          <div className="p-4 border-b border-border/40 flex items-center justify-between bg-background/40">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-foreground">
                  #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </span>
                <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 rounded shadow-none capitalize ${STATUS_COLORS[selectedOrder.status?.toLowerCase()] || ""}`}>
                  {selectedOrder.status}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">{formatDate(selectedOrder.created_at)}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-muted" onClick={() => setSelectedOrder(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-normal">
            
            <div className="space-y-2 bg-muted/30 border border-border/40 p-3 rounded-lg">
              <div className="grid grid-cols-[70px_1fr] gap-x-2 gap-y-1.5 leading-normal">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold text-foreground">{selectedOrder.customer_name}</span>
                
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-mono text-foreground font-medium">{selectedOrder.customer_phone || "—"}</span>
                
                <span className="text-muted-foreground">Shop:</span>
                <span className="font-semibold text-foreground">{selectedOrder.shop_name}</span>
                
                <span className="text-muted-foreground">Payment:</span>
                <span className="font-medium text-foreground uppercase text-[11px]">
                  {selectedOrder.payment_method} · <span className="text-muted-foreground lowercase">({selectedOrder.payment_status})</span>
                </span>
              </div>
            </div>

            {/* ─── DYNAMIC SUB-TOTAL EXPLICIT VOUCHER BREAKDOWN GRID ─── */}
            <div className={`grid grid-cols-2 gap-2 ${selectedOrder.status?.toLowerCase() === 'cancelled' ? 'opacity-70 grayscale' : ''}`}>
              <div className="border border-border/40 bg-background/50 rounded-lg p-2.5 flex items-center gap-2.5">
                <Percent className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Off Rate</p>
                  <p className="font-bold text-emerald-600 text-sm leading-tight">
                    {calculateDiscountPercentage(selectedOrder)}%
                  </p>
                </div>
              </div>

              {Number(selectedOrder.coupon_discount_applied || 0) > 0 && (
                <div className={`border ${selectedOrder.status?.toLowerCase() === 'cancelled' ? 'border-rose-500/20 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'} rounded-lg p-2.5 flex items-center gap-2.5`}>
                  <Tag className={`h-4 w-4 ${selectedOrder.status?.toLowerCase() === 'cancelled' ? 'text-rose-600' : 'text-emerald-600'} shrink-0`} />
                  <div>
                    <p className={`text-[10px] ${selectedOrder.status?.toLowerCase() === 'cancelled' ? 'text-rose-700/80' : 'text-emerald-700/80'} uppercase tracking-wider font-medium`}>
                      {selectedOrder.status?.toLowerCase() === 'cancelled' ? 'Refunded Off' : 'Coupon Off'}
                    </p>
                    <p className={`font-black ${selectedOrder.status?.toLowerCase() === 'cancelled' ? 'text-rose-600 line-through' : 'text-emerald-600'} text-[13px] leading-tight`}>
                      -{formatCurrency(selectedOrder.coupon_discount_applied)}
                    </p>
                  </div>
                </div>
              )}

              {Number(selectedOrder.loyalty_discount_amount || 0) > 0 && (
                <div className="border border-blue-500/20 bg-blue-500/5 rounded-lg p-2.5 flex items-center gap-2.5">
                  <Coins className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-blue-700/80 uppercase tracking-wider font-medium">Loyalty Off</p>
                    <p className="font-black text-blue-600 text-[13px] leading-tight">-{formatCurrency(selectedOrder.loyalty_discount_amount)}</p>
                  </div>
                </div>
              )}
            </div>

            {String(selectedOrder.order_type).toLowerCase() !== "table_booking" && selectedOrder.delivery_address && (
              <div className="bg-background border border-border/40 rounded-lg p-3 flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Address</p>
                  <p className="text-foreground text-[11px] font-normal leading-relaxed">{selectedOrder.delivery_address}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-0.5">Items Summary</p>
              <div className="rounded-lg border bg-background p-2 space-y-1">
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-0 border-border/20">
                    <span className="text-foreground font-medium truncate max-w-[220px]">
                      {item.menu_item_name} {item.variant_name ? `(${item.variant_name})` : ""}
                    </span>
                    <div className="flex items-center gap-2 text-right shrink-0">
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {formatCurrency(item.unit_price)}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-foreground bg-muted border px-1.5 py-0 rounded">
                        ×{item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TOTAL COST SUMMARY BLOCK FOR ADMINISTRATIVE TRACKING */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5 text-[11px]">
              {Number(selectedOrder.coupon_discount_applied || 0) > 0 && (
                <div className={`flex justify-between font-medium ${selectedOrder.status?.toLowerCase() === 'cancelled' ? 'text-rose-600/80 line-through' : 'text-muted-foreground'}`}>
                  <span>Coupon Deduction applied:</span>
                  <span className={`${selectedOrder.status?.toLowerCase() === 'cancelled' ? 'text-rose-600' : 'text-emerald-600'} font-bold`}>
                    -{formatCurrency(selectedOrder.coupon_discount_applied)}
                  </span>
                </div>
              )}
              {Number(selectedOrder.loyalty_discount_amount || 0) > 0 && (
                <div className="flex justify-between font-medium text-muted-foreground">
                  <span>Loyalty Discount applied:</span>
                  <span className="text-blue-600 font-bold">-{formatCurrency(selectedOrder.loyalty_discount_amount)}</span>
                </div>
              )}
              <div className="h-px bg-border/40 my-1" />
              <div className={`flex justify-between font-bold text-sm ${selectedOrder.status?.toLowerCase() === 'cancelled' ? 'text-muted-foreground line-through opacity-60' : 'text-foreground'}`}>
                <span>Payable Total:</span>
                <span>{formatCurrency(selectedOrder.total_price)}</span>
              </div>
            </div>

          </div>

          <div className="p-3 border-t border-border/40 bg-background/40 flex items-center shrink-0">
            {selectedOrder.status?.toLowerCase() !== "cancelled" && selectedOrder.status?.toLowerCase() !== "completed" ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={updatingId === selectedOrder.id}
                onClick={() => {
                  if (confirm(`Force override: Cancel transaction #${selectedOrder.id.slice(0, 8).toUpperCase()} unconditionally?`)) {
                    forceCancelMutation.mutate(selectedOrder.id);
                  }
                }}
                className="h-8.5 text-xs font-semibold px-4 rounded-lg shadow-none w-full gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Cancel Order
              </Button>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted border text-center w-full py-2 rounded-lg select-none">
                Record Locked (Archive View)
              </span>
            )}
          </div>

        </div>
      )}

    </div>
  );
}