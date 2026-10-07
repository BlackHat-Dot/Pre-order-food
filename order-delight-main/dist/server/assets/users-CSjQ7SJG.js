import { jsxs, jsx } from "react/jsx-runtime";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Users, ShieldCheck, Search, ChevronLeft, ChevronRight, UserPlus, Key } from "lucide-react";
import { t as adminApi, B as Button, A as ApiError, D as Dialog, w as DialogTrigger, f as DialogContent, g as DialogHeader, h as DialogTitle, j as DialogFooter } from "./router-DQr6eapq.js";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { S as Switch } from "./switch-A4okOQiL.js";
import { B as Badge } from "./badge-sM2V1NmW.js";
import { S as Skeleton } from "./skeleton-B35717OU.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-B1wYRq7_.js";
import { I as Input } from "./input-B-ZXk5uj.js";
import { L as Label } from "./label-D-IOUQFS.js";
import { b as formatDate } from "./format-BBidFSeC.js";
import "@tanstack/react-router";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-switch";
import "@radix-ui/react-select";
import "@radix-ui/react-label";
const ROLE_COLORS = {
  admin: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  shop_owner: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  customer: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
};
function CreateUserDialog({
  onCreated
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "customer"
  });
  const create = useMutation({
    mutationFn: () => adminApi.createUser({
      ...form,
      email: form.email || void 0
    }),
    onSuccess: () => {
      toast.success("User created successfully");
      setOpen(false);
      setForm({
        name: "",
        phone: "",
        email: "",
        password: "",
        role: "customer"
      });
      onCreated();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong")
  });
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { size: "sm", className: "gap-2", children: [
      /* @__PURE__ */ jsx(UserPlus, { className: "h-4 w-4" }),
      " Add User"
    ] }) }),
    /* @__PURE__ */ jsxs(DialogContent, { className: "rounded-xl", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Create New User" }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3 py-2", children: [
        ["name", "phone", "email", "password"].map((f) => /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsxs(Label, { className: "capitalize text-xs", children: [
            f,
            f === "email" ? " (optional)" : ""
          ] }),
          /* @__PURE__ */ jsx(Input, { type: f === "password" ? "password" : f === "email" ? "email" : "text", value: form[f], onChange: (e) => setForm((p) => ({
            ...p,
            [f]: e.target.value
          })), placeholder: f === "phone" ? "10-digit number" : void 0, className: "rounded-lg" })
        ] }, f)),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Role" }),
          /* @__PURE__ */ jsxs(Select, { value: form.role, onValueChange: (v) => setForm((p) => ({
            ...p,
            role: v
          })), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "rounded-lg", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { className: "rounded-lg", children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "customer", children: "Customer" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "shop_owner", children: "Shop Owner" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "admin", children: "Admin" })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", className: "rounded-lg", onClick: () => setOpen(false), children: "Cancel" }),
        /* @__PURE__ */ jsx(Button, { className: "rounded-lg", onClick: () => create.mutate(), disabled: create.isPending || !form.name || !form.phone || !form.password, children: create.isPending ? "Creating..." : "Create User" })
      ] })
    ] })
  ] });
}
function UserRow({
  u,
  onMutated
}) {
  const [roleOpen, setRoleOpen] = useState(false);
  const setActive = useMutation({
    mutationFn: (v) => adminApi.setUserActive(u.id, {
      is_active: v
    }),
    onSuccess: () => {
      toast.success("Status updated");
      onMutated();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong")
  });
  const changeRole = useMutation({
    mutationFn: (role) => adminApi.changeUserRole(u.id, {
      role
    }),
    onSuccess: () => {
      toast.success("Role updated");
      setRoleOpen(false);
      onMutated();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong")
  });
  return /* @__PURE__ */ jsx(Card, { className: "border-border/60 hover:border-border transition-colors shadow-sm text-left", children: /* @__PURE__ */ jsxs(CardContent, { className: "flex flex-wrap items-center gap-3 p-4", children: [
    /* @__PURE__ */ jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase border", children: u.name.slice(0, 2) }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm text-foreground truncate max-w-[180px] sm:max-w-none", children: u.name }),
        u.role === "admin" && /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5 text-amber-500 shrink-0" }),
        /* @__PURE__ */ jsxs("span", { onClick: (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(u.id);
          toast.success("User UID copied!");
        }, className: "inline-flex items-center gap-1 font-mono text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-0.5 rounded border border-border/80 transition-colors cursor-pointer select-all shadow-sm", title: "Click to copy full UID", children: [
          /* @__PURE__ */ jsx(Key, { className: "h-2.5 w-2.5" }),
          /* @__PURE__ */ jsxs("span", { children: [
            "UID: ",
            u.id.slice(0, 8),
            "..."
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "truncate text-xs text-muted-foreground mt-0.5", children: [
        u.email ?? "No email",
        " · ",
        u.phone
      ] })
    ] }),
    /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground font-mono hidden sm:block", children: formatDate(u.created_at) }),
    /* @__PURE__ */ jsxs(Dialog, { open: roleOpen, onOpenChange: setRoleOpen, children: [
      /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx("button", { className: `rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:opacity-80 active:scale-95 ${ROLE_COLORS[u.role] ?? ""}`, children: u.role.replace("_", " ") }) }),
      /* @__PURE__ */ jsxs(DialogContent, { className: "max-w-xs rounded-xl", children: [
        /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { className: "text-sm font-bold text-muted-foreground", children: "Change User Role" }) }),
        /* @__PURE__ */ jsx("div", { className: "space-y-1.5 py-1", children: ["customer", "shop_owner", "admin"].map((r) => /* @__PURE__ */ jsxs("button", { onClick: () => changeRole.mutate(r), disabled: r === u.role || changeRole.isPending, className: `w-full rounded-lg border p-2 text-left text-xs font-semibold capitalize transition-colors hover:bg-muted ${r === u.role ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 cursor-not-allowed" : "cursor-pointer"}`, children: [
          r.replace("_", " "),
          " ",
          r === u.role && "(Current)"
        ] }, r)) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Switch, { checked: u.is_active, onCheckedChange: (v) => setActive.mutate(v), disabled: setActive.isPending })
  ] }) });
}
function AdminUsers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ["admin", "users", page, role, search],
    queryFn: () => {
      const params = {
        page,
        page_size: 20
      };
      if (role !== "all") params.role = role;
      if (search) params.search = search;
      return adminApi.listUsers(params);
    },
    staleTime: 0
  });
  const {
    data: counts
  } = useQuery({
    queryKey: ["admin", "users", "count"],
    queryFn: () => adminApi.countUsers()
  });
  const invalidate = () => qc.invalidateQueries({
    queryKey: ["admin", "users"]
  });
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-6xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4 text-left border-b pb-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold tracking-tight text-foreground flex items-center gap-2", children: [
          "Users Panel ",
          /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "font-mono text-[10px]", children: "Admin" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-0.5", children: counts ? `${counts.total} total · ${counts.active} active users on the platform` : "Manage platform users" })
      ] }),
      /* @__PURE__ */ jsx(CreateUserDialog, { onCreated: invalidate })
    ] }),
    counts && /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-4", children: [{
      label: "Total Users",
      value: counts.total,
      icon: Users
    }, {
      label: "Admins",
      value: counts.by_role.admin ?? 0,
      icon: ShieldCheck
    }, {
      label: "Shop Owners",
      value: counts.by_role.shop_owner ?? 0,
      icon: Users
    }, {
      label: "Customers",
      value: counts.by_role.customer ?? 0,
      icon: Users
    }].map(({
      label,
      value,
      icon: Icon
    }) => /* @__PURE__ */ jsx(Card, { className: "border-border/60 text-left bg-card/50", children: /* @__PURE__ */ jsxs(CardContent, { className: "flex items-center gap-3 p-4", children: [
      /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4 text-muted-foreground/70" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-lg font-bold tracking-tight", children: value }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: label })
      ] })
    ] }) }, label)) }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxs("form", { className: "relative flex-1 min-w-48", onSubmit: (e) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
      }, children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" }),
        /* @__PURE__ */ jsx(Input, { className: "pl-9 rounded-xl border-border/60", placeholder: "Search by name, email, or phone...", value: searchInput, onChange: (e) => setSearchInput(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs(Select, { value: role, onValueChange: (v) => {
        setRole(v);
        setPage(1);
      }, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44 rounded-xl", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxs(SelectContent, { className: "rounded-xl", children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "All Roles" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "customer", children: "Customer" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "shop_owner", children: "Shop Owner" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "admin", children: "Admin" })
        ] })
      ] }),
      search && /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "rounded-xl text-xs", onClick: () => {
        setSearch("");
        setSearchInput("");
        setPage(1);
      }, children: "Clear Search" })
    ] }),
    isLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-2", children: Array.from({
      length: 6
    }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-16 rounded-xl" }, i)) }) : /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
      (data ?? []).map((u) => /* @__PURE__ */ jsx(UserRow, { u, onMutated: invalidate }, u.id)),
      data?.length === 0 && /* @__PURE__ */ jsx(Card, { className: "border-dashed border-border/60 rounded-xl", children: /* @__PURE__ */ jsx(CardContent, { className: "py-12 text-center text-muted-foreground text-sm", children: "No users found matching the filter criteria." }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2", children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", className: "h-8 rounded-lg", disabled: page === 1, onClick: () => setPage((p) => p - 1), children: /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxs("span", { className: "px-3 py-1.5 text-xs font-mono font-bold bg-muted border rounded-lg", children: [
        "Page ",
        page
      ] }),
      /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", className: "h-8 rounded-lg", disabled: !data || data.length < 20, onClick: () => setPage((p) => p + 1), children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" }) })
    ] })
  ] });
}
export {
  AdminUsers as component
};
