import { jsxs, jsx } from "react/jsx-runtime";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, Store, ShieldCheck, MapPin, Phone, Star, Mail, Copy } from "lucide-react";
import { t as adminApi, B as Button, A as ApiError } from "./router-DQr6eapq.js";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { S as Switch } from "./switch-A4okOQiL.js";
import { B as Badge } from "./badge-sM2V1NmW.js";
import { S as Skeleton } from "./skeleton-B35717OU.js";
import { I as Input } from "./input-B-ZXk5uj.js";
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from "./select-B1wYRq7_.js";
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
function ShopCard({
  s,
  onMutated
}) {
  const ratingAvg = typeof s.rating_avg === "number" ? s.rating_avg : 0;
  const ratingCount = typeof s.rating_count === "number" ? s.rating_count : 0;
  const verify = useMutation({
    mutationFn: (v) => adminApi.verifyShop(s.id, {
      is_verified: v
    }),
    onSuccess: () => {
      toast.success(s.is_verified ? "Shop unverified" : "Shop verified");
      onMutated();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong")
  });
  const setActive = useMutation({
    mutationFn: (v) => adminApi.setShopActive(s.id, {
      is_active: v
    }),
    onSuccess: () => {
      toast.success("Updated status successfully");
      onMutated();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong")
  });
  return /* @__PURE__ */ jsx(Card, { className: "border-border/50 hover:border-border transition-all shadow-sm", children: /* @__PURE__ */ jsx(CardContent, { className: "p-6", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row gap-6 items-start justify-between", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex gap-4 flex-1 min-w-0 items-start text-left", children: [
      /* @__PURE__ */ jsx("div", { className: "hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary", children: /* @__PURE__ */ jsx(Store, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2 flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-base font-bold tracking-tight text-foreground truncate", children: s.name }),
          s.is_verified && /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "gap-0.5 bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/10 dark:text-blue-400 font-medium px-2 py-0", children: [
            /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3 w-3 text-blue-500" }),
            " Verified"
          ] }),
          /* @__PURE__ */ jsx(Badge, { variant: "outline", className: `text-[11px] px-2 py-0 ${s.is_open ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold" : "border-muted bg-muted/50 text-muted-foreground"}`, children: s.is_open ? "• Open" : "Closed" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded w-fit capitalize", children: s.category || "General Catering" }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pt-1.5 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5 truncate", children: [
            /* @__PURE__ */ jsx(MapPin, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground/60" }),
            s.city,
            ", ",
            s.state
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(Phone, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground/60" }),
            s.phone
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(Star, { className: "h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" }),
            ratingAvg.toFixed(1),
            " (",
            ratingCount,
            " reviews)"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5 truncate", children: [
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/60", children: "Owner:" }),
            /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground truncate", children: s.owner_name })
          ] })
        ] }),
        s.owner_email && /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-1.5 text-[11px] text-muted-foreground/70 pl-5", children: [
          /* @__PURE__ */ jsx(Mail, { className: "h-3 w-3 text-muted-foreground/50" }),
          " ",
          s.owner_email
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 pt-1", children: /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/80 bg-muted/60 px-2 py-0.5 rounded border border-border/40 shadow-inner", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "SHOP ID: ",
            /* @__PURE__ */ jsxs("span", { className: "text-foreground font-medium", children: [
              s.id.slice(0, 8),
              "..."
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: () => {
            navigator.clipboard.writeText(s.id);
            toast.success(`Copied Shop ID: ${s.name}`);
          }, className: "rounded p-0.5 hover:bg-background text-muted-foreground hover:text-foreground transition-colors", title: "Copy Full Shop UUID", children: /* @__PURE__ */ jsx(Copy, { className: "h-3 w-3" }) })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 w-full md:w-auto shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-border/40", children: [
      /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground md:order-first order-last", children: [
        "Registered ",
        formatDate(s.created_at)
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center md:flex-col lg:flex-row gap-3 w-full md:w-auto justify-end", children: [
        /* @__PURE__ */ jsx(Button, { size: "sm", variant: s.is_verified ? "outline" : "default", className: "h-8 px-3 text-xs font-medium min-w-[84px]", onClick: () => verify.mutate(!s.is_verified), disabled: verify.isPending, children: s.is_verified ? "Unverify" : "Verify" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 h-8 bg-muted/30 px-2.5 rounded-lg border border-border/30", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-muted-foreground min-w-[48px] text-right", children: s.is_active ? "Active" : "Disabled" }),
          /* @__PURE__ */ jsx(Switch, { checked: s.is_active, onCheckedChange: (v) => setActive.mutate(v), disabled: setActive.isPending })
        ] })
      ] })
    ] })
  ] }) }) });
}
function AdminShops() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ["admin", "shops", page, search, verifiedFilter, activeFilter],
    queryFn: () => adminApi.listShops({
      page,
      page_size: 20,
      search: search || void 0,
      verified: verifiedFilter === "all" ? void 0 : verifiedFilter === "yes",
      active: activeFilter === "all" ? void 0 : activeFilter === "yes"
    })
  });
  const {
    data: counts
  } = useQuery({
    queryKey: ["admin", "shops", "count"],
    queryFn: () => adminApi.countShops()
  });
  const invalidate = () => qc.invalidateQueries({
    queryKey: ["admin", "shops"]
  });
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-6xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "text-left", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Shops" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: counts ? `${counts.total} total · ${counts.verified} verified · ${counts.open_now} open now` : "Manage platform shops" })
    ] }),
    counts && /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-4 text-left", children: [{
      label: "Total",
      value: counts.total
    }, {
      label: "Verified",
      value: counts.verified
    }, {
      label: "Active",
      value: counts.active
    }, {
      label: "Open now",
      value: counts.open_now
    }].map(({
      label,
      value
    }) => /* @__PURE__ */ jsx(Card, { className: "border-border/50", children: /* @__PURE__ */ jsx(CardContent, { className: "flex items-center gap-3 p-4", children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "text-lg font-bold", children: value }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: label })
    ] }) }) }, label)) }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxs("form", { className: "relative flex-1 min-w-48", onSubmit: (e) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
      }, children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
        /* @__PURE__ */ jsx(Input, { className: "pl-9", placeholder: "Search shop, city, category…", value: searchInput, onChange: (e) => setSearchInput(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs(Select, { value: verifiedFilter, onValueChange: (v) => {
        setVerifiedFilter(v);
        setPage(1);
      }, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-36", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Verified" }) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "All shops" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "yes", children: "Verified only" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "no", children: "Unverified" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Select, { value: activeFilter, onValueChange: (v) => {
        setActiveFilter(v);
        setPage(1);
      }, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-32", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Status" }) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Any status" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "yes", children: "Active" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "no", children: "Disabled" })
        ] })
      ] }),
      search && /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: () => {
        setSearch("");
        setSearchInput("");
        setPage(1);
      }, children: "Clear" })
    ] }),
    isLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-2", children: Array.from({
      length: 5
    }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-24 rounded-xl" }, i)) }) : /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
      (data ?? []).map((s) => /* @__PURE__ */ jsx(ShopCard, { s, onMutated: invalidate }, s.id)),
      data?.length === 0 && /* @__PURE__ */ jsx(Card, { className: "border-dashed", children: /* @__PURE__ */ jsx(CardContent, { className: "py-12 text-center text-muted-foreground", children: "No shops found." }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2", children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: page === 1, onClick: () => setPage((p) => p - 1), children: /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsxs("span", { className: "px-3 py-2 text-sm font-medium", children: [
        "Page ",
        page
      ] }),
      /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: !data || data.length < 20, onClick: () => setPage((p) => p + 1), children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" }) })
    ] })
  ] });
}
export {
  AdminShops as component
};
