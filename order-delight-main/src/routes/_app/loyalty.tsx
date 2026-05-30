import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Info, Ticket, Copy, Check, Share2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { ApiError, apiRequest, ordersApi, shopsApi, loyaltyApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatCurrency } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_app/loyalty")({ component: LoyaltyPage });

type OrderItem = {
  id?: string;
  quantity: number;
  unit_price: number;
  item_name_snapshot?: string;
  name?: string;
};

type Order = {
  id: string;
  status: string;
  total_price: number;
  payment_status: string;
  cancellation_reason?: string | null;
  cancellation_requests_sent?: number;
  items?: OrderItem[];
  shop?: {
    phone?: string;
    email?: string;
  };
};

function LoyaltyPage() {
  const qc = useQueryClient();
  const [shopId, setShopId] = useState<string>("");
  const [pointsToRedeem, setPointsToRedeem] = useState<string>("100");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [latestCoupon, setLatestCoupon] = useState<any | null>(null);

  // 1. Fetch live customer wallet tracking parameters
  const { data: account } = useQuery({
    queryKey: ["loyalty", "me", shopId],
    queryFn: () => loyaltyApi.me(shopId),
    enabled: !!shopId,
  });

  // 2. Fetch transaction history rows
  const { data: txns } = useQuery({
    queryKey: ["loyalty", "txns", shopId],
    queryFn: () => loyaltyApi.transactions(shopId),
    enabled: !!shopId,
  });

  // 3. Fetch shop discount metrics to calculate dynamic coupon value transformations
  const { data: shop } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => shopsApi.get(shopId),
    enabled: !!shopId,
  });

  const discountPerPoint = (shop as any)?.loyalty_discount_per_point ?? 0.1;
  const currentBalance = account?.points_balance ?? 0;

  // 4. Coupon minting mutation engine pointing directly to your new backend route
  const mintCoupon = useMutation({
    mutationFn: async (points: number) => {
      return await apiRequest<any>("/api/v1/coupons/mint", {
        method: "POST",
        body: { shop_id: shopId, points },
      });
    },
    onSuccess: (data) => {
      toast.success(`Successfully minted voucher: ${data.code}`);
      setLatestCoupon(data);
      setPointsToRedeem("");
      // Sync layout cache matrices instantly
      qc.invalidateQueries({ queryKey: ["loyalty"] });
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        toast.error(e.message);
      } else {
        toast.error("Something went wrong");
      }
    },
  });

  const handleMintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(pointsToRedeem, 10);
    if (isNaN(pts) || pts <= 0) return toast.error("Please provide a valid point value.");
    if (pts > currentBalance) return toast.error("Requested points exceed your available balance.");

    mintCoupon.mutate(pts);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Coupon code copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* SECTION 1: Shop Selection & Balance Display Card */}
      <Card
        className="overflow-hidden border-primary/20 shadow-xl"
        style={{ background: "var(--gradient-surface)" }}
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="space-y-4 flex-1 min-w-[240px]">
            <div>
              <p className="text-xs font-semibold tracking-wider text-primary/80 uppercase">Shop-Specific Wallet</p>
              <Input
                className="mt-1.5 max-w-xs h-10 rounded-xl bg-background/50 border-primary/20 focus-visible:ring-primary"
                placeholder="Paste Shop ID here..."
                value={shopId}
                onChange={(e) => {
                  setShopId(e.target.value);
                  setLatestCoupon(null); // Clear last coupon state when changing shops
                }}
              />
            </div>
            {shopId && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">Available Loyalty Balance</p>
                <p className="mt-0.5 text-4xl font-black text-foreground tracking-tight">
                  {currentBalance}{" "}
                  <span className="text-base font-medium text-muted-foreground">pts</span>
                </p>
                {shop && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Value factor at <span className="font-semibold text-foreground">{(shop as any).name}</span>: 1 pt = {formatCurrency(discountPerPoint)} discount
                  </p>
                )}
              </div>
            )}
          </div>
          <Sparkles className="h-12 w-12 text-primary animate-pulse shrink-0 hidden sm:block" />
        </CardContent>
      </Card>

      {/* SECTION 2: Interactive Coupon Generator Minting Module */}
      {shopId && (
        <Card className="border-border/60 shadow-sm rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center gap-2 space-y-0">
            <CardTitle className="text-base font-bold">Generate Shareable Voucher</CardTitle>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground/60 hover:text-foreground transition-colors outline-none">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3 space-y-2 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl">
                  <p className="text-xs font-bold">💡 How coupons work:</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Converting points creates a standalone code voucher worth <span className="text-primary font-medium">{formatCurrency(discountPerPoint)} per point</span>.
                  </p>
                  <p className="text-[11px] text-emerald-500 dark:text-emerald-400 font-medium leading-relaxed">
                    ⭐️ Coupons are shop-specific but public! You can use them yourself at checkout, or text the generated code to friends and family so they can save on their food.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleMintSubmit} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px] space-y-1.5">
                <Label htmlFor="points" className="text-xs font-medium text-muted-foreground">
                  Points to burn (Max {currentBalance} pts)
                </Label>
                <Input
                  id="points"
                  type="number"
                  min={1}
                  max={currentBalance}
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(e.target.value)}
                  className="h-10 rounded-xl focus-visible:ring-primary"
                  disabled={currentBalance === 0}
                />
              </div>
              <Button 
                type="submit" 
                disabled={mintCoupon.isPending || !pointsToRedeem || currentBalance === 0}
                className="h-10 rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-md shadow-primary/10 transition-all active:scale-95"
              >
                <Ticket className="h-3.5 w-3.5" /> 
                {mintCoupon.isPending ? "Generating..." : "Convert to Coupon"}
              </Button>
            </form>

            {latestCoupon && (
              <div className="mt-2 border border-dashed border-emerald-500/30 bg-emerald-500/5 p-4 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">Coupon Created Successfully</p>
                    <p className="text-lg font-black text-foreground">{formatCurrency(latestCoupon.discount_value)} Total Discount</p>
                  </div>
                  <Ticket className="h-5 w-5 text-emerald-500 animate-pulse" />
                </div>

                <div className="flex items-center gap-2 bg-background border border-border p-2.5 rounded-xl justify-between shadow-sm">
                  <code className="font-mono text-sm font-bold select-all tracking-wider text-primary px-1">
                    {latestCoupon.code}
                  </code>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg hover:bg-muted"
                    onClick={() => handleCopyCode(latestCoupon.code)}
                  >
                    {copiedCode === latestCoupon.code ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Share2 className="h-3 w-3 text-primary" /> Pass this code to a friend! Anyone who inputs it at checkout will get the discount applied instantly.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SECTION 3: Transaction Ledger Display Module */}
      <Card className="border-border/60 shadow-sm rounded-2xl">
        <CardHeader className="pb-3 flex flex-row items-center gap-2 space-y-0">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-bold">Ledger Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!shopId ? (
            <p className="py-8 text-center text-xs text-muted-foreground font-medium">
              Please enter a valid Shop ID above to unlock historical account transaction histories.
            </p>
          ) : !txns || txns.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground font-medium">No transactions found for this vendor account.</p>
          ) : (
            txns.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b border-border/40 py-2.5 text-sm last:border-0"
              >
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs capitalize text-foreground">{t.action}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.order_id ? `Order #${t.order_id.slice(0, 8)}` : "Coupon Mint Point Conversion"} · {formatDate(t.created_at)}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold ${
                    t.points >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  }`}
                >
                  {t.points >= 0 ? "+" : ""}
                  {t.points} pts
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}