import { jsxs, jsx } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, PieChart, Pie, Cell, Legend, BarChart, Bar } from "recharts";
import { DollarSign, ShoppingBag, Clock, ArrowUpRight, Users, Store, AlertCircle, Star, ShieldCheck, ArrowDownRight } from "lucide-react";
import { t as adminApi } from "./router-DQr6eapq.js";
import { C as Card, a as CardHeader, b as CardTitle, c as CardDescription, d as CardContent } from "./card-BjRrBkxP.js";
import { T as Tabs, a as TabsList, b as TabsTrigger } from "./tabs-CoISGPZI.js";
import { B as Badge } from "./badge-sM2V1NmW.js";
import { S as Skeleton } from "./skeleton-B35717OU.js";
import { f as formatCurrency, b as formatDate } from "./format-BBidFSeC.js";
import "@tanstack/react-router";
import "sonner";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-tabs";
const CHART_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e", "#06b6d4"];
const STATUS_COLORS = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  confirmed: "#3b82f6",
  preparing: "#8b5cf6",
  ready: "#10b981",
  completed: "#22c55e",
  cancelled: "#ef4444"
};
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  color = "primary"
}) {
  return /* @__PURE__ */ jsxs(Card, { className: "relative overflow-hidden border-border/60", children: [
    /* @__PURE__ */ jsxs(CardContent, { className: "p-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-medium text-muted-foreground uppercase tracking-wider", children: label }),
          /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold tracking-tight", children: value }),
          sub && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: sub })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-xl", style: {
          background: "oklch(0.25 0.04 30)"
        }, children: /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5 text-primary" }) })
      ] }),
      trend && /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center gap-1 text-xs", children: [
        trend.positive ? /* @__PURE__ */ jsx(ArrowUpRight, { className: "h-3 w-3 text-emerald-500" }) : /* @__PURE__ */ jsx(ArrowDownRight, { className: "h-3 w-3 text-red-500" }),
        /* @__PURE__ */ jsxs("span", { className: trend.positive ? "text-emerald-500" : "text-red-500", children: [
          Math.abs(trend.value),
          "%"
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "vs last period" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 h-0.5", style: {
      background: "var(--gradient-primary)"
    } })
  ] });
}
function AdminOverview() {
  const [trendDays, setTrendDays] = useState("30");
  const {
    data: trends,
    isLoading: trLoading
  } = useQuery({
    queryKey: ["admin", "analytics", "trends", trendDays],
    queryFn: () => adminApi.trends(Number(trendDays)),
    refetchInterval: 6e4
  });
  const {
    data: topShops
  } = useQuery({
    queryKey: ["admin", "analytics", "top-shops"],
    queryFn: () => adminApi.topShops(8)
  });
  const {
    data: recentOrders
  } = useQuery({
    queryKey: ["admin", "analytics", "recent-orders"],
    queryFn: () => adminApi.recentOrders(8)
  });
  const {
    data: catRevenue
  } = useQuery({
    queryKey: ["admin", "analytics", "category-revenue"],
    queryFn: () => adminApi.revenueByCategory()
  });
  if (trLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl space-y-6", children: [
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-4 md:grid-cols-4", children: Array.from({
        length: 8
      }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-28 rounded-xl" }, i)) }),
      /* @__PURE__ */ jsx(Skeleton, { className: "h-72 rounded-xl" })
    ] });
  }
  const dailyOrders = trends?.daily_orders ?? [];
  const dailySignups = trends?.daily_signups ?? [];
  const totalRevenue = dailyOrders.reduce((sum, day) => sum + day.revenue, 0);
  const totalOrders = dailyOrders.reduce((sum, day) => sum + day.orders, 0);
  const latestOrderDay = dailyOrders[dailyOrders.length - 1];
  const latestSignupDay = dailySignups[dailySignups.length - 1];
  const last7Revenue = dailyOrders.slice(-7).reduce((sum, day) => sum + day.revenue, 0);
  const totalSignups = dailySignups.reduce((sum, item) => sum + item.signups, 0);
  const cancelledOrders = trends?.order_by_status?.cancelled ?? 0;
  const statusCount = Object.keys(trends?.order_by_status ?? {}).length;
  const statusPieData = trends ? Object.entries(trends.order_by_status).map(([k, v]) => ({
    name: k,
    value: v
  })) : [];
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold tracking-tight", children: "Command Center" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-1", children: "Real-time platform analytics and controls" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 md:grid-cols-4", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, sub: `Last ${trendDays} days` }),
      /* @__PURE__ */ jsx(StatCard, { label: "Total Orders", value: totalOrders, icon: ShoppingBag, sub: `Last ${trendDays} days` }),
      /* @__PURE__ */ jsx(StatCard, { label: "Latest Day Revenue", value: formatCurrency(latestOrderDay?.revenue ?? 0), icon: Clock, sub: `${latestOrderDay?.orders ?? 0} orders on ${latestOrderDay?.date ?? "-"}` }),
      /* @__PURE__ */ jsx(StatCard, { label: "Last 7 Days", value: formatCurrency(last7Revenue), icon: ArrowUpRight, sub: "Recent week" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 md:grid-cols-4", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "New Signups", value: totalSignups, icon: Users, sub: `Last ${trendDays} days` }),
      /* @__PURE__ */ jsx(StatCard, { label: "Status Categories", value: statusCount, icon: Store, sub: "Order status breakdown" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Cancelled Orders", value: cancelledOrders, icon: AlertCircle, sub: "From status mix" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Latest Signups", value: latestSignupDay?.signups ?? 0, icon: Star, sub: latestSignupDay ? latestSignupDay.date : "No data" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-3", children: [
      /* @__PURE__ */ jsxs(Card, { className: "lg:col-span-2 border-border/60", children: [
        /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between pb-0", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Revenue Trend" }),
            /* @__PURE__ */ jsx(CardDescription, { children: "Daily revenue over selected period" })
          ] }),
          /* @__PURE__ */ jsx(Tabs, { value: trendDays, onValueChange: setTrendDays, children: /* @__PURE__ */ jsxs(TabsList, { className: "h-8", children: [
            /* @__PURE__ */ jsx(TabsTrigger, { value: "7", className: "h-7 px-3 text-xs", children: "7d" }),
            /* @__PURE__ */ jsx(TabsTrigger, { value: "30", className: "h-7 px-3 text-xs", children: "30d" }),
            /* @__PURE__ */ jsx(TabsTrigger, { value: "90", className: "h-7 px-3 text-xs", children: "90d" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { className: "pt-4", children: trLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-56 w-full" }) : /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 220, children: /* @__PURE__ */ jsxs(AreaChart, { data: trends?.daily_orders ?? [], children: [
          /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "revGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [
            /* @__PURE__ */ jsx("stop", { offset: "5%", stopColor: "#f97316", stopOpacity: 0.3 }),
            /* @__PURE__ */ jsx("stop", { offset: "95%", stopColor: "#f97316", stopOpacity: 0 })
          ] }) }),
          /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.05)" }),
          /* @__PURE__ */ jsx(XAxis, { dataKey: "date", tick: {
            fontSize: 11,
            fill: "#888"
          }, tickFormatter: (v) => v.slice(5) }),
          /* @__PURE__ */ jsx(YAxis, { tick: {
            fontSize: 11,
            fill: "#888"
          }, tickFormatter: (v) => `₹${(v / 1e3).toFixed(0)}k` }),
          /* @__PURE__ */ jsx(Tooltip, { contentStyle: {
            background: "#1a1a2e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8
          }, formatter: (v) => [formatCurrency(v), "Revenue"] }),
          /* @__PURE__ */ jsx(Area, { type: "monotone", dataKey: "revenue", stroke: "#f97316", strokeWidth: 2, fill: "url(#revGrad)" })
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { className: "border-border/60", children: [
        /* @__PURE__ */ jsxs(CardHeader, { className: "pb-0", children: [
          /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Order Status Mix" }),
          /* @__PURE__ */ jsxs(CardDescription, { children: [
            "Last ",
            trendDays,
            " days"
          ] })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { className: "pt-4", children: statusPieData.length === 0 ? /* @__PURE__ */ jsx("div", { className: "flex h-52 items-center justify-center text-sm text-muted-foreground", children: "No data yet" }) : /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 180, children: /* @__PURE__ */ jsxs(PieChart, { children: [
          /* @__PURE__ */ jsx(Pie, { data: statusPieData, dataKey: "value", nameKey: "name", cx: "50%", cy: "50%", outerRadius: 70, label: false, children: statusPieData.map((entry) => /* @__PURE__ */ jsx(Cell, { fill: STATUS_COLORS[entry.name] ?? "#888" }, entry.name)) }),
          /* @__PURE__ */ jsx(Tooltip, { contentStyle: {
            background: "#1a1a2e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8
          } }),
          /* @__PURE__ */ jsx(Legend, { formatter: (v) => /* @__PURE__ */ jsx("span", { className: "text-xs capitalize", children: v }) })
        ] }) }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsxs(Card, { className: "border-border/60", children: [
        /* @__PURE__ */ jsxs(CardHeader, { className: "pb-0", children: [
          /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Daily Orders" }),
          /* @__PURE__ */ jsx(CardDescription, { children: "Order volume trend" })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { className: "pt-4", children: trLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-48 w-full" }) : /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 180, children: /* @__PURE__ */ jsxs(BarChart, { data: trends?.daily_orders ?? [], children: [
          /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.05)" }),
          /* @__PURE__ */ jsx(XAxis, { dataKey: "date", tick: {
            fontSize: 10,
            fill: "#888"
          }, tickFormatter: (v) => v.slice(5) }),
          /* @__PURE__ */ jsx(YAxis, { tick: {
            fontSize: 10,
            fill: "#888"
          } }),
          /* @__PURE__ */ jsx(Tooltip, { contentStyle: {
            background: "#1a1a2e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8
          } }),
          /* @__PURE__ */ jsx(Bar, { dataKey: "orders", fill: "#f97316", radius: [4, 4, 0, 0] })
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { className: "border-border/60", children: [
        /* @__PURE__ */ jsxs(CardHeader, { className: "pb-0", children: [
          /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "New Signups" }),
          /* @__PURE__ */ jsx(CardDescription, { children: "User growth trend" })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { className: "pt-4", children: trLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-48 w-full" }) : /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 180, children: /* @__PURE__ */ jsxs(AreaChart, { data: trends?.daily_signups ?? [], children: [
          /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "signupGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [
            /* @__PURE__ */ jsx("stop", { offset: "5%", stopColor: "#3b82f6", stopOpacity: 0.3 }),
            /* @__PURE__ */ jsx("stop", { offset: "95%", stopColor: "#3b82f6", stopOpacity: 0 })
          ] }) }),
          /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.05)" }),
          /* @__PURE__ */ jsx(XAxis, { dataKey: "date", tick: {
            fontSize: 10,
            fill: "#888"
          }, tickFormatter: (v) => v.slice(5) }),
          /* @__PURE__ */ jsx(YAxis, { tick: {
            fontSize: 10,
            fill: "#888"
          } }),
          /* @__PURE__ */ jsx(Tooltip, { contentStyle: {
            background: "#1a1a2e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8
          } }),
          /* @__PURE__ */ jsx(Area, { type: "monotone", dataKey: "signups", stroke: "#3b82f6", strokeWidth: 2, fill: "url(#signupGrad)" })
        ] }) }) })
      ] })
    ] }),
    catRevenue && catRevenue.length > 0 && /* @__PURE__ */ jsxs(Card, { className: "border-border/60", children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "pb-0", children: [
        /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Revenue by Category" }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Platform-wide breakdown by cuisine" })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { className: "pt-4", children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 200, children: /* @__PURE__ */ jsxs(BarChart, { data: catRevenue, layout: "vertical", children: [
        /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.05)", horizontal: false }),
        /* @__PURE__ */ jsx(XAxis, { type: "number", tick: {
          fontSize: 10,
          fill: "#888"
        }, tickFormatter: (v) => `₹${(v / 1e3).toFixed(0)}k` }),
        /* @__PURE__ */ jsx(YAxis, { dataKey: "category", type: "category", tick: {
          fontSize: 10,
          fill: "#888"
        }, width: 80 }),
        /* @__PURE__ */ jsx(Tooltip, { contentStyle: {
          background: "#1a1a2e",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8
        }, formatter: (v) => [formatCurrency(v), "Revenue"] }),
        /* @__PURE__ */ jsx(Bar, { dataKey: "revenue", radius: [0, 4, 4, 0], children: catRevenue.map((_, i) => /* @__PURE__ */ jsx(Cell, { fill: CHART_COLORS[i % CHART_COLORS.length] }, i)) })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsxs(Card, { className: "border-border/60", children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Top Shops by Revenue" }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          (topShops ?? []).slice(0, 6).map((s, i) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 rounded-lg p-2 hover:bg-muted/40 transition-colors", children: [
            /* @__PURE__ */ jsxs("span", { className: "w-5 text-center text-xs font-bold text-muted-foreground", children: [
              "#",
              i + 1
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-medium", children: s.shop_name }),
                s.is_verified && /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3 w-3 shrink-0 text-primary" })
              ] }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                s.category,
                " · ",
                s.city
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-right shrink-0", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-primary", children: formatCurrency(s.revenue) }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                s.order_count,
                " orders"
              ] })
            ] })
          ] }, s.shop_id)),
          !topShops || topShops.length === 0 ? /* @__PURE__ */ jsx("p", { className: "py-8 text-center text-sm text-muted-foreground", children: "No data yet" }) : null
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { className: "border-border/60", children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Recent Orders" }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          (recentOrders ?? []).map((o) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 rounded-lg p-2 hover:bg-muted/40 transition-colors", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxs("p", { className: "truncate text-sm font-medium", children: [
                "Order #",
                o.order_number ?? o.id.slice(0, 8).toUpperCase()
              ] }),
              /* @__PURE__ */ jsx("p", { className: "truncate text-xs text-muted-foreground", children: o.created_at ? formatDate(o.created_at) : "Recent transaction" })
            ] }),
            /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "shrink-0 capitalize text-xs", style: {
              borderColor: STATUS_COLORS[o.status] ?? "#888",
              color: STATUS_COLORS[o.status] ?? "#888"
            }, children: o.status }),
            /* @__PURE__ */ jsx("p", { className: "shrink-0 text-sm font-semibold", children: formatCurrency(o.total_price ?? o.total ?? 0) })
          ] }, o.id)),
          !recentOrders || recentOrders.length === 0 ? /* @__PURE__ */ jsx("p", { className: "py-8 text-center text-sm text-muted-foreground", children: "No orders yet" }) : null
        ] }) })
      ] })
    ] })
  ] });
}
export {
  AdminOverview as component
};
