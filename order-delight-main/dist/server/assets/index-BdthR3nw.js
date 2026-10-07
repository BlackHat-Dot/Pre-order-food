import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, Search, ShieldCheck, Zap, Award, Clock, TrendingUp, AlertTriangle, MapPin, ChevronRight } from "lucide-react";
import { s as shopsApi, B as Button } from "./router-DQr6eapq.js";
import { P as PublicNav } from "./PublicNav-Ce66gdj8.js";
import { I as Input } from "./input-B-ZXk5uj.js";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { B as Badge } from "./badge-sM2V1NmW.js";
import { S as Skeleton } from "./skeleton-B35717OU.js";
import "sonner";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "./nav-CWlJKvXT.js";
import "./dropdown-menu-CRgp8eCB.js";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-popover";
const FEATURES = [{
  icon: Zap,
  title: "Pre-order in seconds",
  desc: "Browse menus, customize your order, and lock it in — all before you even leave home."
}, {
  icon: Clock,
  title: "Zero wait time",
  desc: "Your order is ready the moment you arrive. Walk in, pick up, walk out."
}, {
  icon: Award,
  title: "Earn loyalty points",
  desc: "Every order earns you points you can redeem for discounts at your favourite shops."
}, {
  icon: TrendingUp,
  title: "Track in real-time",
  desc: "Follow your order from confirmation to ready — with live status updates."
}];
const FALLBACK_SHOP_IMAGES = ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80"];
function getShopFallbackImage(shop) {
  const key = `${shop.id}-${shop.name}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_SHOP_IMAGES[Math.abs(hash) % FALLBACK_SHOP_IMAGES.length];
}
function ShopCard({
  shop
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const fallbackImage = getShopFallbackImage(shop);
  const displayImage = !imgFailed && shop.image_url ? shop.image_url : fallbackImage;
  return /* @__PURE__ */ jsx(Link, { to: "/shops/$shopId", params: {
    shopId: shop.id
  }, className: "group block", children: /* @__PURE__ */ jsxs(Card, { className: "h-full overflow-hidden border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_0_0_1px_oklch(0.7_0.18_60/0.3),0_8px_32px_oklch(0.7_0.18_60/0.15)]", children: [
    /* @__PURE__ */ jsxs("div", { className: "aspect-[16/9] w-full overflow-hidden bg-muted relative", children: [
      /* @__PURE__ */ jsx("img", { src: displayImage, alt: shop.name, className: "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105", loading: "lazy", referrerPolicy: "no-referrer", onError: () => {
        if (!imgFailed) setImgFailed(true);
      } }),
      /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" }),
      shop.is_open && /* @__PURE__ */ jsx("span", { className: "absolute top-2 left-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow", children: "Open now" }),
      shop.rating != null && /* @__PURE__ */ jsxs("span", { className: "absolute top-2 right-2 flex items-center gap-0.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur", children: [
        /* @__PURE__ */ jsx(Star, { className: "h-2.5 w-2.5 fill-amber-400 text-amber-400" }),
        Number(shop.rating).toFixed(1)
      ] })
    ] }),
    /* @__PURE__ */ jsxs(CardContent, { className: "space-y-2 p-4", children: [
      /* @__PURE__ */ jsx("div", { className: "flex items-start justify-between gap-2", children: /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("h3", { className: "truncate text-sm font-semibold", children: shop.name }),
          shop.is_verified && /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5 shrink-0 text-primary" })
        ] }),
        shop.cuisine && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: shop.cuisine })
      ] }) }),
      shop.address && /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-1 text-xs text-muted-foreground truncate", children: [
        /* @__PURE__ */ jsx(MapPin, { className: "h-3 w-3 shrink-0" }),
        " ",
        shop.address
      ] }),
      !shop.is_verified && /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-1 text-[10px] text-amber-500", children: [
        /* @__PURE__ */ jsx(AlertTriangle, { className: "h-3 w-3" }),
        " Unverified shop"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pt-1", children: [
        /* @__PURE__ */ jsx("span", { className: `text-xs font-medium ${shop.is_open ? "text-emerald-500" : "text-muted-foreground"}`, children: shop.is_open ? "● Open" : "○ Closed" }),
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-0.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100", children: [
          "Order ",
          /* @__PURE__ */ jsx(ChevronRight, { className: "h-3 w-3" })
        ] })
      ] })
    ] })
  ] }) });
}
function HomePage() {
  const [search, setSearch] = useState("");
  const [inputVal, setInputVal] = useState("");
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ["shops", "list", search],
    queryFn: () => shopsApi.list({
      page: 1,
      page_size: 24,
      search: search || void 0
    }),
    staleTime: 5 * 60 * 1e3,
    retry: 2
  });
  return /* @__PURE__ */ jsxs("div", { className: "relative min-h-screen overflow-x-clip bg-background", children: [
    /* @__PURE__ */ jsxs("div", { className: "pointer-events-none fixed inset-0 -z-10", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,170,65,0.12),transparent_28%),radial-gradient(circle_at_86%_24%,rgba(255,170,65,0.09),transparent_26%),radial-gradient(circle_at_50%_86%,rgba(77,116,255,0.08),transparent_34%)]" }),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 opacity-[0.07]", style: {
        backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "44px 44px"
      } })
    ] }),
    /* @__PURE__ */ jsx(PublicNav, {}),
    /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden border-b border-border/40", children: [
      /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-0 opacity-[0.08]", style: {
        backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "44px 44px"
      } }),
      /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -left-8 top-10 hidden h-64 w-64 rounded-full bg-primary/20 blur-3xl lg:block" }),
      /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute right-4 top-10 hidden h-72 w-72 rounded-full bg-primary/15 blur-3xl lg:block" }),
      /* @__PURE__ */ jsx("div", { className: "relative mx-auto max-w-[1380px] px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-20 lg:pb-24", children: /* @__PURE__ */ jsxs("div", { className: "grid items-center gap-8 lg:gap-12 xl:gap-16 lg:grid-cols-[240px_minmax(0,1fr)_320px]", children: [
        /* @__PURE__ */ jsx("div", { className: "hidden lg:block", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute left-2 top-0 grid h-28 w-28 place-items-center rounded-full text-7xl shadow-[0_0_50px_0_rgba(255,157,66,0.9)]", children: "🍔" }),
          /* @__PURE__ */ jsx("div", { className: "absolute left-16 top-36 grid h-32 w-32 place-items-center rounded-full text-8xl shadow-[0_0_60px_0_rgba(255,157,66,0.9)]", children: "🍜" }),
          /* @__PURE__ */ jsx("div", { className: "absolute left-2 top-[18.5rem] grid h-24 w-24 place-items-center rounded-full text-6xl shadow-[0_0_45px_0_rgba(255,157,66,0.9)]", children: "🍣" }),
          /* @__PURE__ */ jsx("div", { className: "absolute left-20 top-[24rem] grid h-20 w-20 place-items-center rounded-full text-5xl shadow-[0_0_42px_0_rgba(255,157,66,0.9)]", children: "🍥" }),
          /* @__PURE__ */ jsx("div", { className: "h-[30rem]" })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "mx-auto w-full max-w-3xl text-center lg:pt-4", children: [
          /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "mb-5 border-primary/40 bg-primary/10 px-4 py-1.5 text-primary", children: [
            /* @__PURE__ */ jsx(Star, { className: "mr-1.5 h-3 w-3 fill-current" }),
            " Pre order · Skip the queue · Earn rewards"
          ] }),
          /* @__PURE__ */ jsxs("h1", { className: "text-balance text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl", children: [
            "Your favourite food.",
            /* @__PURE__ */ jsx("br", {}),
            /* @__PURE__ */ jsx("span", { className: "bg-clip-text text-transparent", style: {
              backgroundImage: "var(--gradient-primary)"
            }, children: "Ready when you arrive." })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:text-lg", children: "Browse local shops, place your order ahead of time, and walk in to pick it up — no waiting, no stress." }),
          /* @__PURE__ */ jsxs("form", { className: "mx-auto mt-9 flex w-full max-w-2xl flex-col items-stretch gap-2 rounded-2xl border border-white/10 bg-card/70 p-2 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:flex-row sm:items-center sm:p-1.5", onSubmit: (e) => {
            e.preventDefault();
            setSearch(inputVal);
          }, children: [
            /* @__PURE__ */ jsx(Search, { className: "ml-3 hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" }),
            /* @__PURE__ */ jsx(Input, { value: inputVal, onChange: (e) => setInputVal(e.target.value), placeholder: "Search shops, cuisines, cities...", className: "h-12 border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0" }),
            /* @__PURE__ */ jsx(Button, { type: "submit", size: "lg", className: "h-11 shrink-0 px-7 font-semibold sm:w-auto", children: "Search" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground sm:text-xs", children: [
            /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5 text-primary" }),
              " Verified shops"
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Zap, { className: "h-3.5 w-3.5 text-primary" }),
              " Instant confirmation"
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Award, { className: "h-3.5 w-3.5 text-primary" }),
              " Loyalty rewards"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative hidden h-[530px] items-center justify-center lg:flex", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0 m-auto h-[420px] w-[260px] rounded-full bg-primary/25 blur-3xl" }),
          /* @__PURE__ */ jsxs("div", { className: "relative z-10 w-[250px] rotate-6 rounded-[2.2rem] border border-white/15 bg-card/50 p-3 shadow-[0_30px_80px_-30px_rgba(255,157,66,0.95)] backdrop-blur-xl", children: [
            /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-[1.7rem] border border-white/15 bg-black/40", children: /* @__PURE__ */ jsx("img", { src: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80", alt: "Local shops preview", className: "h-[450px] w-full object-cover", loading: "lazy", referrerPolicy: "no-referrer" }) }),
            /* @__PURE__ */ jsxs("div", { className: "absolute -left-24 top-12 rounded-xl border border-white/15 bg-card/80 px-3 py-2 shadow-xl backdrop-blur-lg", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wide text-primary", children: "Live activity:" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold", children: "Pre-ordered 10 mins ago" }),
              /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground", children: "Bangalore" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "absolute -left-20 bottom-28 rounded-xl border border-white/15 bg-card/80 px-3 py-2 shadow-xl backdrop-blur-lg", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wide text-primary", children: "5 ★" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold", children: "Best Coffee Ever!" }),
              /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground", children: "Tina R." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "absolute -right-12 bottom-12 rounded-xl border border-white/15 bg-card/80 px-3 py-2 shadow-xl backdrop-blur-lg", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wide text-primary", children: "Featured Restaurant:" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold", children: '"Spice Junction"' }),
              /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground", children: "Tandoori" })
            ] })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "border-b border-border/30 bg-muted/20 py-16", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-4 sm:px-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-10 text-center", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold tracking-tight sm:text-3xl", children: "How it works" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Four steps to a better food experience" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4", children: FEATURES.map((f) => /* @__PURE__ */ jsxs("div", { className: "group rounded-2xl border border-border/50 bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-card", children: [
        /* @__PURE__ */ jsx("div", { className: "mb-4 grid h-11 w-11 place-items-center rounded-xl text-white shadow", style: {
          background: "var(--gradient-primary)"
        }, children: /* @__PURE__ */ jsx(f.icon, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsx("h3", { className: "mb-2 font-semibold", children: f.title }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: f.desc })
      ] }, f.title)) })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { className: "mx-auto max-w-7xl px-4 py-12 sm:px-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-8 flex flex-wrap items-end justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold tracking-tight sm:text-3xl", children: search ? `Results for "${search}"` : "Discover shops" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: data == null ? "Loading…" : `${data.length} ${data.length === 1 ? "shop" : "shops"} ready to take your order` })
        ] }),
        search && /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: () => {
          setSearch("");
          setInputVal("");
        }, children: "Clear search" })
      ] }),
      isLoading ? /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: Array.from({
        length: 8
      }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-64 rounded-2xl" }, i)) }) : isError ? /* @__PURE__ */ jsx(Card, { className: "border-amber-500/30", children: /* @__PURE__ */ jsxs(CardContent, { className: "py-16 text-center", children: [
        /* @__PURE__ */ jsx(AlertTriangle, { className: "mx-auto mb-4 h-10 w-10 text-amber-500" }),
        /* @__PURE__ */ jsx("p", { className: "font-semibold", children: "Unable to load shops right now" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: error instanceof Error ? error.message : "Please try again in a moment." }),
        /* @__PURE__ */ jsx(Button, { className: "mt-5", onClick: () => refetch(), disabled: isFetching, children: isFetching ? "Retrying..." : "Retry" })
      ] }) }) : !data || data.length === 0 ? /* @__PURE__ */ jsx(Card, { className: "border-dashed", children: /* @__PURE__ */ jsxs(CardContent, { className: "py-20 text-center", children: [
        /* @__PURE__ */ jsx(Search, { className: "mx-auto mb-4 h-12 w-12 text-muted-foreground/40" }),
        /* @__PURE__ */ jsx("p", { className: "font-medium", children: "No shops found" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: search ? "Try a different search term." : "Check back soon — more shops are joining." })
      ] }) }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", children: data.map((shop) => /* @__PURE__ */ jsx(ShopCard, { shop }, shop.id)) })
    ] }),
    /* @__PURE__ */ jsx("footer", { className: "border-t border-border/40 py-8 text-center text-xs text-muted-foreground", children: "© 2025 PreOrder. All rights reserved. · Built with ♥ for food lovers." })
  ] });
}
export {
  HomePage as component
};
