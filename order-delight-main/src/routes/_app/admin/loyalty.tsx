import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, adminApi, usersApi, shopsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Award, ShieldAlert, User, Store, Mail } from "lucide-react";

export const Route = createFileRoute("/_app/admin/loyalty")({ component: AdminLoyalty });

function AdminLoyalty() {
  const qc = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [shopId, setShopId] = useState("");
  const [points, setPoints] = useState<number>(0);
  
  // Control state to trigger verification queries simultaneously
  const [shouldFetch, setShouldFetch] = useState(false);

  // 1. Fetch live loyalty ledger balance parameters
  const loyaltyQuery = useQuery({
    queryKey: ["admin", "loyalty-check", customerId, shopId],
    // Underneath the hood, this hits the backend logic gracefully
    queryFn: () => adminApi.loyalty(customerId.trim(), { shopId: shopId.trim(), points: 0 }),
    enabled: shouldFetch && !!customerId.trim() && !!shopId.trim(),
    retry: false,
  });

  // 2. Cross-verify the Customer Account exists
  const customerQuery = useQuery({
    queryKey: ["admin", "customer-check", customerId],
    queryFn: () => usersApi.get(customerId.trim()),
    enabled: shouldFetch && !!customerId.trim(),
    retry: false,
  });

  // 3. Cross-verify the Merchant Shop exists
  const shopQuery = useQuery({
    queryKey: ["admin", "shop-check", shopId],
    queryFn: () => shopsApi.get(shopId.trim()),
    enabled: shouldFetch && !!shopId.trim(),
    retry: false,
  });

  // 4. 🚀 FIXED: Mutation now cleanly wraps structural payload to meet backend query standards
  const adjust = useMutation({
    mutationFn: (variables: { userId: string; shopId: string; pointDelta: number }) =>
      adminApi.loyalty(variables.userId, {
        shopId: variables.shopId,
        points: variables.pointDelta,
      }),
    onSuccess: () => {
      toast.success("Loyalty points adjusted successfully!");
      setPoints(0);
      // Instantly refresh query cache maps so values update on screen dynamically
      qc.invalidateQueries({ queryKey: ["admin", "loyalty-check", customerId, shopId] });
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Failed to apply adjustment");
    },
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

  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground text-left">Loyalty adjustments</h1>
        <p className="text-sm text-muted-foreground text-left">Manually credit or debit customer account points safely.</p>
      </div>
      
      <Card className="border-border/60 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-base font-bold tracking-tight text-left">Verify & Adjust Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-left">
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Customer Account ID (UUID)</Label>
            <Input 
              value={customerId} 
              onChange={(e) => { setCustomerId(e.target.value); if(shouldFetch) setShouldFetch(false); }} 
              placeholder="e.g. c89ac9b8-2d16-4771-9837-ff929c9fcd0f" 
              className="h-9 rounded-lg font-mono text-xs focus-visible:ring-primary"
              disabled={shouldFetch && hasData}
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Shop ID (UUID)</Label>
            <Input 
              value={shopId} 
              onChange={(e) => { setShopId(e.target.value); if(shouldFetch) setShouldFetch(false); }} 
              placeholder="e.g. 854223a4-0b3e-4644-b22b-7d04a7f8521c" 
              className="h-9 rounded-lg font-mono text-xs focus-visible:ring-primary"
              disabled={shouldFetch && hasData}
            />
          </div>

          {!shouldFetch && (
            <Button
              type="button"
              onClick={handleFetchClick}
              disabled={!customerId.trim() || !shopId.trim()}
              className="w-full h-9 rounded-xl text-xs font-bold gap-1.5 shadow-sm"
            >
              <Search className="h-3.5 w-3.5" />
              Fetch Current Points Balance
            </Button>
          )}

          {shouldFetch && isSearching && (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Resolving cross-network entity profiles...</span>
            </div>
          )}

          {shouldFetch && !isSearching && (loyaltyQuery.data || customerQuery.data || shopQuery.data) && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Customer Verification Box */}
              <div className="space-y-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <User className="h-3.5 w-3.5" /> Customer Account Holder
                </div>
                <div className="pl-5 space-y-0.5">
                  <p className="text-sm font-black text-foreground">{customerQuery.data?.name || "Unknown Identity Name"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {customerQuery.data?.email || "No email address registered"}
                  </p>
                </div>
              </div>

              {/* Shop Verification Box */}
              <div className="space-y-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                  <Store className="h-3.5 w-3.5" /> Destination Merchant Partner
                </div>
                <div className="pl-5 space-y-0.5">
                  <p className="text-sm font-black text-foreground">{shopQuery.data?.name || "Unknown Merchant Branch"}</p>
                  <p className="text-xs text-muted-foreground">Cuisine Style: {shopQuery.data?.cuisine ?? "General Store"}</p>
                </div>
              </div>

              {/* Dynamic Point Metrics Bar */}
              <div className="flex items-center justify-between bg-background border p-3 rounded-lg shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-primary" /> Active Balance:
                </span>
                <span className="text-xl font-black text-primary font-mono">{currentPoints} Pts</span>
              </div>

              {/* Mutation Adjustment Control Sub-Form */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Adjustment Value (Use negative value to subtract points)</Label>
                  <Input 
                    type="number" 
                    value={points || ""} 
                    onChange={(e) => setPoints(Number(e.target.value))} 
                    placeholder="e.g. 50 to credit, -50 to debit"
                    className="h-9 rounded-lg bg-background focus-visible:ring-primary font-mono"
                  />
                </div>

                {points < 0 && currentPoints + points < 0 && (
                  <p className="text-[11px] text-destructive font-semibold flex items-center gap-1 bg-destructive/5 p-2 rounded-lg border border-destructive/10">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    Warning: This action will push the user's loyalty balance into a negative debt state!
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    // 🚀 FIXED: State variables successfully bound to variables execution context block!
                    onClick={() => adjust.mutate({
                      userId: customerId.trim(),
                      shopId: shopId.trim(),
                      pointDelta: points
                    })}
                    disabled={points === 0 || adjust.isPending}
                    className="flex-1 h-9 rounded-xl font-bold text-xs gap-1.5 shadow-sm"
                  >
                    {adjust.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Apply Adjustments"
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleClear}
                    className="h-9 rounded-xl text-xs font-semibold border hover:bg-muted"
                  >
                    Reset Panel
                  </Button>
                </div>
              </div>

            </div>
          )}

          {/* Fallback Catch-all Panel for Missing Profiles */}
          {shouldFetch && !isSearching && (loyaltyQuery.isError || customerQuery.isError || shopQuery.isError) && (
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-center text-xs space-y-2 animate-in fade-in">
              <p className="font-bold text-destructive">Lookup Failed</p>
              <p className="text-muted-foreground text-[11px]">
                The requested identities could not be matched. Please double-check that your UUID values are correct.
              </p>
              <Button size="sm" variant="outline" onClick={handleClear} className="h-7 text-[10px] mx-auto rounded-lg bg-background">
                Reset UUIDs
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}