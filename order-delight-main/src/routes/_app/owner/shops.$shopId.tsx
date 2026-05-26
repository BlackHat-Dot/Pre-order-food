import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ShieldCheck, Plus, Pencil, Trash2, Copy, ChevronDown, ChevronUp, ChefHat, ShieldAlert } from "lucide-react";
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

export const Route = createFileRoute("/_app/owner/shops/$shopId")({ component: OwnerShop });

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["completed"],
  completed: [],
  cancelled: []
};

function StatusBadge({ status }: { status: string }) {
  const current = (status || "pending").toLowerCase();
  
  const designMap: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    accepted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    preparing: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    ready: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold",
    cancel_requested: "bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold animate-pulse",
    cancelled: "bg-red-600/10 text-red-600 border-red-600/30 font-bold"
  };

  const styling = designMap[current] || "bg-muted text-muted-foreground";

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
              {/* 🚀 LAYOUT FIXED: Securely wraps child nodes and terminates custom layout tags safely */}
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

function OrdersTab({
  shopId,
  forceRequestsOnly = false,
}: {
  shopId: string;
  forceRequestsOnly?: boolean;
}) {
  const qc = useQueryClient();

  const [status, setStatus] = useState("all");
  const [expandedOrders, setExpandedOrders] = useState<
    Record<string, boolean>
  >({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const queryKey = [
    "shop",
    shopId,
    "orders",
    status,
    forceRequestsOnly,
  ];

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
    mutationFn: async ({
      id,
      st,
    }: {
      id: string;
      st: string;
    }) => {
      setUpdatingOrderId(id);

      return apiRequest(`/api/v1/orders/${id}/status`, {
        method: "PATCH",
        body: {
          status: st,
        },
      });
    },

    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey });
    },

    onError: (err: any) => {
      toast.error(err?.message || "Failed to update order");
    },

    onSettled: () => {
      setUpdatingOrderId(null);
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const visibleOrders = Array.isArray(data)
    ? data.filter((o: any) => {
        const itemStatus = String(
          o.status || ""
        ).toLowerCase();

        if (forceRequestsOnly) {
          return itemStatus === "cancel_requested";
        }

        if (itemStatus === "cancel_requested") {
          return false;
        }

        if (status === "all") {
          return true;
        }

        return itemStatus === status;
      })
    : [];

  return (
    <div className="space-y-6">

      {!forceRequestsOnly && (
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="flex flex-wrap h-auto rounded-xl border border-border/60 bg-muted/40 p-1">

            <TabsTrigger value="all">
              All
            </TabsTrigger>

            <TabsTrigger value="pending">
              Pending
            </TabsTrigger>

            <TabsTrigger value="accepted">
              Accepted
            </TabsTrigger>

            <TabsTrigger value="preparing">
              Preparing
            </TabsTrigger>

            <TabsTrigger value="ready">
              Ready
            </TabsTrigger>

            <TabsTrigger value="completed">
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : visibleOrders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No orders found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">

          {visibleOrders.map((o: any) => {
            const isExpanded =
              !!expandedOrders[o.id];

            const currentStatus = String(
              o.status || "pending"
            ).toLowerCase();

            const nextAllowedOptions =
              VALID_TRANSITIONS[currentStatus] || [];

            const fulfillmentType = String(
              o.order_type || "delivery"
            ).toLowerCase();

            const isTableMode =
              fulfillmentType ===
                "table_booking" ||
              !o.delivery_address_id;

            const methodDisplay = String(
              o.payment_method || "cod"
            ).toUpperCase();

            const isSettled =
              String(
                o.payment_status || "pending"
              ).toLowerCase() === "paid";

            const isCancelledState =
              currentStatus === "cancelled";

            const isCompletedState =
              currentStatus === "completed";

            const isCompletionBlocked =
              methodDisplay === "COD" &&
              !isSettled;

            const buyerName =
              o.customer?.name || "Customer";

            const buyerPhone =
              o.customer?.phone || "No phone";

            const buyerEmail =
              o.customer?.email || "No email";

            return (
              <Card
                key={o.id}
                className="overflow-hidden rounded-xl border border-border/70 shadow-none transition-colors"
              >
                <CardContent className="p-0">

                  {/* MAIN */}
                  <div className="p-5">

                    {/* HEADER */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr_140px_180px_44px] lg:items-center">

                      {/* ORDER META */}
                      <div className="min-w-0 space-y-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="rounded-md border bg-muted px-2.5 py-1 font-mono text-xs font-bold">
                            #
                            {o.id
                              .slice(0, 8)
                              .toUpperCase()}
                          </span>

                          <StatusBadge
                            status={o.status}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {formatDate(
                            o.created_at
                          )}
                        </p>
                      </div>

                      {/* TAGS */}
                      <div className="flex flex-wrap items-center gap-2">

                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wide"
                        >
                          {isTableMode
                            ? "Table Booking"
                            : "Food Delivery"}
                        </Badge>

                        <Badge
                          className={`border text-[10px] uppercase tracking-wide ${
                            isSettled
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {methodDisplay} ·{" "}
                          {isSettled
                            ? "Paid"
                            : "Unpaid"}
                        </Badge>

                        {isCancelledState && (
                          <Badge className="border-red-500/20 bg-red-500/10 text-[10px] uppercase tracking-wide text-red-500">
                            Cancelled
                          </Badge>
                        )}
                      </div>

                      {/* AMOUNT */}
                      <div className="text-left lg:text-right">

                        <span className="text-base font-bold">
                          {formatCurrency(
                            o.total_price
                          )}
                        </span>
                      </div>

                      {/* STATUS */}
                      <div className="flex justify-start lg:justify-end">

                        {!isCancelledState &&
                          !isCompletedState && (
                            <Select
                              value={o.status}
                              disabled={
                                updatingOrderId !==
                                  null ||
                                nextAllowedOptions.length ===
                                  0 ||
                                isCompletionBlocked
                              }
                              onValueChange={(v) =>
                                updateStatus.mutate({
                                  id: o.id,
                                  st: v,
                                })
                              }
                            >
                              <SelectTrigger className="h-8 w-36 text-xs">

                                <SelectValue />
                              </SelectTrigger>

                              <SelectContent>

                                <SelectItem
                                  value={o.status}
                                  disabled
                                >
                                  {o.status}
                                </SelectItem>

                                {nextAllowedOptions.map(
                                  (step) => (
                                    <SelectItem
                                      key={step}
                                      value={step}
                                    >
                                      {step.replace(
                                        "_",
                                        " "
                                      )}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          )}
                      </div>

                      {/* EXPAND */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          toggleExpand(o.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* DETAILS */}
                    {isExpanded && (
                      <div className="mt-5 space-y-5 border-t border-border/50 pt-5">

                        {/* CUSTOMER + FULFILLMENT */}
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                          {/* CUSTOMER */}
                          <div className="rounded-xl border border-border/60 bg-background/40 p-4">

                            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Customer
                            </p>

                            <div className="space-y-1">

                              <p className="text-sm font-semibold">
                                {buyerName}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {buyerPhone}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {buyerEmail}
                              </p>
                            </div>
                          </div>

                          {/* FULFILLMENT */}
                          <div className="rounded-xl border border-border/60 bg-background/40 p-4">

                            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Fulfillment
                            </p>

                            {isTableMode ? (
                              <p className="text-sm font-medium">
                                Dine-In Table
                                Booking
                              </p>
                            ) : (
                              <p className="text-sm leading-relaxed">
                                {o.delivery_address_id ||
                                  "Store Pickup"}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* ITEMS */}
                        <div className="rounded-xl border border-border/60 bg-background/40 p-4">

                          <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Items
                          </p>

                          <div className="space-y-3">

                            {o.items?.length > 0 ? (
                              o.items.map(
                                (
                                  item: any,
                                  idx: number
                                ) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between gap-4"
                                  >

                                    <div className="min-w-0">

                                      <p className="truncate text-sm font-medium">
                                        {item.item_name_snapshot ||
                                          "Menu Item"}
                                      </p>

                                      {item.variant_name_snapshot && (
                                        <p className="text-xs text-muted-foreground">
                                          {
                                            item.variant_name_snapshot
                                          }
                                        </p>
                                      )}
                                    </div>

                                    <span className="shrink-0 font-mono text-xs">
                                      ×
                                      {
                                        item.quantity
                                      }
                                    </span>
                                  </div>
                                )
                              )
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                No items available.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* NOTES */}
                        {o.instructions && (
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">

                            <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                              {o.instructions}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
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