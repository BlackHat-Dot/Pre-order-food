import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, loyaltyApi, usersApi, shopsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Award, ShieldAlert, User, Store, Mail } from "lucide-react";

export const Route = createFileRoute("/_app/admin/loyalty")({ component: AdminLoyalty });

function AdminLoyalty() {
  const [customerId, setCustomerId] = useState("");
  const [shopId, setShopId] = useState("");
  const [points, setPoints] = useState<number>(0);
  
  // Control state to trigger verification queries simultaneously
  const [shouldFetch, setShouldFetch] = useState(false);

  // 1. Fetch live loyalty ledger balance parameters
  const loyaltyQuery = useQuery({
    queryKey: ["admin", "loyalty-check", customerId, shopId],
    queryFn: () => loyaltyApi.me(shopId.trim()),
    enabled: shouldFetch && !!customerId.trim() && !!shopId.trim(),
    retry: false,
  });

  // 2. 🚀 FIXED: Using usersApi.get() which maps cleanly to your backend routing parameters!
  const customerQuery = useQuery({
    queryKey: ["admin", "customer-check", customerId],
    queryFn: () => usersApi.get(customerId.trim()),
    enabled: shouldFetch && !!customerId.trim(),
    retry: false,
  });

  // 3. Fetch shop identity profile details
  const shopQuery = useQuery({
    queryKey: ["admin", "shop-check", shopId],
    queryFn: () => shopsApi.get(shopId.trim()),
    enabled: shouldFetch && !!shopId.trim(),
    retry: false,
  });

  // 4. Adjust points mutation engine
  const adjust = useMutation({
    mutationFn: () => loyaltyApi.adminAdjust(customerId.trim(), {
      shop_id: shopId.trim(),
      points: points
    }),
    onSuccess: () => {
      toast.success("Loyalty points adjusted successfully!");
      setPoints(0);
      // Instantly refresh the ledger so the balance section updates dynamically
      loyaltyQuery.refetch();
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
  
  // 🚀 FIXED: Wrapped safely to check all profiles are fully populated before opening the card view
  const hasData = !!(loyaltyQuery.data && customerQuery.data && shopQuery.data);
  
  // 🚀 FIXED: Swapped out .points for .points_balance to match your type definition file!
  const currentPoints = loyaltyQuery.data?.points_balance ?? 0;

  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Loyalty adjustments</h1>
        <p className="text-sm text-muted-foreground">Manually credit or debit customer account points safely.</p>
      </div>
      
      <Card className="border-border/60 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-base font-bold tracking-tight">Verify & Adjust Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-left">
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Customer Account ID (UUID)</Label>
            <Input 
              value={customerId} 
              onChange={(e) => { setCustomerId(e.target.value); if(shouldFetch) setShouldFetch(false); }} 
              placeholder="e.g. c89ac9b8-2d16-4771-9837-ff929c9fcd0f" 
              className="h-9 rounded-lg font-mono text-xs"
              disabled={shouldFetch && hasData}
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Shop ID (UUID)</Label>
            <Input 
              value={shopId} 
              onChange={(e) => { setShopId(e.target.value); if(shouldFetch) setShouldFetch(false); }} 
              placeholder="e.g. 854223a4-0b3e-4644-b22b-7d04a7f8521c" 
              className="h-9 rounded-lg font-mono text-xs"
              disabled={shouldFetch && hasData}
            />
          </div>

          {!shouldFetch && (
            <Button
              type="button"
              onClick={handleFetchClick}
              disabled={!customerId.trim() || !shopId.trim()}
              className="w-full h-9 rounded-xl text-xs font-bold gap-1.5"
            >
              <Search className="h-3.5 w-3.5" />
              Fetch Current Points Balance
            </Button>
          )}

          {shouldFetch && isSearching && (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Resolving cross-network entity profiles...</span>
            </div>
          )}

          {shouldFetch && hasData && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4 animate-in fade-in duration-200">
              
              {/* Customer Info Verification Details */}
              <div className="space-y-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <User className="h-3.5 w-3.5" /> Customer Account Holder
                </div>
                <div className="pl-5 space-y-0.5">
                  <p className="text-sm font-black text-foreground">{customerQuery.data?.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {customerQuery.data?.email || "No email linked"}
                  </p>
                </div>
              </div>

              {/* Shop Info Verification Details */}
              <div className="space-y-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                  <Store className="h-3.5 w-3.5" /> Destination Merchant Partner
                </div>
                <div className="pl-5 space-y-0.5">
                  <p className="text-sm font-black text-foreground">{shopQuery.data?.name}</p>
                  <p className="text-xs text-muted-foreground">Cuisine Style: {shopQuery.data?.cuisine ?? "—"}</p>
                </div>
              </div>

              {/* Live Points Metrics */}
              <div className="flex items-baseline justify-between bg-background border p-3 rounded-lg shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-primary" /> Active Balance:
                </span>
                <span className="text-xl font-black text-primary font-mono">{currentPoints} Pts</span>
              </div>

              {/* Points action delta inputs workflow form box */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Adjustment Value (Use negative value to subtract points)</Label>
                  <Input 
                    type="number" 
                    value={points || ""} 
                    onChange={(e) => setPoints(Number(e.target.value))} 
                    placeholder="e.g. 50 to credit, -50 to debit"
                    className="h-9 rounded-lg bg-background"
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
                    onClick={() => adjust.mutate()}
                    disabled={points === 0 || adjust.isPending}
                    className="flex-1 h-9 rounded-xl font-bold text-xs gap-1.5"
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
                    className="h-9 rounded-xl text-xs font-semibold border"
                  >
                    Reset Panel
                  </Button>
                </div>
              </div>

            </div>
          )}

          {/* Catch-all block for non-existent IDs */}
          {shouldFetch && (loyaltyQuery.isError || customerQuery.isError || shopQuery.isError) && (
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-center text-xs space-y-2 animate-in fade-in">
              <p className="font-bold text-destructive">Lookup Failed</p>
              <p className="text-muted-foreground text-[11px]">
                The requested identities could not be matched. Please double-check that your UUID values are correct.
              </p>
              <Button size="sm" variant="outline" onClick={handleClear} className="h-7 text-[10px] mx-auto rounded-lg">
                Reset UUIDs
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}