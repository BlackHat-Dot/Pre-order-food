import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Star, MapPin, ChevronRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { shopsApi } from "@/lib/api";
import { PublicNav } from "@/components/app/PublicNav";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "PreOrder — Order ahead, skip the line" },
      {
        name: "description",
        content: "Browse shops, pre-order your favorites and pick up without waiting.",
      },
    ],
  }),
});

function HomePage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["shops", "list", search],
    queryFn: () => shopsApi.list({ page: 1, page_size: 24, search: search || undefined }),
  });

  return (
    <div className="min-h-screen">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: "var(--gradient-primary)" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.78_0.16_70/0.25),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
            <Star className="mr-1 h-3 w-3 fill-current" /> Pre-order, skip the queue
          </Badge>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Your favorite food.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              Ready when you are.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Browse local shops, place your order ahead and pick it up without waiting.
            Earn loyalty points on every order.
          </p>

          <div className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-border bg-card/80 p-1.5 shadow-[var(--shadow-elegant)] backdrop-blur">
            <Search className="ml-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shops, cuisines…"
              className="h-11 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            />
            <Button size="sm" className="h-10 px-5">
              Search
            </Button>
          </div>
        </div>
      </section>

      {/* Shops */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Discover shops</h2>
            <p className="text-sm text-muted-foreground">
              {data?.length ?? 0} {data?.length === 1 ? "shop" : "shops"} ready to take your order
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              No shops match your search.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((shop) => (
              <Link
                key={shop.id}
                to="/shops/$shopId"
                params={{ shopId: shop.id }}
                className="group"
              >
                <Card className="h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]">
                  <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                    {shop.image_url ? (
                      <img
                        src={shop.image_url}
                        alt={shop.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = "none";
                          const p = el.parentElement;
                          if (p) p.style.background = "var(--gradient-surface)";
                        }}
                      />
                    ) : null}
                  </div>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-semibold">{shop.name}</h3>
                          {shop.is_verified && (
                            <ShieldCheck className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        {shop.cuisine && (
                          <p className="text-xs text-muted-foreground">{shop.cuisine}</p>
                        )}
                      </div>
                      {shop.rating != null && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3 fill-current text-primary" />
                          {Number(shop.rating).toFixed(1)}
                        </Badge>
                      )}
                    </div>
                    {shop.address && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {shop.address}
                      </p>
                    )}
                    {!shop.is_verified && (
                      <p className="flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Unverified shop - order at your own risk
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span
                        className={
                          shop.is_open
                            ? "font-medium text-success"
                            : "font-medium text-muted-foreground"
                        }
                      >
                        {shop.is_open ? "● Open now" : "○ Closed"}
                      </span>
                      <span className="flex items-center gap-1 text-primary group-hover:underline">
                        Order <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PreOrder. All rights reserved.
      </footer>
    </div>
  );
}
