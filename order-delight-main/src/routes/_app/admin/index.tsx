import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, Store, ShoppingBag, TrendingUp, DollarSign, Clock,
  ShieldCheck, AlertCircle, ArrowUpRight, ArrowDownRight, Star,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/")({ component: AdminOverview });

const CHART_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e", "#06b6d4"];

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  confirmed: "#3b82f6",
  preparing: "#8b5cf6",
  ready: "#10b981",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

function StatCard({
  label, value, sub, icon: Icon, trend, color = "primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Users;
  trend?: { value: number; positive: boolean };
  color?: string;
}) {
  return (
    <Card className="relative overflow-hidden border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: "oklch(0.25 0.04 30)" }}
          >
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trend.positive ? (
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            )}
            <span className={trend.positive ? "text-emerald-500" : "text-red-500"}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5"
        style={{ background: "var(--gradient-primary)" }}
      />
    </Card>
  );
}

function AdminOverview() {
  const [trendDays, setTrendDays] = useState("30");

  const { data: overview, isLoading: ovLoading } = useQuery({
    queryKey: ["admin", "analytics", "overview"],
    queryFn: adminApi.analytics,
    refetchInterval: 60_000,
  });
  const { data: trends, isLoading: trLoading } = useQuery({
    queryKey: ["admin", "analytics", "trends", trendDays],
    queryFn: () => adminApi.trends(Number(trendDays)),
    refetchInterval: 60_000,
  });
  const { data: topShops } = useQuery({
    queryKey: ["admin", "analytics", "top-shops"],
    queryFn: () => adminApi.topShops(8),
  });
  const { data: recentOrders } = useQuery({
    queryKey: ["admin", "analytics", "recent-orders"],
    queryFn: () => adminApi.recentOrders(8),
  });
  const { data: catRevenue } = useQuery({
    queryKey: ["admin", "analytics", "category-revenue"],
    queryFn: adminApi.revenueByCategory,
  });

  if (ovLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const ov = overview;
  const pieData = ov
    ? [
        { name: "Customers", value: ov.users - ((ov as any).shop_owners ?? 0) },
        { name: "Verified Shops", value: ov.verified_shops },
        { name: "Unverified Shops", value: ov.shops - ov.verified_shops },
      ]
    : [];

  const statusPieData = trends
    ? Object.entries(trends.order_by_status).map(([k, v]) => ({ name: k, value: v }))
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground mt-1">Real-time platform analytics and controls</p>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(ov?.total_revenue ?? 0)} icon={DollarSign} sub="All time" />
        <StatCard label="This Month" value={formatCurrency(ov?.month_revenue ?? 0)} icon={TrendingUp} sub="Non-cancelled orders" />
        <StatCard label="Today" value={formatCurrency(ov?.today_revenue ?? 0)} icon={Clock} sub={`${ov?.today_orders ?? 0} orders today`} />
        <StatCard label="This Week" value={formatCurrency(ov?.week_revenue ?? 0)} icon={ArrowUpRight} sub="Current week" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value={ov?.users ?? 0} icon={Users} sub={`${ov?.active_users ?? 0} active`} />
        <StatCard label="Total Shops" value={ov?.shops ?? 0} icon={Store} sub={`${ov?.verified_shops ?? 0} verified`} />
        <StatCard label="Total Orders" value={ov?.orders ?? 0} icon={ShoppingBag} sub={`${ov?.pending_orders ?? 0} pending`} />
        <StatCard label="Cancelled" value={ov?.cancelled_orders ?? 0} icon={AlertCircle} sub="Platform-wide" />
      </div>

      {/* Revenue + Signups Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-0">
            <div>
              <CardTitle className="text-base">Revenue Trend</CardTitle>
              <CardDescription>Daily revenue over selected period</CardDescription>
            </div>
            <Tabs value={trendDays} onValueChange={setTrendDays}>
              <TabsList className="h-8">
                <TabsTrigger value="7" className="h-7 px-3 text-xs">7d</TabsTrigger>
                <TabsTrigger value="30" className="h-7 px-3 text-xs">30d</TabsTrigger>
                <TabsTrigger value="90" className="h-7 px-3 text-xs">90d</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-4">
            {trLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trends?.daily_orders ?? []}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-border/60">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Order Status Mix</CardTitle>
            <CardDescription>Last {trendDays} days</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {statusPieData.length === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                    {statusPieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#888"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  />
                  <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders & Signups */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Daily Orders</CardTitle>
            <CardDescription>Order volume trend</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {trLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={trends?.daily_orders ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  />
                  <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">New Signups</CardTitle>
            <CardDescription>User growth trend</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {trLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trends?.daily_signups ?? []}>
                  <defs>
                    <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#888" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="signups" stroke="#3b82f6" strokeWidth={2} fill="url(#signupGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Category */}
      {catRevenue && catRevenue.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Revenue by Category</CardTitle>
            <CardDescription>Platform-wide breakdown by cuisine</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={catRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#888" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 10, fill: "#888" }} width={80} />
                <Tooltip
                  contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {catRevenue.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Shops + Recent Orders */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Shops by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(topShops ?? []).slice(0, 6).map((s, i) => (
                <div key={s.shop_id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/40 transition-colors">
                  <span className="w-5 text-center text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{s.shop_name}</p>
                      {s.is_verified && <ShieldCheck className="h-3 w-3 shrink-0 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{s.category} · {s.city}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-primary">{formatCurrency(s.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{s.order_count} orders</p>
                  </div>
                </div>
              ))}
              {!topShops || topShops.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(recentOrders ?? []).map((o) => (
                <div key={o.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{o.customer_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.shop_name}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 capitalize text-xs"
                    style={{ borderColor: STATUS_COLORS[o.status] ?? "#888", color: STATUS_COLORS[o.status] ?? "#888" }}
                  >
                    {o.status}
                  </Badge>
                  <p className="shrink-0 text-sm font-semibold">{formatCurrency(o.total)}</p>
                </div>
              ))}
              {!recentOrders || recentOrders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No orders yet</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
