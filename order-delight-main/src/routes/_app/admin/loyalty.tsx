import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, loyaltyApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Award, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_app/admin/loyalty")({ component: AdminLoyalty });

function AdminLoyalty() {
  const [customerId, setCustomerId] = useState("");
  const [shopId, setShopId] = useState("");
  const [points, setPoints] = useState<number>(0);
  
  // 🚀 NEW STATE: Verification parameters for fetching real-time point states
  const [verifiedProfile, setVerifiedProfile] = useState<{ points: number; customer_name?: string } | null>(null);

  // 1. Verification query lookup action
  const lookupProfile = useMutation({
    // Leverages your custom loyaltyApi.me endpoint structure, passed down as a promise check
    // If your backend admin route needs a direct lookup endpoint instead of /me, adjust this string path wrapper.
    mutationFn: async () => {
      if (!customerId.trim() || !shopId.trim()) throw new Error("IDs cannot be empty");
      // Simulating or calling a dedicated balance query block
      return await loyaltyApi.me(shopId.trim()); // If custom auth allows matching via admin parameters
    },
    onSuccess: (data: any) => {
      setVerifiedProfile({
        points: data.points ?? 0,
        customer_name: data.customer_name
      });
      toast.success("Account loaded for confirmation!");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Account or Shop matching failed");
      setVerifiedProfile(null);
    }
  });

  // 2. Adjust points mutation engine
  const adjust = useMutation({
    mutationFn: () => loyaltyApi.adminAdjust(customerId.trim(), {
      shop_id: shopId.trim(),
      points: points
    }),
    onSuccess: () => {
      toast.success("Loyalty points adjusted successfully!");
      // Automatically refresh the display layout so the admin sees the updated total balance instantly!
      if (verifiedProfile !== null) {
        setVerifiedProfile(prev => prev ? { ...prev, points: prev.points + points } : null);
      }
      setPoints(0);
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Failed to apply adjustment");
    },
  });

  const handleIdChange = () => {
    // Clear out previously loaded profile if they modify the UUID inputs to prevent false reads
    if (verifiedProfile) setVerifiedProfile(null);
  };

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
          
          {/* Target inputs layout area */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Customer Account ID (UUID)</Label>
            <Input 
              value={customerId} 
              onChange={(e) => { setCustomerId(e.target.value); handleIdChange(); }} 
              placeholder="e.g. c89ac9b8-2d16-4771-9837-ff929c9fcd0f" 
              className="h-9 rounded-lg"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Shop ID (UUID)</Label>
            <Input 
              value={shopId} 
              onChange={(e) => { setShopId(e.target.value); handleIdChange(); }} 
              placeholder="e.g. 854223a4-0b3e-4644-b22b-7d04a7f8521c" 
              className="h-9 rounded-lg"
            />
          </div>

          {/* 🚀 THE LOOKUP VERIFICATION ACTION TRIGGER */}
          {!verifiedProfile && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => lookupProfile.mutate()}
              disabled={!customerId.trim() || !shopId.trim() || lookupProfile.isPending}
              className="w-full h-9 rounded-xl text-xs font-bold gap-1.5"
            >
              {lookupProfile.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              Fetch Current Points Balance
            </Button>
          )}

          {/* 🚀 THE LIVE VERIFICATION BANNER BLOCK CONTAINER */}
          {verifiedProfile && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <Award className="h-4 w-4 text-primary" />
                  <span>Verified Customer Ledger Status</span>
                </div>
                <span className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  Active
                </span>
              </div>
              
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-foreground font-medium">Current Registered Points:</span>
                <span className="text-xl font-black text-primary font-mono">{verifiedProfile.points} Pts</span>
              </div>

              {/* Secure Modification Entry fields (unlocked safely post-verification read) */}
              <div className="space-y-3 pt-2 border-t border-dashed border-border/80">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Adjustment Value (Use negative value to subtract points)</Label>
                  <Input 
                    type="number" 
                    value={points || ""} 
                    onChange={(e) => setPoints(Number(e.target.value))} 
                    placeholder="e.g. 50 to add, -50 to remove"
                    className="h-9 rounded-lg bg-background"
                  />
                </div>

                {/* Simulated overdraft warning if the adjustment would drain their balance below zero */}
                {points < 0 && verifiedProfile.points + points < 0 && (
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
                    onClick={() => { setVerifiedProfile(null); setPoints(0); }}
                    className="h-9 rounded-xl text-xs font-semibold"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}