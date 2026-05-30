import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ShieldCheck, Plus, Pencil, Trash2, Copy, Eye, Zap, User, Phone, Mail, ShieldAlert, Bike, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import {
  menuApi,
  ordersApi,
  shopsApi,
  apiRequest,
  ApiError,
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
import {
  CountryPhoneInput,
  Msg91Widget,
  DEFAULT_COUNTRY,
  buildE164,
  isPhoneValid,
  COUNTRIES,
  type Country,
} from "@/components/phone";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/owner/shops/$shopId")({ component: OwnerShop });

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["completed"],
  completed: [],
  cancelled: []
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  accepted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  preparing: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  ready: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold",
  cancel_requested: "bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold animate-pulse",
  cancelled: "bg-red-600/10 text-red-600 border-red-600/30 font-bold"
};

function StatusBadge({ status }: { status: string }) {
  const current = (status || "pending").toLowerCase();
  const styling = STATUS_COLORS[current] || "bg-muted text-muted-foreground border-transparent";

  return (
    <Badge variant="outline" className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded shadow-none ${styling}`}>
      {current.replace("_", " ")}
    </Badge>
  );
}

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
          <div className="text-left">
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

      <Tabs defaultValue="orders">
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
      <CardContent className="p-5 text-left">
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
    onError: (e) => toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong"),
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
        
        if (!form.name.trim()) {
          throw new Error("Item name is required");
        }
        if (!form.price.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
          throw new Error("Price must be greater than 0");
        }
        if (Number.isNaN(parsedPrepTime) || parsedPrepTime < 1 || parsedPrepTime > 180) {
          throw new Error("Prep time must be between 1 and 180 minutes");
        }
        
        const payload = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          dietary_type: form.dietary_type,
          price: parsedPrice,
          prep_time_minutes: parsedPrepTime,
          image_url: form.image_url.trim() || null,
          is_available: form.is_available,
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
      toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong");
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
          <p className="text-xs text-muted-foreground">
            Fields marked with <span className="text-destructive">*</span> are required.
          </p>

          <div className="space-y-2">
            <Label>Name <span className="text-destructive">*</span></Label>
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
              <Label>Price <span className="text-destructive">*</span></Label>
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
              <Label>Dietary Type <span className="text-destructive">*</span></Label>
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
              <Label>Prep Time (min) <span className="text-destructive">*</span></Label>
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

  useEffect(() => {
    setName("");
    setPrice("");
  }, [item?.id]);

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
      toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong");
    },
  });
  const remove = useMutation({
    mutationFn: (variantId: string) => (menuApi as any).deleteVariant(variantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item", item!.id, "variants"] });
      toast.success("Variant deleted");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong"),
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
    onMutate: async (vars: { id: string; st: string }) => {
      setUpdatingOrderId(vars.id);

      await qc.cancelQueries({ queryKey });

      const previous = qc.getQueryData(queryKey);

      qc.setQueryData(
        queryKey,
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((order: any) =>
              order.id === vars.id ? { ...order, status: vars.st } : order
            );
          }
          const response = old as any;
          if (Array.isArray(response?.items)) {
            return {
              ...response,
              items: response.items.map((order: any) =>
                order.id === vars.id ? { ...order, status: vars.st } : order
              )
            };
          }
          return old;
        }
      );

      return { previous };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(
          queryKey,
          context.previous
        );
      }

      if (err instanceof ApiError) {
        toast.error(err.message);
      } else if (err?.message && typeof err.message === "string") {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong");
      }
    },
    mutationFn: async ({ id, st }: { id: string; st: string }) => {
      setUpdatingOrderId(id);
      return apiRequest(`/api/v1/orders/${id}/status`, {
        method: "PATCH",
        body: { status: st },
      });
    },
    onSuccess: () => {
      toast.success("Order status updated");
      qc.invalidateQueries({ queryKey });
    },
    onSettled: () => setUpdatingOrderId(null),
  });

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const getOrdersList = (): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const response = data as any;
    if (Array.isArray(response?.items)) return response.items;
    return [];
  };

  const visibleOrders = getOrdersList().filter((o: any) => {
    const itemStatus = String(o.status || "").toLowerCase();
    if (forceRequestsOnly) return itemStatus === "cancel_requested";
    if (itemStatus === "cancel_requested") return false;
    if (status === "all") return true;
    return itemStatus === status;
  });

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {!forceRequestsOnly ? (
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList className="h-8 flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5 shadow-none">
              <TabsTrigger value="all" className="rounded-md px-3 text-xs h-7">
                All Tickets
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-md px-3 text-xs h-7">
                Pending
              </TabsTrigger>
              <TabsTrigger value="accepted" className="rounded-md px-3 text-xs h-7">
                Accepted
              </TabsTrigger>
              <TabsTrigger value="preparing" className="rounded-md px-3 text-xs h-7">
                Preparing
              </TabsTrigger>
              <TabsTrigger value="ready" className="rounded-md px-3 text-xs h-7">
                Ready
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-md px-3 text-xs h-7">
                Completed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-200">
            <ShieldAlert className="h-4 w-4" />
            Cancellation requests only
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-12 w-full rounded-lg animate-pulse" />
      ) : visibleOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-xs font-medium text-muted-foreground">
          No active kitchen orders matching context rules.
        </div>
      ) : (
        <div className="space-y-2">
          {visibleOrders.map((o: any) => {
            const isExpanded = !!expandedOrders[o.id];
            const currentStatus = String(o.status || "pending").toLowerCase();
            const nextAllowedOptions = VALID_TRANSITIONS[currentStatus] || [];
            const isAnyRowProcessing = updatingOrderId !== null;
            const isCurrentOrderUpdating = updatingOrderId === o.id;

            const fulfillmentType = String(o.order_type || "delivery").toLowerCase();
            const isTableMode = fulfillmentType === "table_booking" || !o.delivery_address_id;

            const methodDisplay = String(o.payment_method || "cod").toUpperCase();
            const isSettled = String(o.payment_status || "pending").toLowerCase() === "paid";
            const isFraudLocked = !!o.is_locked_by_fraud_flag;
            const isCancelledState = currentStatus === "cancelled";
            const isCompletedState = currentStatus === "completed";
            const isCancelRequested = currentStatus === "cancel_requested" || !!o.is_cancellation_pending;
            const isCompletionBlocked = methodDisplay === "COD" && !isSettled;

            const buyerName = o.customer?.name || "Customer Account";
            const buyerPhone = o.customer?.phone || "—";
            const buyerEmail = o.customer?.email || "—";

            const canChangePipeline =
              !isAnyRowProcessing &&
              !isFraudLocked &&
              !isCancelledState &&
              !isCompletedState &&
              nextAllowedOptions.length > 0;

            const OrderStatusSelector = ({ compact = true }: { compact?: boolean }) => (
              <Select
                value={String(o.status || "pending")}
                disabled={isAnyRowProcessing || nextAllowedOptions.length === 0 || isFraudLocked || isCompletionBlocked}
                onValueChange={(v) => updateStatus.mutate({ id: o.id, st: v })}
              >
                <SelectTrigger
                  className={[
                    "capitalize font-medium text-[11px] rounded-md border bg-background shadow-none px-2",
                    compact ? "h-7 w-28" : "h-8 w-32",
                    isCompletionBlocked ? "border-amber-500/40 bg-amber-500/[0.03] cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  <SelectValue placeholder={isCompletionBlocked ? "Collect cash first" : undefined} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(o.status || "pending")} disabled className="text-xs font-semibold">
                    {String(o.status || "pending").replace("_", " ")}
                  </SelectItem>
                  {nextAllowedOptions.map((step) => (
                    <SelectItem key={step} value={step} className="capitalize text-xs font-medium">
                      {step.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );

            return (
              <Card
                key={o.id}
                className={[
                  "border border-border/50 shadow-none rounded-lg hover:border-border/100 transition-all",
                  isExpanded ? "bg-muted/40 border-primary/30" : "bg-card",
                ].join(" ")}
              >
                <CardContent className="p-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-normal">
                  <div className="flex items-center gap-3 w-full md:w-auto text-left shrink-0">
                    <span className="font-mono font-semibold text-foreground bg-muted border px-2 py-0.5 rounded text-[11px]">
                      #{String(o.id).slice(0, 8).toUpperCase()}
                    </span>
                    <StatusBadge status={currentStatus} />
                    
                    <Badge variant="outline" className="text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded bg-background border-border/50 text-muted-foreground gap-1.5 flex items-center shadow-none">
                      {isTableMode ? (
                        <>
                          <UtensilsCrossed className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Table
                        </>
                      ) : (
                        <>
                          <Bike className="h-3.5 w-3.5 text-blue-500 shrink-0" /> Delivery
                        </>
                      )}
                    </Badge>
                    
                    <Badge className={`text-[10px] font-medium px-2 py-0.5 rounded border shadow-none ${
                      isSettled 
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }`}>
                      {methodDisplay} · {isSettled ? "PAID" : "UNPAID"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-1 text-left sm:text-right text-muted-foreground text-[11px] flex-1 min-w-0">
                    <div className="truncate"><span className="text-foreground font-medium">Customer:</span> {buyerName}</div>
                    <div className="truncate font-mono"><span className="text-foreground font-medium">Phone:</span> {buyerPhone}</div>
                    <div className="sm:ml-auto font-mono text-muted-foreground/80">{formatDate(o.created_at)}</div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-border/20 shrink-0">
                    <span className="font-semibold text-sm text-foreground tracking-tight min-w-[75px] text-right">
                      {formatCurrency(o.total_price)}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {isCancelRequested ? (
                        <div className="flex items-center gap-1 bg-rose-500/5 p-1 border border-rose-500/10 rounded-lg">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isAnyRowProcessing}
                            onClick={() => updateStatus.mutate({ id: o.id, st: "cancelled" })}
                            className="h-7 text-[10px] font-bold px-2 rounded-md shadow-none"
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isAnyRowProcessing}
                            onClick={() => updateStatus.mutate({ id: o.id, st: "resume_order" })}
                            className="h-7 text-[10px] font-bold px-2 rounded-md bg-background shadow-none text-foreground"
                          >
                            Resume
                          </Button>
                        </div>
                      ) : (
                        <>
                          {methodDisplay === "COD" &&
                            !isFraudLocked &&
                            !isCancelledState &&
                            !isCompletedState && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isAnyRowProcessing || isSettled}
                                onClick={() =>
                                  updateStatus.mutate({
                                    id: o.id,
                                    st: "mark_as_paid",
                                  })
                                }
                                className={`h-7 rounded-md px-2 text-[10px] font-medium border shadow-none transition-all ${
                                  isSettled
                                    ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                                    : "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10"
                                }`}
                              >
                                Paid
                              </Button>
                          )}

                          {!isExpanded && canChangePipeline &&
                            !isCurrentOrderUpdating && (
                              <OrderStatusSelector compact />
                          )}

                          {(isCancelledState || isCompletedState) && !isExpanded && (
                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted border px-2 py-1 rounded-md select-none">
                              Locked
                            </span>
                          )}
                        </>
                      )}

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[11px] font-semibold px-2 rounded text-primary gap-1 border border-border/40 hover:bg-muted/40 transition-all bg-background shrink-0"
                        onClick={() => toggleExpand(o.id)}
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                    </div>
                  </div>
                </CardContent>

                {isExpanded && (
                  <div className="bg-muted/10 p-4 space-y-4 border-t border-border/30 animate-in slide-in-from-top-1 duration-150 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] bg-background border p-3 rounded-lg border-border/50">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><User className="h-3 w-3" /> Customer Profile</p>
                        <p className="font-semibold text-foreground">{buyerName}</p>
                      </div>
                      <div className="space-y-1 md:border-l md:pl-4 border-border/40">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Phone className="h-3 w-3" /> Phone Channel</p>
                        <p className="font-medium text-foreground font-mono">{buyerPhone}</p>
                      </div>
                      <div className="space-y-1 md:border-l md:pl-4 border-border/40">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Mail className="h-3 w-3" /> Email Profile</p>
                        <p className="font-medium text-foreground truncate max-w-[180px]">{buyerEmail}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] bg-background border p-3 rounded-lg border-border/50">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fulfillment Destination</p>
                        <p className="font-medium text-foreground">{isTableMode ? "🪑 Dine-In Table Booking" : o.delivery_address_id || "Counter Pickup"}</p>
                      </div>
                      <div className="space-y-1 md:border-l md:pl-4 border-border/40">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Financial Protocol</p>
                        <p className="font-medium text-foreground">{methodDisplay} ({isSettled ? "Settled paid" : "Unpaid state"})</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-0.5">Order Items Summary</p>
                      <div className="rounded-lg border bg-background p-2 space-y-1">
                        {Array.isArray(o.items) && o.items.length > 0 ? (
                          o.items.map((item: any, idx: number) => (
                            <div key={`${o.id}-${idx}`} className="flex items-center justify-between text-xs py-1 border-b last:border-0 border-border/20">
                              <span className="text-foreground font-medium">{item.item_name_snapshot || "Dish Option"}</span>
                              <span className="font-mono text-[11px] font-bold bg-muted border px-1.5 py-0 rounded">×{item.quantity}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic text-center py-1">No basket snapshot lines logged.</p>
                        )}
                      </div>
                    </div>

                    {!isCancelledState &&
                    !isCompletedState &&
                    !isCurrentOrderUpdating && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-border/20 mt-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider sm:w-28 flex items-center gap-1">
                          <Zap className="h-3 w-3 text-primary shrink-0" /> Modify Pipeline:
                        </div>
                        <OrderStatusSelector compact={false} />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ shopId, initial }: { shopId: string; initial: any }) {
  const qc = useQueryClient();
  const originalPhone = initial.phone ?? "";
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  
  const [form, setForm] = useState({
    name: initial.name ?? "",
    description: initial.description ?? "",
    address: initial.address ?? "",
    cuisine: initial.cuisine ?? "",
    image_url: initial.image_url ?? "",
    pincode: initial.pincode ?? "",
    loyalty_discount_per_point: String(initial.loyalty_discount_per_point ?? 0.1),
  });

  const stateRef = useRef({ localNumber, cleanFullPhone: "" });
  stateRef.current.localNumber = localNumber;
  try {
    stateRef.current.cleanFullPhone = buildE164(country.dialCode, localNumber.trim());
  } catch {
    stateRef.current.cleanFullPhone = "";
  }

  const cleanFullPhone = stateRef.current.cleanFullPhone;
  const phoneChanged = cleanFullPhone !== originalPhone;
  const phoneReady = isPhoneValid(country, localNumber.trim());

  useEffect(() => {
    setForm({
      name: initial.name ?? "",
      description: initial.description ?? "",
      address: initial.address ?? "",
      cuisine: initial.cuisine ?? "",
      image_url: initial.image_url ?? "",
      pincode: initial.pincode ?? "",
      loyalty_discount_per_point: String(initial.loyalty_discount_per_point ?? 0.1),
    });
  }, [initial]);

  useEffect(() => {
    if (!initial.phone) {
      setIsHydrating(false);
      return;
    }

    if (stateRef.current.localNumber.trim() && stateRef.current.cleanFullPhone !== initial.phone) {
      setIsHydrating(false);
      return;
    }

    setVerifiedPhone(initial.phone);
    setPhoneVerified(true);

    const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    const matchedCountry = sortedCountries.find((c) => initial.phone.startsWith(c.dialCode));
    
    if (matchedCountry) {
      setCountry(matchedCountry);
      setLocalNumber(initial.phone.slice(matchedCountry.dialCode.length));
    } else {
      const dial = DEFAULT_COUNTRY.dialCode;
      if (initial.phone.startsWith(dial)) {
        setLocalNumber(initial.phone.slice(dial.length));
      }
    }
    
    setIsHydrating(false);
  }, [initial.phone]);
  
  const save = useMutation({
    mutationFn: () => {
        const targetPhone = phoneChanged ? cleanFullPhone : originalPhone;
        if (!targetPhone) {
          throw new Error("Phone number required");
        }

        if (phoneChanged && !phoneVerified) {
          throw new Error("Verify the new phone number first");
        }

        const parsedLoyalty = Number.parseFloat(form.loyalty_discount_per_point);
        if (Number.isNaN(parsedLoyalty) || parsedLoyalty < 0) {
          throw new Error("Invalid loyalty discount value");
        }
      
        return shopsApi.update(shopId, {
          ...form,
          phone: targetPhone,
          phone_verification_token: phoneChanged ? phoneVerificationToken : undefined,
          loyalty_discount_per_point: parsedLoyalty,
        } as any);
    },
    onSuccess: () => {
      toast.success("Saved");
      const targetPhone = phoneChanged ? cleanFullPhone : originalPhone;
      setVerifiedPhone(targetPhone);
      setPhoneVerified(true);
      setPhoneVerificationToken(null);
      qc.invalidateQueries({ queryKey: ["shop", shopId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong"),
  });

  function resetPhoneVerification() {
    setPhoneVerified(false);
    setVerifiedPhone(null);
    setPhoneVerificationToken(null);
  }

  function handleCountryChange(c: Country) {
    setCountry(c);
    let candidate = "";
    try {
      candidate = buildE164(c.dialCode, localNumber.trim());
    } catch {}
    
    if (verifiedPhone && candidate !== verifiedPhone) {
      resetPhoneVerification();
    }
  }
  
  function handleLocalNumberChange(n: string) {
    setLocalNumber(n);
    let candidate = "";
    try {
      candidate = buildE164(country.dialCode, n.trim());
    } catch {}

    if (verifiedPhone && candidate !== verifiedPhone) {
      resetPhoneVerification();
    }
  }
  
  function handlePhoneVerified(token: string, phone: string) {
    setPhoneVerificationToken(token);
    setVerifiedPhone(phone);
    setPhoneVerified(true);
    toast.success("Phone verified successfully");
  }
  
  return (
    <Card>
      <CardHeader className="text-left">
        <CardTitle>Shop settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-left">
        {(["name", "cuisine", "address", "pincode", "image_url"] as const).map((k) => (
          <div key={k} className="space-y-2">
            <Label className="capitalize">{k.replace("_", " ")}</Label>
            <Input
              value={(form as any)[k] ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            />
          </div>
        ))}

        <div className="space-y-2">
          <Label>Phone Number</Label>

          <CountryPhoneInput
            country={country}
            localNumber={localNumber}
            onCountryChange={handleCountryChange}
            onLocalNumberChange={handleLocalNumberChange}
          />

          <Msg91Widget
            phone={cleanFullPhone}
            purpose="profile_phone"
            onVerified={handlePhoneVerified}
            disabled={!phoneReady}
            isVerified={phoneVerified}
          />

          {isHydrating ? (
            <p className="text-xs text-muted-foreground animate-pulse">Syncing contact profiles...</p>
          ) : phoneVerified ? (
            <p className="text-xs text-emerald-500">
              Verified: {verifiedPhone}
            </p>
          ) : (
            <p className="text-xs text-amber-500">
              Phone number requires verification
            </p>
          )}
        </div>

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
        <Button 
          onClick={() => save.mutate()} 
          disabled={save.isPending || isHydrating || !cleanFullPhone || (phoneChanged && !phoneVerified)}
        >
          Save
        </Button>
      </CardContent>
    </Card>
  );
}