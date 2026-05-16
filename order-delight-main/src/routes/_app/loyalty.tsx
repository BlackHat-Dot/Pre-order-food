import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ApiError, loyaltyApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/loyalty")({ component: LoyaltyPage });

function LoyaltyPage() {
  const qc = useQueryClient();
  const [shopId, setShopId] = useState<string>("");
  const [points, setPoints] = useState<number>(100);

  const { data: account } = useQuery({
    queryKey: ["loyalty", "me", shopId],
    queryFn: () => loyaltyApi.me(shopId),
    enabled: !!shopId,
  });
  const { data: txns } = useQuery({
    queryKey: ["loyalty", "txns", shopId],
    queryFn: () => loyaltyApi.transactions(shopId),
    enabled: !!shopId,
  });

  const redeem = useMutation({
    mutationFn: () => loyaltyApi.redeem({ shop_id: shopId, points }),
    onSuccess: () => {
      toast.success("Points redeemed");
      qc.invalidateQueries({ queryKey: ["loyalty"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card
        className="overflow-hidden border-primary/40"
        style={{ background: "var(--gradient-surface)" }}
      >
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-xs text-muted-foreground">Shop-specific wallet</p>
            <Input
              className="mt-2 max-w-xs"
              placeholder="Enter shop ID"
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">Loyalty balance</p>
            <p className="mt-1 text-4xl font-bold">
              {account?.points_balance ?? 0}{" "}
              <span className="text-base font-medium text-muted-foreground">pts</span>
            </p>
          </div>
          <Sparkles className="h-12 w-12 text-primary" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redeem points</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label>Points to redeem</Label>
            <Input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
            />
          </div>
          <Button onClick={() => redeem.mutate()} disabled={redeem.isPending || !shopId}>
            {redeem.isPending ? "Redeeming…" : "Redeem"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!txns || txns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            txns.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0"
              >
                <div>
                  <p className="font-medium capitalize">{t.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.order_id ? `Order ${t.order_id}` : "Loyalty"} · {formatDate(t.created_at)}
                  </p>
                </div>
                <span
                  className={t.points >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}
                >
                  {t.points >= 0 ? "+" : ""}
                  {t.points}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
