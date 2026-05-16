import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  menuApi,
  ordersApi,
  shopsApi,
  type MenuItemOut,
  type OrderStatus,
  type VariantOut,
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

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

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
              {shop.is_verified && <ShieldCheck className="h-5 w-5 text-primary" />}
            </div>
            <p className="text-sm text-muted-foreground">{shop.cuisine ?? "—"}</p>
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
            <Badge variant={shop.is_active ? "outline" : "destructive"}>
              {shop.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">Dashboard</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="stats" className="mt-6">
          <StatsTab shopId={shopId} />
        </TabsContent>
        <TabsContent value="menu" className="mt-6">
          <MenuTab shopId={shopId} />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersTab shopId={shopId} />
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
  const { data: dash } = useQuery({
    queryKey: ["shop", shopId, "dashboard"],
    queryFn: () => shopsApi.dashboard(shopId),
  });
  const { data: stats } = useQuery({
    queryKey: ["shop", shopId, "stats"],
    queryFn: () => shopsApi.stats(shopId),
  });
  const merged = { ...(dash ?? {}), ...(stats ?? {}) };
  const entries = Object.entries(merged).filter(
    ([, v]) => typeof v === "number" || typeof v === "string",
  );
  if (entries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          No metrics yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {entries.map(([k, v]) => (
        <Stat
          key={k}
          label={k.replace(/_/g, " ")}
          value={
            typeof v === "number" && k.toLowerCase().includes("revenue")
              ? formatCurrency(v)
              : String(v)
          }
        />
      ))}
    </div>
  );
}

function MenuTab({ shopId }: { shopId: string }) {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: ["shop", shopId, "items", "owner"],
    queryFn: () => menuApi.listItems(shopId),
  });
  const [editing, setEditing] = useState<MenuItemOut | "new" | null>(null);
  const [variantsFor, setVariantsFor] = useState<MenuItemOut | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => menuApi.deleteItem(id),
    onSuccess: () => {
      toast.success("Item deleted");
      qc.invalidateQueries({ queryKey: ["shop", shopId, "items", "owner"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to delete"),
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
          {items.map((it) => (
            <Card key={it.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex-1">
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
  editing: MenuItemOut | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = editing && editing !== "new";
  const init = isEdit ? (editing as MenuItemOut) : null;
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
        console.log("[Menu Item Create/Update]", { 
          isEdit, 
          name: form.name, 
          price: form.price, 
          parsedPrice,
          dietary_type: form.dietary_type,
          prep_time_minutes: parsedPrepTime,
        });
        
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
          throw new ApiError(400, "Price must be greater than 0");
        }
        if (!form.name.trim()) {
          throw new ApiError(400, "Item name is required");
        }
        if (Number.isNaN(parsedPrepTime) || parsedPrepTime < 1 || parsedPrepTime > 180) {
          throw new ApiError(400, "Prep time must be between 1 and 180 minutes");
        }
        if (!["veg", "non_veg", "vegan"].includes(form.dietary_type)) {
          throw new ApiError(400, "Invalid dietary type");
        }
        
        const payload = {
          ...form,
          price: parsedPrice,
          prep_time_minutes: parsedPrepTime,
        };
        console.log("[Menu Item Payload]", payload);
        return isEdit
          ? menuApi.updateItem((editing as MenuItemOut).id, payload)
          : menuApi.createItem(shopId, payload);
      } catch (err) {
        console.error("[Menu Item Error before API]", err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log("[Menu Item Saved]");
      toast.success("Saved");
      onSaved();
      onClose();
    },
    onError: (e) => {
      console.error("[Menu Item Save Error]", e);
      const errorMsg = e instanceof ApiError 
        ? e.message 
        : (e instanceof Error ? e.message : "Failed");
      toast.error(errorMsg);
    },
  });

  if (!editing) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "New item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
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

function VariantsDialog({ item, onClose }: { item: MenuItemOut | null; onClose: () => void }) {
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
        console.log("[Variant Create]", { itemId: item!.id, name, price, parsedPrice });
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
          throw new ApiError(400, "Variant price must be greater than 0");
        }
        if (!name.trim()) {
          throw new ApiError(400, "Variant name is required");
        }
        return menuApi.createVariant(item.id, {
          name,
          price: parsedPrice,
          prep_time_minutes: 1,
          is_available: true,
        });
      } catch (err) {
        console.error("[Variant Create Error]", err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log("[Variant Created]");
      setName("");
      setPrice("");
      qc.invalidateQueries({ queryKey: ["item", item!.id, "variants"] });
      toast.success("Variant added");
    },
    onError: (e) => {
      console.error("[Variant Create Error Response]", e);
      toast.error(e instanceof ApiError ? e.message : "Failed");
    },
  });
  const remove = useMutation({
    mutationFn: (variantId: string) => menuApi.deleteVariant(variantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item", item!.id, "variants"] });
      toast.success("Variant deleted");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to delete variant"),
  });

  if (!item) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Variants — {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {(variants ?? []).map((v: VariantOut) => (
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

function OrdersTab({ shopId }: { shopId: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["shop", shopId, "orders", status],
    queryFn: () =>
      ordersApi.shopOrders(shopId, {
        page: 1,
        page_size: 100,
        status: status === "all" ? undefined : status,
      }),
    refetchInterval: 15_000,
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, st }: { id: string; st: OrderStatus }) => {
      setUpdatingOrderId(id);
      return ordersApi.updateStatus(id, { status: st });
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["shop", shopId, "orders"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
    onSettled: () => setUpdatingOrderId(null),
  });

  return (
    <div className="space-y-4">
      <Tabs value={status} onValueChange={setStatus}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          {ORDER_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No orders.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-muted-foreground">
                      #{o.id.slice(0, 8)}
                    </p>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-1 text-sm">
                    {o.items?.length ?? 0} items · {formatDate(o.created_at)}
                  </p>
                </div>
                <span className="font-semibold">{formatCurrency(o.total_amount)}</span>
                <Select
                  value={o.status}
                  disabled={updatingOrderId !== null}
                  onValueChange={(v) => updateStatus.mutate({ id: o.id, st: v as OrderStatus })}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
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
  initial: { name: string; description?: string | null; address?: string | null; phone?: string | null; cuisine?: string | null; image_url?: string | null; loyalty_discount_per_point?: number | null };
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
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
