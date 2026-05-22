import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Star, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ordersApi, ApiError, type OrderStatus } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/_app/orders")({ component: OrdersPage });

const tabs: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number | null, comment: string) => void;
  shopName: string;
}

function ReviewModal({ isOpen, onClose, onSubmit, shopName }: ReviewModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border text-card-foreground w-full max-w-md rounded-2xl p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 relative">
        
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight">How was your food?</h3>
            <p className="text-xs text-muted-foreground">
              Share your optional feedback for <span className="font-semibold text-foreground">{shopName}</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5 py-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star === rating ? null : star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                className="transform transition-transform active:scale-95 p-1 outline-none"
              >
                <Star
                  className={`h-7 w-7 transition-colors ${
                    star <= (hoveredRating ?? rating ?? 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/20"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs font-medium text-muted-foreground">
              Write a review <span className="text-[10px] opacity-60">(Optional)</span>
            </label>
            <Textarea
              placeholder="Delicious food, quick service, packaging was neat..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none min-h-[90px] text-sm rounded-xl focus-visible:ring-primary"
              maxLength={300}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 h-10 rounded-xl text-xs font-medium" onClick={onClose}>
              Skip
            </Button>
            <Button className="flex-1 h-10 rounded-xl text-xs font-medium" onClick={() => onSubmit(rating, comment)}>
              Submit Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [activeReviewShop, setActiveReviewShop] = useState<{ id: string; name: string; orderId: string } | null>(null);
  const [promptedOrders, setPromptedOrders] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", status],
    queryFn: () =>
      ordersApi.list({ page: 1, page_size: 50, status: status === "all" ? undefined : (status as OrderStatus) }),
  });

  useEffect(() => {
    if (!data || !Array.isArray(data)) return;

    const completedOrder = data.find(
      (o: any) => o.status === "completed" && !promptedOrders.includes(o.id)
    );

    if (completedOrder) {
      setActiveReviewShop({
        id: completedOrder.shop_id,
        name: completedOrder.shop_name || "the shop",
        orderId: completedOrder.id
      });
      setPromptedOrders((prev) => [...prev, completedOrder.id]);
    }
  }, [data, promptedOrders]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="text-left">
        <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
        <p className="text-sm text-muted-foreground">Track and manage your pre-orders.</p>
      </div>
      <Tabs value={status} onValueChange={setStatus}>
        <TabsList className="flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            No orders yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((o) => (
            <Link key={o.id} to="/orders/$orderId" params={{ orderId: o.id }}>
              <Card className="transition-all hover:border-primary/40 text-left">
                <CardContent className="p-5 space-y-4">
                  
                  {/* Top metadata tracking bar row context */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {formatDate(o.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-foreground">{formatCurrency(o.total_price)}</p>
                      {o.shop_name && (
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">{o.shop_name}</p>
                      )}
                    </div>
                  </div>

                  {/* Itemized Food List View Panel Container */}
                  <div className="bg-muted/40 border border-border/40 rounded-xl p-3 text-xs space-y-2">
                    {o.items && o.items.length > 0 ? (
                      <div className="space-y-1.5 divide-y divide-border/20">
                        {o.items.map((item: any, idx: number) => {
  // 1. Gather our baseline snapshot strings
  const baseItemName = item.item_name_snapshot || item.menu_item_name || item.name || "Dish Item";
  const variantChoiceName = item.variant_name_snapshot || item.variant_name || null;
  
  // 🚀 FIXED: Check if the base name already includes the variant name to prevent double rendering
  const isVariantAlreadyInTitle = variantChoiceName && baseItemName.toLowerCase().includes(`(${variantChoiceName.toLowerCase()})`);
  
  // Only concatenate if it's a completely distinct sub-variant subtitle name string
  const displayTitle = variantChoiceName && !isVariantAlreadyInTitle 
    ? `${baseItemName} (${variantChoiceName})` 
    : baseItemName;

  return (
    <div key={idx} className="flex items-start justify-between pt-1.5 first:pt-0 gap-4">
      <div className="space-y-0.5">
        <p className="font-semibold text-foreground">
          {displayTitle}
        </p>
        {variantChoiceName && (
          <p className="text-[10px] text-muted-foreground italic">
            Option: {variantChoiceName}
          </p>
        )}
      </div>
      <span className="font-mono text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/60 shrink-0 font-bold">
        ×{item.quantity}
      </span>
    </div>
  );
})}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-muted-foreground italic">
                        <span>Standard Basket Content</span>
                        <span className="font-mono">
                          ×{o.items && o.items.length > 0 
                            ? o.items.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) 
                            : 1}
                        </span>
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}