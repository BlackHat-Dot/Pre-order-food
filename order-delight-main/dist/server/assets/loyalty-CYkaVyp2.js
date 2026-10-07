import { jsxs, jsx } from "react/jsx-runtime";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { a as apiRequest, n as usersApi, s as shopsApi, A as ApiError, t as adminApi, B as Button } from "./router-DQr6eapq.js";
import { C as Card, a as CardHeader, b as CardTitle, d as CardContent } from "./card-BjRrBkxP.js";
import { I as Input } from "./input-B-ZXk5uj.js";
import { L as Label } from "./label-D-IOUQFS.js";
import { Search, Loader2, User, Mail, Store, Award, ShieldAlert } from "lucide-react";
import "@tanstack/react-router";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-label";
function AdminLoyalty() {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [shopId, setShopId] = useState("");
  const [points, setPoints] = useState(0);
  const [shouldFetch, setShouldFetch] = useState(false);
  const loyaltyQuery = useQuery({
    queryKey: ["admin", "loyalty-check", customerId, shopId],
    queryFn: () => apiRequest("/api/v1/loyalty/admin/balance", {
      method: "GET",
      query: {
        customer_id: customerId.trim(),
        shop_id: shopId.trim()
      }
    }),
    enabled: shouldFetch && !!customerId.trim() && !!shopId.trim(),
    retry: false
  });
  const customerQuery = useQuery({
    queryKey: ["admin", "customer-check", customerId],
    queryFn: () => usersApi.get(customerId.trim()),
    enabled: shouldFetch && !!customerId.trim(),
    retry: false
  });
  const shopQuery = useQuery({
    queryKey: ["admin", "shop-check", shopId],
    queryFn: () => shopsApi.get(shopId.trim()),
    enabled: shouldFetch && !!shopId.trim(),
    retry: false
  });
  const adjust = useMutation({
    mutationFn: (variables) => adminApi.loyalty(variables.userId, {
      shopId: variables.shopId,
      points: variables.pointDelta
    }),
    onSuccess: () => {
      toast.success("Loyalty points adjusted successfully!");
      setPoints(0);
      qc.invalidateQueries({
        queryKey: ["admin", "loyalty-check", customerId, shopId]
      });
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Something went wrong");
      }
    }
  });
  const handleFetchClick = () => {
    if (!customerId.trim() || !shopId.trim()) {
      toast.error("Please enter both Customer and Shop ID strings.");
      return;
    }
    setShouldFetch(true);
  };
  const handleClear = () => {
    setShouldFetch(false);
    setCustomerId("");
    setShopId("");
    setPoints(0);
  };
  const isSearching = loyaltyQuery.isFetching || customerQuery.isFetching || shopQuery.isFetching;
  const hasData = !!(loyaltyQuery.data || customerQuery.data || shopQuery.data);
  const currentPoints = loyaltyQuery.data?.points_balance ?? 0;
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-xl space-y-6 py-4", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight text-foreground text-left", children: "Loyalty adjustments" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground text-left", children: "Manually credit or debit customer account points safely." })
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "border-border/60 shadow-sm rounded-xl", children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-bold tracking-tight text-left", children: "Verify & Adjust Records" }) }),
      /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4 text-left", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs text-muted-foreground", children: "Customer Account ID (UUID)" }),
          /* @__PURE__ */ jsx(Input, { value: customerId, onChange: (e) => {
            setCustomerId(e.target.value);
            if (shouldFetch) setShouldFetch(false);
          }, placeholder: "e.g. c89ac9b8-2d16-4771-9837-ff929c9fcd0f", className: "h-9 rounded-lg font-mono text-xs focus-visible:ring-primary", disabled: shouldFetch && hasData })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs text-muted-foreground", children: "Target Shop ID (UUID)" }),
          /* @__PURE__ */ jsx(Input, { value: shopId, onChange: (e) => {
            setShopId(e.target.value);
            if (shouldFetch) setShouldFetch(false);
          }, placeholder: "e.g. 854223a4-0b3e-4644-b22b-7d04a7f8521c", className: "h-9 rounded-lg font-mono text-xs focus-visible:ring-primary", disabled: shouldFetch && hasData })
        ] }),
        !shouldFetch && /* @__PURE__ */ jsxs(Button, { type: "button", onClick: handleFetchClick, disabled: !customerId.trim() || !shopId.trim(), className: "w-full h-9 rounded-xl text-xs font-bold gap-1.5 shadow-sm", children: [
          /* @__PURE__ */ jsx(Search, { className: "h-3.5 w-3.5" }),
          "Fetch Current Points Balance"
        ] }),
        shouldFetch && isSearching && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground animate-pulse", children: [
          /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin text-primary" }),
          /* @__PURE__ */ jsx("span", { children: "Resolving cross-network entity profiles..." })
        ] }),
        shouldFetch && !isSearching && (loyaltyQuery.data || customerQuery.data || shopQuery.data) && /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border bg-muted/20 p-4 space-y-4 animate-in fade-in duration-200", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2 border-b border-border/50 pb-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-xs font-bold text-primary", children: [
              /* @__PURE__ */ jsx(User, { className: "h-3.5 w-3.5" }),
              " Customer Account Holder"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "pl-5 space-y-0.5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-black text-foreground", children: customerQuery.data?.name || "Unknown Identity Name" }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground flex items-center gap-1", children: [
                /* @__PURE__ */ jsx(Mail, { className: "h-3 w-3" }),
                " ",
                customerQuery.data?.email || "No email address registered"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2 border-b border-border/50 pb-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-xs font-bold text-amber-500", children: [
              /* @__PURE__ */ jsx(Store, { className: "h-3.5 w-3.5" }),
              " Destination Merchant Partner"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "pl-5 space-y-0.5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-black text-foreground", children: shopQuery.data?.name || "Unknown Merchant Branch" }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                "Cuisine Style: ",
                shopQuery.data?.cuisine || shopQuery.data?.category || "General Store"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between bg-background border p-3 rounded-lg shadow-sm", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-xs font-semibold text-muted-foreground flex items-center gap-1", children: [
              /* @__PURE__ */ jsx(Award, { className: "h-3.5 w-3.5 text-primary" }),
              " Active Balance:"
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "text-xl font-black text-primary font-mono", children: [
              currentPoints,
              " Pts"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-3 pt-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { className: "text-xs text-muted-foreground", children: "Adjustment Value (Use negative value to subtract points)" }),
              /* @__PURE__ */ jsx(Input, { type: "number", value: points || "", onChange: (e) => setPoints(Number(e.target.value)), placeholder: "e.g. 50 to credit, -50 to debit", className: "h-9 rounded-lg bg-background focus-visible:ring-primary font-mono" })
            ] }),
            points < 0 && currentPoints + points < 0 && /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-destructive font-semibold flex items-center gap-1 bg-destructive/5 p-2 rounded-lg border border-destructive/10", children: [
              /* @__PURE__ */ jsx(ShieldAlert, { className: "h-3.5 w-3.5 shrink-0" }),
              "Warning: This action will push the user's loyalty balance into a negative debt state!"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2 pt-1", children: [
              /* @__PURE__ */ jsx(Button, { onClick: () => adjust.mutate({
                userId: customerId.trim(),
                shopId: shopId.trim(),
                pointDelta: points
              }), disabled: points === 0 || adjust.isPending, className: "w-full h-9 rounded-xl font-bold text-xs gap-1.5 shadow-sm", children: adjust.isPending ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : "Apply Adjustments" }),
              /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: handleClear, className: "h-9 rounded-xl text-xs font-semibold border hover:bg-muted", children: "Reset Panel" })
            ] })
          ] })
        ] }),
        shouldFetch && !isSearching && (loyaltyQuery.isError || customerQuery.isError || shopQuery.isError) && /* @__PURE__ */ jsxs("div", { className: "p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-center text-xs space-y-2 animate-in fade-in", children: [
          /* @__PURE__ */ jsx("p", { className: "font-bold text-destructive", children: "Lookup Failed" }),
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-[11px]", children: "The requested identities could not be matched. Please double-check that your UUID values are correct." }),
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: handleClear, className: "h-7 text-[10px] mx-auto rounded-lg bg-background", children: "Reset UUIDs" })
        ] })
      ] })
    ] })
  ] });
}
export {
  AdminLoyalty as component
};
