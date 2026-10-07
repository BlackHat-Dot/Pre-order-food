import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ShieldCheck, Copy, Plus, Pencil, Trash2, ShieldAlert, UtensilsCrossed, Bike, Eye, User, Phone, Mail, Zap } from "lucide-react";
import { toast } from "sonner";
import { x as Route, s as shopsApi, o as ordersApi, m as menuApi, A as ApiError, B as Button, a as apiRequest, T as Textarea, D as Dialog, f as DialogContent, g as DialogHeader, h as DialogTitle, j as DialogFooter } from "./router-DQr6eapq.js";
import { C as Card, d as CardContent, a as CardHeader, b as CardTitle } from "./card-BjRrBkxP.js";
import { I as Input } from "./input-B-ZXk5uj.js";
import { L as Label } from "./label-D-IOUQFS.js";
import { S as Switch } from "./switch-A4okOQiL.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-CoISGPZI.js";
import { S as Skeleton } from "./skeleton-B35717OU.js";
import { B as Badge } from "./badge-sM2V1NmW.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-B1wYRq7_.js";
import { D as DEFAULT_COUNTRY, b as buildE164, i as isPhoneValid, a as COUNTRIES, C as CountryPhoneInput, M as Msg91Widget } from "./Msg91Widget-n1Mx60Yv.js";
import { f as formatCurrency, b as formatDate } from "./format-BBidFSeC.js";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-label";
import "@radix-ui/react-switch";
import "@radix-ui/react-tabs";
import "@radix-ui/react-select";
const VALID_TRANSITIONS = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["completed"],
  completed: [],
  cancelled: []
};
const STATUS_COLORS = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  accepted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  preparing: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  ready: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold",
  cancel_requested: "bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold animate-pulse",
  cancelled: "bg-red-600/10 text-red-600 border-red-600/30 font-bold"
};
const STATUS_PRIORITY = {
  ready: 1,
  accepted: 2,
  preparing: 3,
  pending: 4,
  completed: 5,
  cancelled: 6
};
function StatusBadge({
  status
}) {
  const current = (status || "pending").toLowerCase();
  const styling = STATUS_COLORS[current] || "bg-muted text-muted-foreground border-transparent";
  return /* @__PURE__ */ jsx(Badge, { variant: "outline", className: `text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded shadow-none ${styling}`, children: current.replace("_", " ") });
}
function OwnerShop() {
  const {
    shopId
  } = Route.useParams();
  const qc = useQueryClient();
  const {
    data: shop,
    isLoading
  } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => shopsApi.get(shopId)
  });
  const {
    data: requestData
  } = useQuery({
    queryKey: ["shop", shopId, "request-counter"],
    queryFn: () => ordersApi.shopOrders(shopId, {
      page: 1,
      page_size: 100,
      status: void 0
    }),
    refetchInterval: 5e3
  });
  const setStatus = useMutation({
    mutationFn: (is_open) => shopsApi.setStatus(shopId, {
      is_open
    }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({
        queryKey: ["shop", shopId]
      });
    }
  });
  const requestCount = (() => {
    const orders = requestData ?? [];
    return orders.filter((o) => String(o.status || "").toLowerCase() === "cancel_requested").length;
  })();
  if (isLoading) return /* @__PURE__ */ jsx(Skeleton, { className: "h-64 w-full" });
  if (!shop) return null;
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-6xl space-y-6", children: [
    /* @__PURE__ */ jsxs(Link, { to: "/owner", className: "inline-flex items-center text-sm text-muted-foreground hover:text-foreground", children: [
      /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }),
      " My shops"
    ] }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "flex flex-wrap items-start justify-between gap-4 p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-left", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight", children: shop.name }),
          shop.is_verified && /* @__PURE__ */ jsx(ShieldCheck, { className: "h-5 w-5 text-primary" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: shop.cuisine ?? "—" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-center gap-2 text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxs("span", { className: "font-mono", children: [
          "ID: ",
          shop.id
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => {
          navigator.clipboard.writeText(shop.id);
          toast.success("Shop ID copied to clipboard!");
        }, className: "rounded-md p-1 hover:bg-muted hover:text-foreground transition-colors", title: "Copy Shop ID", children: /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Open" }),
          /* @__PURE__ */ jsx(Switch, { checked: !!shop.is_open, disabled: setStatus.isPending, onCheckedChange: (v) => setStatus.mutate(v) })
        ] }),
        /* @__PURE__ */ jsx(Badge, { variant: shop.is_active ? "outline" : "destructive", children: shop.is_active ? "Active" : "Inactive" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs(Tabs, { defaultValue: "orders", children: [
      /* @__PURE__ */ jsxs(TabsList, { className: "overflow-visible", children: [
        /* @__PURE__ */ jsx(TabsTrigger, { value: "stats", children: "Dashboard" }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "menu", children: "Menu" }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "orders", children: "Orders" }),
        /* @__PURE__ */ jsxs(TabsTrigger, { value: "requests", className: "flex items-center gap-2", children: [
          "Requests",
          requestCount > 0 && /* @__PURE__ */ jsx("span", { className: "flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white animate-pulse", children: requestCount > 99 ? "99+" : requestCount })
        ] }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "settings", children: "Settings" })
      ] }),
      /* @__PURE__ */ jsx(TabsContent, { value: "stats", className: "mt-6", children: /* @__PURE__ */ jsx(StatsTab, { shopId }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "menu", className: "mt-6", children: /* @__PURE__ */ jsx(MenuTab, { shopId }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "orders", className: "mt-6", children: /* @__PURE__ */ jsx(OrdersTab, { shopId, forceRequestsOnly: false }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "requests", className: "mt-6", children: /* @__PURE__ */ jsx(OrdersTab, { shopId, forceRequestsOnly: true }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "settings", className: "mt-6", children: /* @__PURE__ */ jsx(SettingsTab, { shopId, initial: shop }) })
    ] })
  ] });
}
function Stat({
  label,
  value
}) {
  return /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-5 text-left", children: [
    /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsx("p", { className: "mt-1 text-2xl font-bold", children: value })
  ] }) });
}
function StatsTab({
  shopId
}) {
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ["shop", shopId, "dashboard"],
    queryFn: () => shopsApi.dashboard(shopId)
  });
  if (isLoading) return /* @__PURE__ */ jsx(Skeleton, { className: "h-32 w-full" });
  if (error || !data || Object.keys(data).length === 0) {
    return /* @__PURE__ */ jsx(Card, { className: "border-dashed", children: /* @__PURE__ */ jsx(CardContent, { className: "py-12 text-center text-muted-foreground", children: "No metrics yet." }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 md:grid-cols-5", children: [
    /* @__PURE__ */ jsx(Stat, { label: "Total Orders", value: data.total_orders ?? 0 }),
    /* @__PURE__ */ jsx(Stat, { label: "Today's Orders", value: data.today_orders ?? 0 }),
    /* @__PURE__ */ jsx(Stat, { label: "Pending Active", value: data.pending_orders ?? 0 }),
    /* @__PURE__ */ jsx(Stat, { label: "Completed", value: data.completed_orders ?? 0 }),
    /* @__PURE__ */ jsx(Stat, { label: "Total Revenue", value: formatCurrency(data.total_revenue ?? 0) })
  ] });
}
function MenuTab({
  shopId
}) {
  const qc = useQueryClient();
  const {
    data: items,
    isLoading
  } = useQuery({
    queryKey: ["shop", shopId, "items", "owner"],
    queryFn: () => menuApi.listItems(shopId)
  });
  const [editing, setEditing] = useState(null);
  const [variantsFor, setVariantsFor] = useState(null);
  const remove = useMutation({
    mutationFn: (id) => menuApi.deleteItem(id),
    onSuccess: () => {
      toast.success("Item deleted");
      qc.invalidateQueries({
        queryKey: ["shop", shopId, "items", "owner"]
      });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong")
  });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxs(Button, { onClick: () => setEditing("new"), children: [
      /* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }),
      " New item"
    ] }) }),
    isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-32 w-full" }) : !items || items.length === 0 ? /* @__PURE__ */ jsx(Card, { className: "border-dashed", children: /* @__PURE__ */ jsx(CardContent, { className: "py-12 text-center text-muted-foreground", children: "No items yet." }) }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: items.map((it) => /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "flex items-center gap-3 p-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex-1 text-left", children: [
        /* @__PURE__ */ jsx("p", { className: "font-medium", children: it.name }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
          formatCurrency(it.price),
          " · ",
          it.category ?? "—"
        ] })
      ] }),
      /* @__PURE__ */ jsx(Badge, { variant: it.is_available === false ? "secondary" : "outline", children: it.is_available === false ? "Unavailable" : "Available" }),
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => setVariantsFor(it), children: "Variants" }),
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", onClick: () => setEditing(it), children: /* @__PURE__ */ jsx(Pencil, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", onClick: () => {
        if (confirm(`Delete "${it.name}"?`)) remove.mutate(it.id);
      }, children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4 text-destructive" }) })
    ] }) }, it.id)) }),
    /* @__PURE__ */ jsx(ItemDialog, { shopId, editing, onClose: () => setEditing(null), onSaved: () => qc.invalidateQueries({
      queryKey: ["shop", shopId, "items", "owner"]
    }) }),
    /* @__PURE__ */ jsx(VariantsDialog, { item: variantsFor, onClose: () => setVariantsFor(null) })
  ] });
}
function ItemDialog({
  shopId,
  editing,
  onClose,
  onSaved
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
    is_available: init?.is_available ?? true
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
      is_available: init?.is_available ?? true
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
          is_available: form.is_available
        };
        return isEdit ? menuApi.updateItem(editing.id, payload) : menuApi.createItem(shopId, payload);
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
    }
  });
  if (!editing) return null;
  return /* @__PURE__ */ jsx(Dialog, { open: true, onOpenChange: (o) => !o && onClose(), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: isEdit ? "Edit item" : "New item" }) }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-3 text-left", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
        "Fields marked with ",
        /* @__PURE__ */ jsx("span", { className: "text-destructive", children: "*" }),
        " are required."
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxs(Label, { children: [
          "Name ",
          /* @__PURE__ */ jsx("span", { className: "text-destructive", children: "*" })
        ] }),
        /* @__PURE__ */ jsx(Input, { value: form.name, onChange: (e) => setForm((f) => ({
          ...f,
          name: e.target.value
        })) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Description" }),
        /* @__PURE__ */ jsx(Textarea, { value: form.description ?? "", onChange: (e) => setForm((f) => ({
          ...f,
          description: e.target.value
        })) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs(Label, { children: [
            "Price ",
            /* @__PURE__ */ jsx("span", { className: "text-destructive", children: "*" })
          ] }),
          /* @__PURE__ */ jsx(Input, { type: "number", step: "0.01", min: "0.01", value: form.price, onChange: (e) => setForm((f) => ({
            ...f,
            price: e.target.value
          })) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Category" }),
          /* @__PURE__ */ jsx(Input, { value: form.category ?? "", onChange: (e) => setForm((f) => ({
            ...f,
            category: e.target.value
          })) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs(Label, { children: [
            "Dietary Type ",
            /* @__PURE__ */ jsx("span", { className: "text-destructive", children: "*" })
          ] }),
          /* @__PURE__ */ jsxs(Select, { value: form.dietary_type, onValueChange: (v) => setForm((f) => ({
            ...f,
            dietary_type: v
          })), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "veg", children: "Vegetarian" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "non_veg", children: "Non-Vegetarian" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "vegan", children: "Vegan" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs(Label, { children: [
            "Prep Time (min) ",
            /* @__PURE__ */ jsx("span", { className: "text-destructive", children: "*" })
          ] }),
          /* @__PURE__ */ jsx(Input, { type: "number", min: "1", max: "180", value: form.prep_time_minutes, onChange: (e) => setForm((f) => ({
            ...f,
            prep_time_minutes: e.target.value
          })) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Image URL" }),
        /* @__PURE__ */ jsx(Input, { value: form.image_url ?? "", onChange: (e) => setForm((f) => ({
          ...f,
          image_url: e.target.value
        })) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx(Label, { children: "Available" }),
        /* @__PURE__ */ jsx(Switch, { checked: !!form.is_available, onCheckedChange: (v) => setForm((f) => ({
          ...f,
          is_available: v
        })) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: onClose, children: "Cancel" }),
      /* @__PURE__ */ jsx(Button, { onClick: () => save.mutate(), disabled: save.isPending || !form.name.trim() || !form.price.trim(), children: "Save" })
    ] })
  ] }) });
}
function VariantsDialog({
  item,
  onClose
}) {
  const qc = useQueryClient();
  const {
    data: variants
  } = useQuery({
    queryKey: ["item", item?.id, "variants"],
    queryFn: () => {
      if (!item) return Promise.resolve([]);
      return menuApi.listVariants(item.id);
    },
    enabled: !!item
  });
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
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
        return menuApi.createVariant(item.id, {
          name,
          price: parsedPrice,
          prep_time_minutes: 1,
          is_available: true
        });
      } catch (err) {
        throw err;
      }
    },
    onSuccess: () => {
      setName("");
      setPrice("");
      qc.invalidateQueries({
        queryKey: ["item", item.id, "variants"]
      });
      toast.success("Variant added");
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong");
    }
  });
  const remove = useMutation({
    mutationFn: (variantId) => menuApi.deleteVariant(variantId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["item", item.id, "variants"]
      });
      toast.success("Variant deleted");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong")
  });
  if (!item) return null;
  return /* @__PURE__ */ jsx(Dialog, { open: true, onOpenChange: (o) => !o && onClose(), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsxs(DialogTitle, { children: [
      "Variants — ",
      item.name
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "space-y-2", children: (variants ?? []).map((v) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-md border border-border p-3 text-sm", children: [
      /* @__PURE__ */ jsx("span", { children: v.name }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("span", { className: "font-medium", children: formatCurrency(v.price) }),
        /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", onClick: () => {
          if (confirm(`Delete variant "${v.name}"?`)) remove.mutate(v.id);
        }, children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4 text-destructive" }) })
      ] })
    ] }, v.id)) }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[1fr_120px_auto] gap-2 pt-2", children: [
      /* @__PURE__ */ jsx(Input, { placeholder: "Name", value: name, onChange: (e) => setName(e.target.value) }),
      /* @__PURE__ */ jsx(Input, { type: "number", placeholder: "Price", value: price, min: "0.01", step: "0.01", onChange: (e) => setPrice(e.target.value) }),
      /* @__PURE__ */ jsx(Button, { onClick: () => create.mutate(), disabled: !name.trim() || !price.trim() || create.isPending, children: "Add" })
    ] }),
    /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: onClose, children: "Done" }) })
  ] }) });
}
function OrdersTab({
  shopId,
  forceRequestsOnly = false
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});
  const queryKey = ["shop", shopId, "orders", status, forceRequestsOnly];
  const {
    data,
    isLoading
  } = useQuery({
    queryKey,
    queryFn: () => ordersApi.shopOrders(shopId, {
      page: 1,
      page_size: 100,
      status: void 0
    }),
    refetchInterval: 5e3
  });
  const updateStatus = useMutation({
    onMutate: async (vars) => {
      setUpdatingOrderId(vars.id);
      await qc.cancelQueries({
        queryKey
      });
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((order) => order.id === vars.id ? {
            ...order,
            status: vars.st
          } : order);
        }
        const response = old;
        if (Array.isArray(response?.items)) {
          return {
            ...response,
            items: response.items.map((order) => order.id === vars.id ? {
              ...order,
              status: vars.st
            } : order)
          };
        }
        return old;
      });
      return {
        previous
      };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else if (err?.message && typeof err.message === "string") {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong");
      }
    },
    mutationFn: async ({
      id,
      st
    }) => {
      setUpdatingOrderId(id);
      return apiRequest(`/api/v1/orders/${id}/status`, {
        method: "PATCH",
        body: {
          status: st
        }
      });
    },
    onSuccess: () => {
      toast.success("Order status updated");
      qc.invalidateQueries({
        queryKey
      });
    },
    onSettled: () => setUpdatingOrderId(null)
  });
  const toggleExpand = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };
  const getOrdersList = () => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    const response = data;
    if (Array.isArray(response?.items)) return response.items;
    return [];
  };
  const visibleOrders = [...getOrdersList()].filter((o) => {
    const itemStatus = String(o.status || "").toLowerCase();
    if (forceRequestsOnly) return itemStatus === "cancel_requested";
    if (itemStatus === "cancel_requested") return false;
    if (status === "all") return true;
    return itemStatus === status;
  }).sort((a, b) => {
    if (!forceRequestsOnly && status === "all") {
      const priorityA = STATUS_PRIORITY[String(a.status || "").toLowerCase()] ?? 999;
      const priorityB = STATUS_PRIORITY[String(b.status || "").toLowerCase()] ?? 999;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4 text-left", children: [
    /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: !forceRequestsOnly ? /* @__PURE__ */ jsx(Tabs, { value: status, onValueChange: setStatus, children: /* @__PURE__ */ jsxs(TabsList, { className: "h-8 flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5 shadow-none", children: [
      /* @__PURE__ */ jsx(TabsTrigger, { value: "all", className: "rounded-md px-3 text-xs h-7", children: "All Tickets" }),
      /* @__PURE__ */ jsx(TabsTrigger, { value: "pending", className: "rounded-md px-3 text-xs h-7", children: "Pending" }),
      /* @__PURE__ */ jsx(TabsTrigger, { value: "accepted", className: "rounded-md px-3 text-xs h-7", children: "Accepted" }),
      /* @__PURE__ */ jsx(TabsTrigger, { value: "preparing", className: "rounded-md px-3 text-xs h-7", children: "Preparing" }),
      /* @__PURE__ */ jsx(TabsTrigger, { value: "ready", className: "rounded-md px-3 text-xs h-7", children: "Ready" }),
      /* @__PURE__ */ jsx(TabsTrigger, { value: "completed", className: "rounded-md px-3 text-xs h-7", children: "Completed" })
    ] }) }) : /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-200", children: [
      /* @__PURE__ */ jsx(ShieldAlert, { className: "h-4 w-4" }),
      "Cancellation requests only"
    ] }) }),
    isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-12 w-full rounded-lg animate-pulse" }) : visibleOrders.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-dashed border-border/60 py-12 text-center text-xs font-medium text-muted-foreground", children: "No active kitchen orders matching context rules." }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: visibleOrders.map((o) => {
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
      const canChangePipeline = !isAnyRowProcessing && !isFraudLocked && !isCancelledState && !isCompletedState && nextAllowedOptions.length > 0;
      const OrderStatusSelector = ({
        compact = true
      }) => /* @__PURE__ */ jsxs(Select, { value: String(o.status || "pending"), disabled: isAnyRowProcessing || nextAllowedOptions.length === 0 || isFraudLocked || isCompletionBlocked, onValueChange: (v) => updateStatus.mutate({
        id: o.id,
        st: v
      }), children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: ["capitalize font-medium text-[11px] rounded-md border bg-background shadow-none px-2", compact ? "h-7 w-28" : "h-8 w-32", isCompletionBlocked ? "border-amber-500/40 bg-amber-500/[0.03] cursor-not-allowed" : ""].join(" "), children: /* @__PURE__ */ jsx(SelectValue, { placeholder: isCompletionBlocked ? "Collect cash first" : void 0 }) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: String(o.status || "pending"), disabled: true, className: "text-xs font-semibold", children: String(o.status || "pending").replace("_", " ") }),
          nextAllowedOptions.map((step) => /* @__PURE__ */ jsx(SelectItem, { value: step, className: "capitalize text-xs font-medium", children: step.replace("_", " ") }, step))
        ] })
      ] });
      return /* @__PURE__ */ jsxs(Card, { className: ["border border-border/50 shadow-none rounded-lg hover:border-border/100 transition-all", isExpanded ? "bg-muted/40 border-primary/30" : "bg-card"].join(" "), children: [
        /* @__PURE__ */ jsxs(CardContent, { className: "p-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-normal", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 w-full md:w-auto text-left shrink-0", children: [
            /* @__PURE__ */ jsxs("span", { className: "font-mono font-semibold text-foreground bg-muted border px-2 py-0.5 rounded text-[11px]", children: [
              "#",
              o.order_number ?? String(o.id).slice(0, 8).toUpperCase()
            ] }),
            /* @__PURE__ */ jsx(StatusBadge, { status: currentStatus }),
            /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded bg-background border-border/50 text-muted-foreground gap-1.5 flex items-center shadow-none", children: isTableMode ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(UtensilsCrossed, { className: "h-3.5 w-3.5 text-amber-500 shrink-0" }),
              " Table"
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Bike, { className: "h-3.5 w-3.5 text-blue-500 shrink-0" }),
              " Delivery"
            ] }) }),
            /* @__PURE__ */ jsxs(Badge, { className: `text-[10px] font-medium px-2 py-0.5 rounded border shadow-none ${isSettled ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`, children: [
              methodDisplay,
              " · ",
              isSettled ? "PAID" : "UNPAID"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-1 text-left sm:text-right text-muted-foreground text-[11px] flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "truncate", children: [
              /* @__PURE__ */ jsx("span", { className: "text-foreground font-medium", children: "Customer:" }),
              " ",
              buyerName
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "truncate font-mono", children: [
              /* @__PURE__ */ jsx("span", { className: "text-foreground font-medium", children: "Phone:" }),
              " ",
              buyerPhone
            ] }),
            /* @__PURE__ */ jsx("div", { className: "sm:ml-auto font-mono text-muted-foreground/80", children: formatDate(o.created_at) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between w-full md:w-auto gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-border/20 shrink-0", children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-sm text-foreground tracking-tight min-w-[75px] text-right", children: formatCurrency(o.total_price) }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              isCancelRequested ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 bg-rose-500/5 p-1 border border-rose-500/10 rounded-lg", children: [
                /* @__PURE__ */ jsx(Button, { size: "sm", variant: "destructive", disabled: isAnyRowProcessing, onClick: () => updateStatus.mutate({
                  id: o.id,
                  st: "cancelled"
                }), className: "h-7 text-[10px] font-bold px-2 rounded-md shadow-none", children: "Accept" }),
                /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", disabled: isAnyRowProcessing, onClick: () => updateStatus.mutate({
                  id: o.id,
                  st: "resume_order"
                }), className: "h-7 text-[10px] font-bold px-2 rounded-md bg-background shadow-none text-foreground", children: "Resume" })
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                methodDisplay === "COD" && !isFraudLocked && !isCancelledState && !isCompletedState && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", disabled: isAnyRowProcessing || isSettled, onClick: () => updateStatus.mutate({
                  id: o.id,
                  st: "mark_as_paid"
                }), className: `h-7 rounded-md px-2 text-[10px] font-medium border shadow-none transition-all ${isSettled ? "cursor-not-allowed border-border bg-muted text-muted-foreground" : "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10"}`, children: "Paid" }),
                !isExpanded && canChangePipeline && !isCurrentOrderUpdating && /* @__PURE__ */ jsx(OrderStatusSelector, { compact: true }),
                (isCancelledState || isCompletedState) && !isExpanded && /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted border px-2 py-1 rounded-md select-none", children: "Locked" })
              ] }),
              /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", className: "h-7 text-[11px] font-semibold px-2 rounded text-primary gap-1 border border-border/40 hover:bg-muted/40 transition-all bg-background shrink-0", onClick: () => toggleExpand(o.id), children: [
                /* @__PURE__ */ jsx(Eye, { className: "h-3.5 w-3.5" }),
                " View"
              ] })
            ] })
          ] })
        ] }),
        isExpanded && /* @__PURE__ */ jsxs("div", { className: "bg-muted/10 p-4 space-y-4 border-t border-border/30 animate-in slide-in-from-top-1 duration-150 text-left", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] bg-background border p-3 rounded-lg border-border/50", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxs("p", { className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1", children: [
                /* @__PURE__ */ jsx(User, { className: "h-3 w-3" }),
                " Customer Profile"
              ] }),
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-foreground", children: buyerName })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1 md:border-l md:pl-4 border-border/40", children: [
              /* @__PURE__ */ jsxs("p", { className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1", children: [
                /* @__PURE__ */ jsx(Phone, { className: "h-3 w-3" }),
                " Phone Channel"
              ] }),
              /* @__PURE__ */ jsx("p", { className: "font-medium text-foreground font-mono", children: buyerPhone })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1 md:border-l md:pl-4 border-border/40", children: [
              /* @__PURE__ */ jsxs("p", { className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1", children: [
                /* @__PURE__ */ jsx(Mail, { className: "h-3 w-3" }),
                " Email Profile"
              ] }),
              /* @__PURE__ */ jsx("p", { className: "font-medium text-foreground truncate max-w-[180px]", children: buyerEmail })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] bg-background border p-3 rounded-lg border-border/50", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider", children: "Fulfillment Destination" }),
              /* @__PURE__ */ jsx("p", { className: "font-medium text-foreground", children: isTableMode ? "🪑 Dine-In Table Booking" : o.delivery_address_id || "Counter Pickup" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1 md:border-l md:pl-4 border-border/40", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider", children: "Financial Protocol" }),
              /* @__PURE__ */ jsxs("p", { className: "font-medium text-foreground", children: [
                methodDisplay,
                " (",
                isSettled ? "Settled paid" : "Unpaid state",
                ")"
              ] })
            ] })
          ] }),
          isCancelRequested && o.cancellation_reason && /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-rose-400 uppercase tracking-wider", children: "Cancellation Reason" }),
            /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-rose-500/20 bg-rose-500/5 p-3", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-foreground", children: o.cancellation_reason }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-0.5", children: "Order Items Summary" }),
            /* @__PURE__ */ jsx("div", { className: "rounded-lg border bg-background p-2 space-y-1", children: Array.isArray(o.items) && o.items.length > 0 ? o.items.map((item, idx) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs py-1 border-b last:border-0 border-border/20", children: [
              /* @__PURE__ */ jsx("span", { className: "text-foreground font-medium", children: item.item_name_snapshot || "Dish Option" }),
              /* @__PURE__ */ jsxs("span", { className: "font-mono text-[11px] font-bold bg-muted border px-1.5 py-0 rounded", children: [
                "×",
                item.quantity
              ] })
            ] }, `${o.id}-${idx}`)) : /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground italic text-center py-1", children: "No basket snapshot lines logged." }) })
          ] }),
          !isCancelledState && !isCompletedState && !isCurrentOrderUpdating && /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-border/20 mt-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-[10px] font-bold text-muted-foreground uppercase tracking-wider sm:w-28 flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(Zap, { className: "h-3 w-3 text-primary shrink-0" }),
              " Modify Pipeline:"
            ] }),
            /* @__PURE__ */ jsx(OrderStatusSelector, { compact: false })
          ] })
        ] })
      ] }, o.id);
    }) })
  ] });
}
function SettingsTab({
  shopId,
  initial
}) {
  const qc = useQueryClient();
  const originalPhone = initial.phone ?? "";
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState(null);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [form, setForm] = useState({
    name: initial.name ?? "",
    description: initial.description ?? "",
    address: initial.address ?? "",
    cuisine: initial.cuisine ?? "",
    image_url: initial.image_url ?? "",
    pincode: initial.pincode ?? "",
    loyalty_discount_per_point: String(initial.loyalty_discount_per_point ?? 0.1)
  });
  const stateRef = useRef({
    localNumber,
    cleanFullPhone: ""
  });
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
      loyalty_discount_per_point: String(initial.loyalty_discount_per_point ?? 0.1)
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
    const sortedCOUNTRIES = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    const matchedCountry = sortedCOUNTRIES.find((c) => initial.phone.startsWith(c.dialCode));
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
        phone_verification_token: phoneChanged ? phoneVerificationToken : void 0,
        loyalty_discount_per_point: parsedLoyalty
      });
    },
    onSuccess: () => {
      toast.success("Saved");
      const targetPhone = phoneChanged ? cleanFullPhone : originalPhone;
      setVerifiedPhone(targetPhone);
      setPhoneVerified(true);
      setPhoneVerificationToken(null);
      qc.invalidateQueries({
        queryKey: ["shop", shopId]
      });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong")
  });
  function resetPhoneVerification() {
    setPhoneVerified(false);
    setVerifiedPhone(null);
    setPhoneVerificationToken(null);
  }
  function handleCountryChange(c) {
    setCountry(c);
    let candidate = "";
    try {
      candidate = buildE164(c.dialCode, localNumber.trim());
    } catch {
    }
    if (verifiedPhone && candidate !== verifiedPhone) {
      resetPhoneVerification();
    }
  }
  function handleLocalNumberChange(n) {
    setLocalNumber(n);
    let candidate = "";
    try {
      candidate = buildE164(country.dialCode, n.trim());
    } catch {
    }
    if (verifiedPhone && candidate !== verifiedPhone) {
      resetPhoneVerification();
    }
  }
  function handlePhoneVerified(token, phone) {
    setPhoneVerificationToken(token);
    setVerifiedPhone(phone);
    setPhoneVerified(true);
    toast.success("Phone verified successfully");
  }
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { className: "text-left", children: /* @__PURE__ */ jsx(CardTitle, { children: "Shop settings" }) }),
    /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4 text-left", children: [
      ["name", "cuisine", "address", "pincode", "image_url"].map((k) => /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { className: "capitalize", children: k.replace("_", " ") }),
        /* @__PURE__ */ jsx(Input, { value: form[k] ?? "", onChange: (e) => setForm((f) => ({
          ...f,
          [k]: e.target.value
        })) })
      ] }, k)),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Phone Number" }),
        /* @__PURE__ */ jsx(CountryPhoneInput, { country, localNumber, onCountryChange: handleCountryChange, onLocalNumberChange: handleLocalNumberChange }),
        /* @__PURE__ */ jsx(Msg91Widget, { phone: cleanFullPhone, purpose: "profile_phone", onVerified: handlePhoneVerified, disabled: !phoneReady, isVerified: phoneVerified }),
        isHydrating ? /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground animate-pulse", children: "Syncing contact profiles..." }) : phoneVerified ? /* @__PURE__ */ jsxs("p", { className: "text-xs text-emerald-500", children: [
          "Verified: ",
          verifiedPhone
        ] }) : /* @__PURE__ */ jsx("p", { className: "text-xs text-amber-500", children: "Phone number requires verification" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Loyalty discount per point" }),
        /* @__PURE__ */ jsx(Input, { type: "number", min: "0", step: "0.01", value: form.loyalty_discount_per_point, onChange: (e) => setForm((f) => ({
          ...f,
          loyalty_discount_per_point: e.target.value
        })) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Description" }),
        /* @__PURE__ */ jsx(Textarea, { value: form.description ?? "", onChange: (e) => setForm((f) => ({
          ...f,
          description: e.target.value
        })) })
      ] }),
      /* @__PURE__ */ jsx(Button, { onClick: () => save.mutate(), disabled: save.isPending || isHydrating || !cleanFullPhone || phoneChanged && !phoneVerified, children: "Save" })
    ] })
  ] });
}
export {
  OwnerShop as component
};
