import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Search, Star, MapPin, Phone, ChevronLeft, ChevronRight, Store } from "lucide-react";
import { adminApi, ApiError, type AdminShopOut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/shops")({ component: AdminShops });

function ShopCard({ s, onMutated }: { s: AdminShopOut; onMutated: () => void }) {
  const ratingAvg = typeof s.rating_avg === "number" ? s.rating_avg : 0;
  const ratingCount = typeof s.rating_count === "number" ? s.rating_count : 0;

  const verify = useMutation({
    mutationFn: (v: boolean) => adminApi.verifyShop(s.id, { is_verified: v }),
    onSuccess: () => { toast.success(s.is_verified ? "Shop unverified" : "Shop verified"); onMutated(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });
  const setActive = useMutation({
    mutationFn: (v: boolean) => adminApi.setShopActive(s.id, { is_active: v }),
    onSuccess: () => { toast.success("Updated"); onMutated(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <Card className="border-border/50 hover:border-border transition-colors">
      <CardContent className="p-0">
        <div className="flex flex-wrap gap-4 p-4">
          {/* Icon */}
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted">
            <Store className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{s.name}</p>
              {s.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
              <Badge variant="outline" className="text-xs">{s.category}</Badge>
              <span className={`text-xs font-medium ${s.is_open ? "text-emerald-500" : "text-muted-foreground"}`}>
                {s.is_open ? "● Open" : "○ Closed"}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city}, {s.state}</span>
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {ratingAvg.toFixed(1)} ({ratingCount})
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Owner: <span className="font-medium text-foreground">{s.owner_name}</span>
              {s.owner_email && <span className="ml-1">· {s.owner_email}</span>}
            </p>
          </div>

          {/* Controls */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={s.is_verified ? "outline" : "default"}
                className="h-7 px-3 text-xs"
                onClick={() => verify.mutate(!s.is_verified)}
                disabled={verify.isPending}
              >
                {s.is_verified ? "Unverify" : "Verify"}
              </Button>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{s.is_active ? "Active" : "Disabled"}</span>
                <Switch
                  checked={s.is_active}
                  onCheckedChange={(v) => setActive.mutate(v)}
                  disabled={setActive.isPending}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminShops() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "shops", page, search, verifiedFilter, activeFilter],
    queryFn: () => adminApi.listShops({
      page,
      page_size: 20,
      search: search || undefined,
      verified: verifiedFilter === "all" ? undefined : verifiedFilter === "yes",
      active: activeFilter === "all" ? undefined : activeFilter === "yes",
    }),
  });

  const { data: counts } = useQuery({
    queryKey: ["admin", "shops", "count"],
    queryFn: adminApi.countShops,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "shops"] });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shops</h1>
        <p className="text-sm text-muted-foreground">
          {counts ? `${counts.total} total · ${counts.verified} verified · ${counts.open_now} open now` : "Manage platform shops"}
        </p>
      </div>

      {/* Count cards */}
      {counts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: counts.total },
            { label: "Verified", value: counts.verified },
            { label: "Active", value: counts.active },
            { label: "Open now", value: counts.open_now },
          ].map(({ label, value }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div>
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form
          className="relative flex-1 min-w-48"
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search shop, city, category…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        <Select value={verifiedFilter} onValueChange={(v) => { setVerifiedFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Verified" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All shops</SelectItem>
            <SelectItem value="yes">Verified only</SelectItem>
            <SelectItem value="no">Unverified</SelectItem>
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="yes">Active</SelectItem>
            <SelectItem value="no">Disabled</SelectItem>
          </SelectContent>
        </Select>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((s) => (
            <ShopCard key={s.id} s={s} onMutated={invalidate} />
          ))}
          {data?.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">No shops found.</CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 py-2 text-sm font-medium">Page {page}</span>
        <Button variant="outline" size="sm" disabled={!data || data.length < 20} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
