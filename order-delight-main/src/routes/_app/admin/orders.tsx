import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { 
  Clock, 
  Store, 
  User, 
  CreditCard, 
  Utensils, 
  Bike, 
  ChevronDown, 
  ChevronUp, 
  ChefHat, 
  Phone, 
  MapPin, 
  Percent, 
  Gift,
  Trash2,
  FileText
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/_app/admin/orders")({ component: AdminGlobalOrdersPage });

const tabs: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Master Tickets" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function getCancellationRequestsCount(orderObj: any): number {
  if (!orderObj) return 0;
  const rawValue = 
    orderObj.cancellation_requests_sent ?? 
    orderObj.cancellationRequestsSent ?? 
    orderObj.cancellation_request_sent ?? 
    orderObj.cancellationRequestSent ?? 
    0;
  const parsed = Number(rawValue);
  return isNaN(parsed) ? 0 : parsed;
}

function AdminGlobalOrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Query platform wide admin order collection endpoint
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-global-orders-ledger", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/api/v1/admin/orders" : `/api/v1/admin/orders?status=${statusFilter}`;
      return await apiRequest<any[]>(url, { method: "GET" });
    },
    refetchInterval: 5000,
  });

  // Global Administrative Override: Force transition directly to cancelled state
  const forceCancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setUpdatingId(orderId);
      return await apiRequest(`/api/v1/admin/orders/${orderId}/status?status=cancelled`, {
        method: "PUT",
      });
    },
    onSuccess: () => {
      toast.success("Order administrative cancellation override applied successfully.");
      qc.invalidateQueries({ queryKey: ["admin-global-orders-ledger"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Override instruction execution rejected.");
    },
    onSettled: () => setUpdatingId(null),
  });

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const visibleOrders = Array.isArray(orders) ? orders : [];

  return (
    <div className="space-y-6 text-left p-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      <div className="text-left space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          Global Orders Management Ledger
        </h1>
        <p className="text-sm text-muted-foreground">
          Master Command Center Panel · All System Transactions Matrix
        </p>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="flex flex-wrap h-auto p-1 bg-muted rounded-xl max-w-fit border border-border/40">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="rounded-lg text-xs py-1.5 px-3.5 font-medium">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-2xl animate-pulse" />
          <Skeleton className="h-32 w-full rounded-2xl animate-pulse" />
        </div>
      ) : visibleOrders.length === 0 ? (
        <Card className="border-dashed bg-muted/5 rounded-2xl border-2">
          <CardContent className="py-16 text-center text-muted-foreground text-sm font-medium">
            No system order logs matching this selected state criterion.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleOrders.map((o: any) => {
            if (!o) return null;
            
            const isExpanded = !!expandedOrders[o.id];
            const isProcessing = updatingId === o.id;
            const orderStatusStr = (o.status || "pending").toLowerCase();
            
            const methodDisplay = String(o.payment_method || "cod").toUpperCase();
            const isSettled = String(o.payment_status || "pending").toLowerCase() === "paid";
            
            // Mode of food tracking context resolution (Hotel / Table booking vs Food delivery options)
            const isTableMode = String(o.order_type || "").toLowerCase() === "table_booking" || !o.delivery_address_id;
            const cancellationAttemptsCount = getCancellationRequestsCount(o);

            return (
              <Card key={o.id} className="overflow-hidden border border-border/70 rounded-xl bg-card shadow-sm hover:border-border/100 transition-all duration-200">
                <CardContent className="p-0">
                  
                  {/* MAIN COMPACT COMPONENT GRID METRICS LINE HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 bg-background/40">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-black bg-muted px-2.5 py-0.5 rounded border border-border/60 text-foreground">
                          #{o.id ? o.id.slice(0, 8).toUpperCase() : "UNKNOWN"}
                        </span>
                        <StatusBadge status={o.status} />
                        
                        {/* Dynamic Food Delivery or Hotel Table mode specification badges */}
                        <Badge variant="outline" className="text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded bg-background text-muted-foreground gap-1.5 flex items-center shadow-none border-border/80">
                          {isTableMode ? (
                            <>
                              <Utensils className="h-3 w-3 text-amber-500 shrink-0" /> 🪑 Hotel Dine-In Table
                            </>
                          ) : (
                            <>
                              <Bike className="h-3 w-3 text-blue-500 shrink-0" /> 🛵 Food Delivery Route
                            </>
                          )}
                        </Badge>

                        {orderStatusStr === "cancel_requested" && (
                          <Badge className="text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-none rounded px-2">
                            ⚠️ USER CANCEL INTENTS: {cancellationAttemptsCount}/3
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 pl-0.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" /> Time of Order: {formatDate(o.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end flex-wrap gap-4 sm:ml-auto shrink-0 w-full sm:w-auto">
                      <span className="font-bold text-base text-foreground min-w-[80px] text-right mr-2">
                        {formatCurrency(o.total_price)}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        {/* 🚀 OMNIPOTENT CRITICAL CANCEL OVERRIDE ACTION SWITCH ENGINE BUTTON */}
                        {orderStatusStr !== "cancelled" ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isProcessing}
                            onClick={() => {
                              if (confirm(`ADMIN FORCE RESET WARNING: Unconditionally cancel order ticket #${o.id.slice(0,8).toUpperCase()} bypassing all state transition parameters?`)) {
                                forceCancelMutation.mutate(o.id);
                              }
                            }}
                            className="h-8.5 text-[11px] font-bold rounded-xl px-4 shadow-none gap-1.5 hover:bg-red-600 tracking-wide transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Cancel Order
                          </Button>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted border border-border/40 px-3 py-1.5 rounded-lg select-none">
                            Archived Cancellation Complete
                          </span>
                        )}
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8.5 w-8.5 rounded-lg border shrink-0 bg-background hover:bg-muted/40 transition-colors"
                        onClick={() => toggleExpand(o.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  {/* CRITICAL DATA EXPANSION BLOCK WINDOW MATRICES */}
                  {isExpanded && (
                    <div className="bg-muted/10 p-5 space-y-5 border-t border-border/40 animate-in slide-in-from-top-1 duration-200">
                      
                      {/* Customer contact and basic merchant identity data slots */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-muted/20 p-4 rounded-xl border border-border/40 shadow-none">
                        <div className="space-y-1 text-left">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground/80" /> Customer & Order Entity
                          </p>
                          <p className="font-bold text-foreground text-sm tracking-tight">{o.customer_name || "Guest Account Profile"}</p>
                          <p className="text-muted-foreground font-mono text-[10px] truncate max-w-xs">{o.customer_id}</p>
                          {o.customer_phone && (
                            <p className="text-foreground font-bold flex items-center gap-1 mt-1.5 font-mono text-[11px] bg-background border px-2 py-0.5 rounded max-w-fit shadow-none">
                              <Phone className="h-3 w-3 text-muted-foreground shrink-0" /> Phone Vector: {o.customer_phone}
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-left md:border-l md:pl-4 border-border/60">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Store className="h-3 w-3 text-muted-foreground/80" /> Shop Owner Coordinates
                          </p>
                          <p className="font-bold text-foreground text-sm tracking-tight">{o.shop_name || "Restaurant Point Node"}</p>
                          <p className="text-muted-foreground font-mono text-[10px] truncate max-w-xs">{o.shop_id}</p>
                        </div>
                        
                        <div className="space-y-1 text-left md:border-l md:pl-4 border-border/60">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-muted-foreground/80" /> Payment & Settlement Protocol
                          </p>
                          <p className="font-black text-foreground uppercase text-[11px] tracking-wide">{methodDisplay}</p>
                          <p className={`text-[11px] font-bold ${isSettled ? "text-emerald-600" : "text-amber-600"}`}>
                            {isSettled ? "SYSTEM PAID FLAG" : "UNPAID DISPUTE ON-HOLD"}
                          </p>
                        </div>
                      </div>

                      {/* Loyalty matrices calculation blocks component values */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-background border p-4 rounded-xl shadow-none">
                        <div className="flex items-center gap-3 text-left">
                          <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0 border border-primary/20">
                            <Gift className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Loyalty Points Applied</p>
                            <p className="text-sm font-black text-foreground">{o.loyalty_points_used ?? 0} Points Subtracted</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-left border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-4 border-border/60">
                          <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-600 shrink-0 border border-emerald-500/20">
                            <Percent className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Discount Percentage Multiplier</p>
                            <p className="text-sm font-black text-emerald-600">{o.discount_percentage ?? 0}% Invoice Discount Deduction</p>
                          </div>
                        </div>
                      </div>

                      {/* Customer Address Details Container Segment */}
                      {!isTableMode && (
                        <div className="bg-background border border-border/70 rounded-xl p-4 text-xs text-left flex items-start gap-3 shadow-none">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fulfillment Destination Coordinate Address</p>
                            <p className="text-foreground font-semibold leading-relaxed tracking-tight">
                              {o.delivery_address || "No customized spatial metadata logged. Customer routing designated as Store Collection / Counter Pickup."}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Items row iterator snapshot map listing parameters */}
                      <div className="space-y-2 text-left">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-0.5">
                          <ChefHat className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Food Item Rows snapshot Ledger</span>
                        </div>

                        <div className="rounded-xl border p-4 space-y-2.5 bg-background shadow-none">
                          {o.items && o.items.length > 0 ? (
                            <div className="space-y-2 divide-y divide-border/40">
                              {o.items.map((item: any, index: number) => (
                                <div key={index} className="flex items-center justify-between text-xs font-medium pt-2 first:pt-0 gap-4">
                                  <div className="space-y-0.5 text-left">
                                    <p className="font-bold text-foreground text-sm tracking-tight">{item.menu_item_name || "Dish Snapdragon snapshot"}</p>
                                    {item.variant_name && (
                                      <p className="text-[10px] font-bold text-amber-700 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded max-w-fit mt-1 capitalize tracking-wide">
                                        {item.variant_name}
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-4 shrink-0">
                                    <span className="text-muted-foreground text-xs font-mono">
                                      {formatCurrency(item.unit_price || 0)} each
                                    </span>
                                    <span className="font-mono text-xs font-bold text-foreground bg-muted border px-3 py-1 rounded-lg shrink-0">
                                      ×{item.quantity}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic py-2 text-center flex items-center justify-center gap-1">
                              <FileText className="h-4 w-4 text-muted-foreground/60" /> Standard System Itemized Snapshots Missing.
                            </p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}