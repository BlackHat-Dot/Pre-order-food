import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Search, Star, MapPin, ChevronRight, ShieldCheck, AlertTriangle,
  Zap, Clock, TrendingUp, Award,
} from "lucide-react";
import { shopsApi } from "@/lib/api";
import { PublicNav } from "@/components/app/PublicNav";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { ShopOut } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "PreOrder — Order ahead, skip the line" },
      { name: "description", content: "Browse shops, pre-order your favorites and pick up without waiting." },
    ],
  }),
});

const FEATURES = [
  {
    icon: Zap,
    title: "Pre-order in seconds",
    desc: "Browse menus, customize your order, and lock it in — all before you even leave home.",
  },
  {
    icon: Clock,
    title: "Zero wait time",
    desc: "Your order is ready the moment you arrive. Walk in, pick up, walk out.",
  },
  {
    icon: Award,
    title: "Earn loyalty points",
    desc: "Every order earns you points you can redeem for discounts at your favourite shops.",
  },
  {
    icon: TrendingUp,
    title: "Track in real-time",
    desc: "Follow your order from confirmation to ready — with live status updates.",
  },
];

const FALLBACK_SHOP_IMAGES = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
];

function getShopFallbackImage(shop: ShopOut) {
  const key = `${shop.id}-${shop.name}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_SHOP_IMAGES[Math.abs(hash) % FALLBACK_SHOP_IMAGES.length];
}

function ShopCard({ shop }: { shop: ShopOut }) {
  const [imgFailed, setImgFailed] = useState(false);
  const fallbackImage = getShopFallbackImage(shop);
  const displayImage = !imgFailed && shop.image_url ? shop.image_url : fallbackImage;

  return (
    <Link to="/shops/$shopId" params={{ shopId: shop.id }} className="group block">
      <Card className="h-full overflow-hidden border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_0_0_1px_oklch(0.7_0.18_60/0.3),0_8px_32px_oklch(0.7_0.18_60/0.15)]">
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted relative">
          <img
            src={displayImage}
            alt={shop.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => {
              if (!imgFailed) setImgFailed(true);
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
          {shop.is_open && (
            <span className="absolute top-2 left-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              Open now
            </span>
          )}
          {shop.rating != null && (
            <span className="absolute top-2 right-2 flex items-center gap-0.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {Number(shop.rating).toFixed(1)}
            </span>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-semibold">{shop.name}</h3>
                {shop.is_verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </div>
              {shop.cuisine && <p className="text-xs text-muted-foreground">{shop.cuisine}</p>}
            </div>
          </div>
          {shop.address && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {shop.address}
            </p>
          )}
          {!shop.is_verified && (
            <p className="flex items-center gap-1 text-[10px] text-amber-500">
              <AlertTriangle className="h-3 w-3" /> Unverified shop
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className={`text-xs font-medium ${shop.is_open ? "text-emerald-500" : "text-muted-foreground"}`}>
              {shop.is_open ? "● Open" : "○ Closed"}
            </span>
            <span className="flex items-center gap-0.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Order <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function HomePage() {
  const [search, setSearch] = useState("");
  const [inputVal, setInputVal] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["shops", "list", search],
    queryFn: () => shopsApi.list({ page: 1, page_size: 24, search: search || undefined }),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,170,65,0.12),transparent_28%),radial-gradient(circle_at_86%_24%,rgba(255,170,65,0.09),transparent_26%),radial-gradient(circle_at_50%_86%,rgba(77,116,255,0.08),transparent_34%)]" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      </div>
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
        <div className="pointer-events-none absolute -left-8 top-10 hidden h-64 w-64 rounded-full bg-primary/20 blur-3xl lg:block" />
        <div className="pointer-events-none absolute right-4 top-10 hidden h-72 w-72 rounded-full bg-primary/15 blur-3xl lg:block" />

        <div className="relative mx-auto max-w-[1380px] px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-20 lg:pb-24">
          <div className="grid items-center gap-8 lg:gap-12 xl:gap-16 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute left-2 top-0 grid h-28 w-28 place-items-center rounded-full text-7xl shadow-[0_0_50px_0_rgba(255,157,66,0.9)]">🍔</div>
                <div className="absolute left-16 top-36 grid h-32 w-32 place-items-center rounded-full text-8xl shadow-[0_0_60px_0_rgba(255,157,66,0.9)]">🍜</div>
                <div className="absolute left-2 top-[18.5rem] grid h-24 w-24 place-items-center rounded-full text-6xl shadow-[0_0_45px_0_rgba(255,157,66,0.9)]">🍣</div>
                <div className="absolute left-20 top-[24rem] grid h-20 w-20 place-items-center rounded-full text-5xl shadow-[0_0_42px_0_rgba(255,157,66,0.9)]">🍥</div>
                <div className="h-[30rem]" />
              </div>
            </div>

            <div className="mx-auto w-full max-w-3xl text-center lg:pt-4">
              <Badge variant="outline" className="mb-5 border-primary/40 bg-primary/10 px-4 py-1.5 text-primary">
                <Star className="mr-1.5 h-3 w-3 fill-current" /> Pre order · Skip the queue · Earn rewards
              </Badge>

              <h1 className="text-balance text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                Your favourite food.
                <br />
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
                  Ready when you arrive.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:text-lg">
                Browse local shops, place your order ahead of time, and walk in to pick it up — no waiting, no stress.
              </p>

              <form
                className="mx-auto mt-9 flex w-full max-w-2xl flex-col items-stretch gap-2 rounded-2xl border border-white/10 bg-card/70 p-2 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:flex-row sm:items-center sm:p-1.5"
                onSubmit={(e) => { e.preventDefault(); setSearch(inputVal); }}
              >
                <Search className="ml-3 hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
                <Input
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Search shops, cuisines, cities..."
                  className="h-12 border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0"
                />
                <Button type="submit" size="lg" className="h-11 shrink-0 px-7 font-semibold sm:w-auto">
                  Search
                </Button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground sm:text-xs">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified shops</span>
                <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Instant confirmation</span>
                <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-primary" /> Loyalty rewards</span>
              </div>
            </div>

            <div className="relative hidden h-[530px] items-center justify-center lg:flex">
              <div className="absolute inset-0 m-auto h-[420px] w-[260px] rounded-full bg-primary/25 blur-3xl" />
              <div className="relative z-10 w-[250px] rotate-6 rounded-[2.2rem] border border-white/15 bg-card/50 p-3 shadow-[0_30px_80px_-30px_rgba(255,157,66,0.95)] backdrop-blur-xl">
                <div className="overflow-hidden rounded-[1.7rem] border border-white/15 bg-black/40">
                  <img
                    src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80"
                    alt="Local shops preview"
                    className="h-[450px] w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -left-24 top-12 rounded-xl border border-white/15 bg-card/80 px-3 py-2 shadow-xl backdrop-blur-lg">
                  <p className="text-[10px] uppercase tracking-wide text-primary">Live activity:</p>
                  <p className="text-xs font-semibold">Pre-ordered 10 mins ago</p>
                  <p className="text-[10px] text-muted-foreground">Bangalore</p>
                </div>
                <div className="absolute -left-20 bottom-28 rounded-xl border border-white/15 bg-card/80 px-3 py-2 shadow-xl backdrop-blur-lg">
                  <p className="text-[10px] uppercase tracking-wide text-primary">5 ★</p>
                  <p className="text-xs font-semibold">Best Coffee Ever!</p>
                  <p className="text-[10px] text-muted-foreground">Tina R.</p>
                </div>
                <div className="absolute -right-12 bottom-12 rounded-xl border border-white/15 bg-card/80 px-3 py-2 shadow-xl backdrop-blur-lg">
                  <p className="text-[10px] uppercase tracking-wide text-primary">Featured Restaurant:</p>
                  <p className="text-xs font-semibold">"Spice Junction"</p>
                  <p className="text-[10px] text-muted-foreground">Tandoori</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border/30 bg-muted/20 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mt-2 text-sm text-muted-foreground">Four steps to a better food experience</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border/50 bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-card">
                <div
                  className="mb-4 grid h-11 w-11 place-items-center rounded-xl text-white shadow"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop listing */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {search ? `Results for "${search}"` : "Discover shops"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data == null ? "Loading…" : `${data.length} ${data.length === 1 ? "shop" : "shops"} ready to take your order`}
            </p>
          </div>
          {search && (
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setInputVal(""); }}>
              Clear search
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <Card className="border-amber-500/30">
            <CardContent className="py-16 text-center">
              <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-500" />
              <p className="font-semibold">Unable to load shops right now</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Please try again in a moment."}
              </p>
              <Button className="mt-5" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? "Retrying..." : "Retry"}
              </Button>
            </CardContent>
          </Card>
        ) : !data || data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-20 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="font-medium">No shops found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search ? "Try a different search term." : "Check back soon — more shops are joining."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © 2025 PreOrder. All rights reserved. · Built with ♥ for food lovers.
      </footer>
    </div>
  );
}
