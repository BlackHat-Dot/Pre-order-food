import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, loyaltyApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/admin/loyalty")({ component: AdminLoyalty });

function AdminLoyalty() {
  const [customerId, setCustomerId] = useState("");
  const [shopId, setShopId] = useState("");
  const [points, setPoints] = useState<number>(0);
  const adjust = useMutation({
    mutationFn: () => loyaltyApi.adjust(customerId, { shop_id: shopId, points }),
    onSuccess: () => {
      toast.success("Adjusted");
      setPoints(0);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Loyalty adjustments</h1>
        <p className="text-sm text-muted-foreground">Manually credit or debit points.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Adjust points</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Customer ID</Label>
            <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="UUID" />
          </div>
          <div className="space-y-2">
            <Label>Points (negative to debit)</Label>
            <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Shop ID</Label>
            <Input value={shopId} onChange={(e) => setShopId(e.target.value)} placeholder="Shop UUID" />
          </div>
          <Button
            onClick={() => adjust.mutate()}
            disabled={!customerId || !shopId || points === 0 || adjust.isPending}
          >
            {adjust.isPending ? "Saving…" : "Apply adjustment"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
