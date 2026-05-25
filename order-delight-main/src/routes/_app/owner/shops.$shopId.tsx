import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ShieldCheck, Plus, Pencil, Trash2, Copy, ChevronDown, ChevronUp, ChefHat } from "lucide-react";
import { toast } from "sonner";
import {
  menuApi,
  ordersApi,
  shopsApi,
  apiRequest,
  type OrderStatus,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/_app/owner/shops/$shopId")({ component: OwnerShop });

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["completed"],
  cancel_requested: ["cancelled", "accepted"],
  completed: [],
  cancelled: []
};

function OwnerShop() {
  const { shopId } = Route.useParams();
  const qc = useQueryClient();
  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => shopsApi.get(shopId),
  });

  const setStatus = useMutation({
    mutationFn: (is_open: boolean) => shopsApi.setStatus(shopId, { is_open }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["shop", shopId] });
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!shop) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to="/owner" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> My shops
      </Link>
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{shop.name}</h1>
              {(shop as any).is_verified && <ShieldCheck className="h-5 w-5 text-primary" />}
            </div>
            <p className="text-sm text-muted-foreground">{shop.cuisine ?? "—"}</p>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">ID: {shop.id}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shop.id);
                toast.success("Shop ID copied to clipboard!");
              }}
              className="rounded-md p-1 hover:bg-muted hover:text-foreground transition-colors"
              title="Copy Shop ID"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Open</span>
              <Switch
                checked={!!shop.is_open}
                disabled={setStatus.isPending}
                onCheckedChange={(v) => setStatus.mutate(v)}
              />
            </div>
            <Badge variant={(shop as any).is_active ? "outline" : "destructive"}>
              {(shop as any).is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">Dashboard</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="stats" className="mt-6">
          <StatsTab shopId={shopId} />
        </TabsContent>
        <TabsContent value="menu" className="mt-6">
          <MenuTab shopId={shopId} />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersTab shopId={shopId} forceRequestsOnly={false} />
        </TabsContent>
        <TabsContent value="requests" className="mt-6">
          <OrdersTab shopId={shopId} forceRequestsOnly={true} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsTab shopId={shopId} initial={shop} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatsTab({ shopId }: { shopId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["shop", shopId, "dashboard"],
    queryFn: () => (shopsApi as any).dashboard(shopId),
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  
  if (error || !data || Object.keys(data).length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          No metrics yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      <Stat label="Total Orders" value={data.total_orders ?? 0} />
      <Stat label="Today's Orders" value={data.today_orders ?? 0} />
      <Stat label="Pending Active" value={data.pending_orders ?? 0} />
      <Stat label="Completed" value={data.completed_orders ?? 0} />
      <Stat label="Total Revenue" value={formatCurrency(data.total_revenue ?? 0)} />
    </div>
  );
}

function MenuTab({ shopId }: { shopId: string }) {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: ["shop", shopId, "items", "owner"],
    queryFn: () => menuApi.listItems(shopId),
  });
  const [editing, setEditing] = useState<any | "new" | null>(null);
  const [variantsFor, setVariantsFor] = useState<any | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => menuApi.deleteItem(id),
    onSuccess: () => {
      toast.success("Item deleted");
      qc.invalidateQueries({ queryKey: ["shop", shopId, "items", "owner"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-2 h-4 w-4" /> New item
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !items || items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No items yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((it: any) => (
            <Card key={it.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex-1 text-left">
                  <p className="font-medium">{it.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(it.price)} · {it.category ?? "—"}
                  </p>
                </div>
                <Badge variant={it.is_available === false ? "secondary" : "outline"}>
                  {it.is_available === false ? "Unavailable" : "Available"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setVariantsFor(it)}>
                  Variants
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditing(it)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Delete "${it.name}"?`)) remove.mutate(it.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ItemDialog
        shopId={shopId}
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["shop", shopId, "items", "owner"] })}
      />
      <VariantsDialog item={variantsFor} onClose={() => setVariantsFor(null)} />
    </div>
  );
}

function ItemDialog({
  shopId,
  editing,
  onClose,
  onSaved,
}: {
  shopId: string;
  editing: any | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = editing && editing !== "new";
  const init = isEdit ? editing : null;
  const [form, setForm] = useState({
    name: init?.name ?? "",
    description: init?.description ?? "",
    price: init?.price != null ? String(init.price) : "",
    category: init?.category ?? "",
    dietary_type: init?.dietary_type ?? "veg",
    prep_time_minutes: init?.prep_time_minutes != null ? String(init.prep_time_minutes) : "15",
    image_url: init?.image_url ?? "",
    is_available: init?.is_available ?? true,
  });

  useEffect(() => {
    setForm({
      name: init?.name ?? "",
      description: init?.description ?? "",
      price: init?.price != null ? String(init.price) : "",
      category: init?.category ?? "",
      dietary_type: init?.dietary_type ?? "veg",
      prep_time_minutes: init?.prep_time_minutes != null ? String(init.prep_time_minutes) : "15",
      image_url: init?.image_url ?? "",
      is_available: init?.is_available ?? true,
    });
  }, [init?.id, isEdit]);

  const save = useMutation({
    mutationFn: () => {
      try {
        const parsedPrice = Number.parseFloat(form.price);
        const parsedPrepTime = Number.parseInt(form.prep_time_minutes, 10);
        
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
          throw new Error("Price must be greater than 0");
        }
        if (!form.name.trim()) {
          throw new Error("Item name is required");
        }
        if (Number.isNaN(parsedPrepTime) || parsedPrepTime < 1 || parsedPrepTime > 180) {
          throw new Error("Prep time must be between 1 and 180 minutes");
        }
        
        const payload = {
          ...form,
          price: parsedPrice,
          prep_time_minutes: parsedPrepTime,
        };
        return isEdit
          ? menuApi.updateItem(editing.id, payload)
          : menuApi.createItem(shopId, payload);
      } catch (err) {
        throw err;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      onSaved();
      onClose();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed");
    },
  });

  if (!editing) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "New item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-left">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={form.category ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dietary Type</Label>
              <Select value={form.dietary_type} onValueChange={(v) => setForm((f) => ({ ...f, dietary_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="veg">Vegetarian</SelectItem>
                  <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prep Time (min)</Label>
              <Input
                type="number"
                min="1"
                max="180"
                value={form.prep_time_minutes}
                onChange={(e) => setForm((f) => ({ ...f, prep_time_minutes: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={form.image_url ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Available</Label>
            <Switch
              checked={!!form.is_available}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_available: v }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim() || !form.price.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VariantsDialog({ item, onClose }: { item: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: variants } = useQuery({
    queryKey: ["item", item?.id, "variants"],
    queryFn: () => {
      if (!item) return Promise.resolve([]);
      return menuApi.listVariants(item.id);
    },
    enabled: !!item,
  });
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");

  const create = useMutation({
    mutationFn: () => {
      try {
        const parsedPrice = Number.parseFloat(price);
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
          throw new Error("Variant price must be greater than 0");
        }
        if (!name.trim()) {
          throw new Error("Variant name is required");
        }
        return (menuApi as any).createVariant(item.id, {
          name,
          price: parsedPrice,
          prep_time_minutes: 1,
          is_available: true,
        });
      } catch (err) {
        throw err;
      }
    },
    onSuccess: () => {
      setName("");
      setPrice("");
      qc.invalidateQueries({ queryKey: ["item", item!.id, "variants"] });
      toast.success("Variant added");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed");
    },
  });
  const remove = useMutation({
    mutationFn: (variantId: string) => (menuApi as any).deleteVariant(variantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item", item!.id, "variants"] });
      toast.success("Variant deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete variant"),
  });

  if (!item) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Variants — {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {(variants ?? []).map((v: any) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
            >
              <span>{v.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatCurrency(v.price)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Delete variant "${v.name}"?`)) remove.mutate(v.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_120px_auto] gap-2 pt-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            type="number"
            placeholder="Price"
            value={price}
            min="0.01"
            step="0.01"
            onChange={(e) => setPrice(e.target.value)}
          />
          <Button onClick={() => create.mutate()} disabled={!name.trim() || !price.trim() || create.isPending}>
            Add
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrdersTab({ shopId, forceRequestsOnly = false }: { shopId: string; forceRequestsOnly?: boolean }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  
  const queryKey = ["shop", shopId, "orders", status, forceRequestsOnly];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      ordersApi.shopOrders(shopId, {
        page: 1,
        page_size: 100,
        status: undefined, 
      }),
    refetchInterval: 5000, 
  });
  
  const updateStatus = useMutation({
    mutationFn: async ({ id, st, decline_action, reason }: { id: string; st: string; decline_action?: string; reason?: string }) => {
      setUpdatingOrderId(id);
      
      const payload: Record<string, any> = { status: st };
      if (st === "accepted" && decline_action === "decline_cancellation") {
        payload.decline_action = "decline_cancellation";
      }
      if (reason) {
        payload.reason = reason;
      }

      return await apiRequest(`/api/v1/orders/${id}/status`, {
        method: "PATCH",
        body: payload,
      });
    },
    onSuccess: () => {
      toast.success("Order synchronized successfully");
      qc.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Fulfillment state transition rejected.");
    },
    onSettled: () => setUpdatingOrderId(null),
  });

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const visibleOrders = Array.isArray(data)
    ? data.filter((o: any) => {
        const itemStatus = (o.status || "").toLowerCase();
        const isActivelyDisputed = itemStatus === "cancel_requested";
        if (forceRequestsOnly) return isActivelyDisputed;
        if (isActivelyDisputed) return false;
        if (status === "all") return true;
        return itemStatus === status;
      })
    : [];

  return (
    <div className="space-y-4">
      {!forceRequestsOnly && (
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="flex flex-wrap h-auto p-1 bg-muted rounded-xl max-w-fit border">
            <TabsTrigger value="all" className="text-xs px-3.5 py-1.5 rounded-lg">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-3.5 py-1.5 rounded-lg">Pending</TabsTrigger>
            <TabsTrigger value="accepted" className="text-xs px-3.5 py-1.5 rounded-lg">Accepted</TabsTrigger>
            <TabsTrigger value="preparing" className="text-xs px-3.5 py-1.5 rounded-lg">Preparing</TabsTrigger>
            <TabsTrigger value="ready" className="text-xs px-3.5 py-1.5 rounded-lg">Ready</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs px-3.5 py-1.5 rounded-lg">Completed</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs px-3.5 py-1.5 rounded-lg">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : visibleOrders.length === 0 ? (
        <Card className="border-dashed rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No active orders matching this selection.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleOrders.map((o: any) => {
            const isExpanded = !!expandedOrders[o.id];
            const currentStatus = (o.status || "pending").toLowerCase();
            const nextAllowedOptions = VALID_TRANSITIONS[currentStatus] || [];
            const isAnyRowProcessing = updatingOrderId !== null;

            // 🚀 STRATIFIED EXTRACTIONS: Identify attributes gracefully using safe fallback modes
            const currentFulfillment = (o.order_type || "delivery").toLowerCase();
            const paymentType = (o.payment_method || "cod").toUpperCase();
            const isPaid = (o.payment_status || "pending").toLowerCase() === "paid";
            const customerName = o.customer?.name || "Premium Guest";
            const customerPhone = o.customer?.phone || "No Number Linked";

            return (
              <Card key={o.id} className="overflow-hidden rounded-xl border border-border/80 text-left shadow-none bg-card hover:bg-muted/5 transition-colors">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={o.status} />
                        
                        {/* Fulfillment badging descriptor arrays */}
                        <Badge variant="secondary" className="text-[10px] py-0 px-2 h-5 rounded font-semibold capitalize bg-muted border gap-1">
                          {currentFulfillment === "table_booking" ? "Table Booking 🪑" : "Food Delivery 🛵"}
                        </Badge>
                        
                        {/* Payment badging descriptor arrays */}
                        <Badge className={`text-[10px] py-0 px-2 h-5 rounded font-bold border shadow-none ${
                          isPaid 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }`}>
                          {paymentType} · {isPaid ? "PAID" : "UNPAID"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(o.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-foreground mr-1">{formatCurrency(o.total_price)}</span>
                      
                      {/* Manual Payment Modifier Action Selector */}
                      {paymentType === "COD" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isAnyRowProcessing}
                          onClick={() => updateStatus.mutate({ id: o.id, st: isPaid ? "mark_as_unpaid" : "mark_as_paid" })}
                          className={`h-8 text-[11px] font-semibold px-2.5 rounded-lg border transition-all ${
                            isPaid 
                              ? "text-amber-600 hover:text-amber-700 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20" 
                              : "text-emerald-600 hover:text-emerald-700 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20"
                          }`}
                        >
                          {isPaid ? "Mark Unpaid" : "Collect Cash"}
                        </Button>
                      )}

                      <Select
                        value={o.status}
                        disabled={isAnyRowProcessing || nextAllowedOptions.length === 0}
                        onValueChange={(v) => updateStatus.mutate({ id: o.id, st: v, reason: o.cancellation_reason })}
                      >
                        <SelectTrigger className="w-36 capitalize font-semibold text-xs rounded-lg h-8 border shadow-none bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={o.status} disabled className="text-muted-foreground text-xs font-semibold bg-muted/40">
                            {o.status.replace("_", " ")}
                          </SelectItem>
                          {nextAllowedOptions.map((step) => (
                            <SelectItem key={step} value={step} className="capitalize text-xs font-medium">
                              {step.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg border shrink-0 bg-background"
                        disabled={updatingOrderId === o.id}
                        onClick={() => toggleExpand(o.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>

                  {/* EXPANDED CONTENT PANEL */}
                  {isExpanded && (
                    <div className="bg-muted/20 border-t border-border/60 p-4 space-y-4 animate-in slide-in-from-top-1 duration-150">
                      
                      {/* SECTION A: CUSTOMER CREDENTIALS & PHYSICAL LOCATION DETAILS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pb-3 border-b border-dashed border-border/80">
                        <div className="space-y-1">
                          <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Customer Contact</p>
                          <p className="font-bold text-foreground text-sm">{customerName}</p>
                          <p className="font-mono text-muted-foreground font-medium">{customerPhone}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Fulfillment Destination</p>
                          {currentFulfillment === "table_booking" ? (
                            <p className="text-foreground font-medium italic py-0.5">
                              ⚠️ Dine-In Table Reservation. No delivery coordinates required.
                            </p>
                          ) : o.delivery_address ? (
                            <div className="space-y-0.5">
                              <p className="font-bold text-primary uppercase text-[10px] tracking-wide">{o.delivery_address.title}</p>
                              <p className="text-foreground font-medium leading-relaxed">{o.delivery_address.address_line}</p>
                              {o.delivery_address.landmark && (
                                <p className="text-muted-foreground text-[11px]">Landmark: {o.delivery_address.landmark}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground italic py-0.5">No delivery coordinate coordinates attached.</p>
                          )}
                        </div>
                      </div>

                      {/* SECTION B: ITEM SELECTION ORDER TICKET */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <ChefHat className="h-3.5 w-3.5" />
                          <span>Items Ticket</span>
                        </div>

                        <div className="space-y-1.5 rounded-xl border border-border/70 bg-background p-3.5">
                          {o.items && o.items.length > 0 ? (
                            <div className="space-y-2 divide-y divide-border/40">
                              {o.items.map((item: any, idx: number) => {
                                const itemTitle = item.item_name_snapshot || "Dish Item";
                                const variantTitle = item.variant_name_snapshot || null;
                                
                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs pt-2 first:pt-0 gap-4">
                                    <div className="space-y-0.5">
                                      <p className="font-semibold text-foreground">{itemTitle}</p>
                                      {variantTitle && (
                                        <p className="text-[10px] font-bold text-amber-700 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded max-w-fit capitalize tracking-wide">
                                          {variantTitle}
                                        </p>
                                      )}
                                    </div>
                                    <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded border shrink-0">
                                      ×{item.quantity}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic text-center py-1">No items listed on this transaction ticket.</p>
                          )}
                        </div>
                      </div>

                      {/* SECTION C: CUSTOMER LOGISTICS INSTRUCTIONS */}
                      {o.instructions && (
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-xs">
                          <p className="text-amber-800 dark:text-amber-400 font-normal">
                            <span className="font-bold mr-1">Kitchen/Host Instructions:</span> 
                            "{o.instructions}"
                          </p>
                        </div>
                      )}
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

function SettingsTab({
  shopId,
  initial,
}: {
  shopId: string;
  initial: any;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: initial.name ?? "",
    description: initial.description ?? "",
    address: initial.address ?? "",
    phone: initial.phone ?? "",
    cuisine: initial.cuisine ?? "",
    image_url: initial.image_url ?? "",
    loyalty_discount_per_point: String(initial.loyalty_discount_per_point ?? 0.1),
  });
  
  const save = useMutation({
    mutationFn: () =>
      shopsApi.update(shopId, {
        ...form,
        loyalty_discount_per_point: Number.parseFloat(form.loyalty_discount_per_point || "0"),
      } as any),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["shop", shopId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  
  return (
    <Card>
      <CardHeader className="text-left">
        <CardTitle>Shop settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-left">
        {(["name", "cuisine", "address", "phone", "image_url"] as const).map((k) => (
          <div key={k} className="space-y-2">
            <Label className="capitalize">{k.replace("_", " ")}</Label>
            <Input
              value={(form as any)[k] ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            />
          </div>
        ))}
        <div className="space-y-2">
          <Label>Loyalty discount per point</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.loyalty_discount_per_point}
            onChange={(e) => setForm((f) => ({ ...f, loyalty_discount_per_point: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Save
        </Button>
      </CardContent>
    </Card>
  );
}