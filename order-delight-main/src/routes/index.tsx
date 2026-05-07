import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Search, Star, MapPin, ChevronRight, ShieldCheck, AlertTriangle,
  Zap, Clock, TrendingUp, Award, ArrowRight,
} from "lucide-react";
import { shopsApi } from "@/lib/api";
import { PublicNav } from "@/components/app/PublicNav";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
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

function ShopCard({ shop }: { shop: ShopOut }) {
  return (
    <Link to="/shops/$shopId" params={{ shopId: shop.id }} className="group block">
      <Card className="h-full overflow-hidden border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_0_0_1px_oklch(0.7_0.18_60/0.3),0_8px_32px_oklch(0.7_0.18_60/0.15)]">
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted relative">
          {shop.image_url ? (
            <img
              src={shop.image_url}
              alt={shop.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center" style={{ background: "var(--gradient-primary)", opacity: 0.15 }} />
          )}
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

  const { data, isLoading } = useQuery({
    queryKey: ["shops", "list", search],
    queryFn: () => shopsApi.list({ page: 1, page_size: 24, search: search || undefined }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        {/* Background layers */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -20%, oklch(0.55 0.18 60 / 0.18), transparent)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 80% 80%, oklch(0.45 0.15 270 / 0.08), transparent)" }} />
        <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 border-primary/40 bg-primary/8 px-4 py-1.5 text-primary">
              <Star className="mr-1.5 h-3 w-3 fill-current" /> Pre-order · Skip the queue · Earn rewards
            </Badge>

            <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
              Your favourite food.{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                Ready when you arrive.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg leading-relaxed">
              Browse local shops, place your order ahead of time, and walk in to pick it up — no waiting, no stress.
            </p>

            {/* Search */}
            <form
              className="mx-auto mt-10 flex max-w-2xl items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur"
              onSubmit={(e) => { e.preventDefault(); setSearch(inputVal); }}
            >
              <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" />
              <Input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Search shops, cuisines, cities…"
                className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
              />
              <Button type="submit" size="lg" className="h-11 shrink-0 px-6 font-semibold">
                Search
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified shops</span>
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Instant confirmation</span>
              <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-primary" /> Loyalty rewards</span>
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

      {/* CTA */}
      <section className="border-t border-border/30 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div
            className="relative overflow-hidden rounded-3xl px-8 py-14"
            style={{ background: "var(--gradient-primary)" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
            <h2 className="relative text-3xl font-black text-white sm:text-4xl">
              Ready to skip the line?
            </h2>
            <p className="relative mt-3 text-base text-white/80">
              Join thousands of customers who pre-order and never wait.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/register">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold px-8">
                  Get started free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © 2025 PreOrder. All rights reserved. · Built with ♥ for food lovers.
      </footer>
    </div>
  );
}
