import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, loyaltyApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/admin/loyalty")({ component: AdminLoyalty });

function AdminLoyalty() {
  const [customerId, setCustomerId] = useState("");
  const [shopId, setShopId] = useState("");
  const [points, setPoints] = useState<number>(0);

  const adjust = useMutation({
    // 🚀 FIXED: Calling our real, newly added backend bridge method cleanly!
    mutationFn: () => loyaltyApi.adminAdjust(customerId.trim(), {
      shop_id: shopId.trim(),
      points: points
    }),
    onSuccess: () => {
      toast.success("Loyalty points adjusted successfully!");
      setPoints(0);
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Failed to apply adjustment");
    },
  });
  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Loyalty adjustments</h1>
        <p className="text-sm text-muted-foreground">Manually credit or debit points.</p>
      </div>
      
      <Card className="border-border/60 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-base font-bold tracking-tight">Adjust points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-left">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Customer ID</Label>
            <Input 
              value={customerId} 
              onChange={(e) => setCustomerId(e.target.value)} 
              placeholder="e.g. c89ac9b8-2d16-4771-9837-ff929c9fcd0f" 
              className="h-9 rounded-lg"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Points (negative to debit)</Label>
            <Input 
              type="number" 
              value={points || ""} 
              onChange={(e) => setPoints(Number(e.target.value))} 
              placeholder="e.g. 100 or -50"
              className="h-9 rounded-lg"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Shop ID</Label>
            <Input 
              value={shopId} 
              onChange={(e) => setShopId(e.target.value)} 
              placeholder="e.g. 854223a4-0b3e-4644-b22b-7d04a7f8521c" 
              className="h-9 rounded-lg"
            />
          </div>
          
          <Button
            onClick={() => adjust.mutate()}
            disabled={!customerId.trim() || !shopId.trim() || points === 0 || adjust.isPending}
            className="w-full sm:w-auto h-9 rounded-xl font-semibold text-xs px-5 gap-1.5"
          >
            {adjust.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving Changes…
              </>
            ) : (
              "Apply adjustment"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}