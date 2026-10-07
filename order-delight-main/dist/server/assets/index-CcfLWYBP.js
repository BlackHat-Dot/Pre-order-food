import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Store, ShieldCheck } from "lucide-react";
import { s as shopsApi, B as Button } from "./router-DQr6eapq.js";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { B as Badge } from "./badge-sM2V1NmW.js";
import { S as Skeleton } from "./skeleton-B35717OU.js";
import "react";
import "sonner";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
function OwnerHome() {
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ["my-shops"],
    queryFn: shopsApi.myShops
  });
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-6xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "My shops" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Manage your shops and menus." })
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/owner/shops/new", children: /* @__PURE__ */ jsxs(Button, { children: [
        /* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }),
        " New shop"
      ] }) })
    ] }),
    isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-32 w-full" }) : !data || data.length === 0 ? /* @__PURE__ */ jsx(Card, { className: "border-dashed", children: /* @__PURE__ */ jsxs(CardContent, { className: "flex flex-col items-center py-16 text-center", children: [
      /* @__PURE__ */ jsx(Store, { className: "mb-2 h-10 w-10 text-muted-foreground" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "You don't have any shops yet." }),
      /* @__PURE__ */ jsx(Link, { to: "/owner/shops/new", className: "mt-4", children: /* @__PURE__ */ jsx(Button, { children: "Create your first shop" }) })
    ] }) }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", children: data.map((s) => /* @__PURE__ */ jsx(Link, { to: "/owner/shops/$shopId", params: {
      shopId: s.id
    }, children: /* @__PURE__ */ jsx(Card, { className: "h-full transition-colors hover:border-primary/40", children: /* @__PURE__ */ jsxs(CardContent, { className: "space-y-2 p-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("h3", { className: "font-semibold", children: s.name }),
        s.is_verified && /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4 text-primary" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: s.cuisine ?? "—" }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1.5 pt-1", children: [
        /* @__PURE__ */ jsx(Badge, { variant: s.is_open ? "default" : "secondary", children: s.is_open ? "Open" : "Closed" }),
        /* @__PURE__ */ jsx(Badge, { variant: s.is_active ? "outline" : "destructive", children: s.is_active ? "Active" : "Inactive" })
      ] })
    ] }) }) }, s.id)) })
  ] });
}
export {
  OwnerHome as component
};
