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
  { value: "completed", label: "Completed" }, // Aligned tab naming with State Machine
  { value: "cancelled", label: "Cancelled" },
];

// ==========================================
// 1. PROFESSIONAL OPTIONAL REVIEW MODAL COMPONENT
// ==========================================
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
        
        {/* Dismiss Icon */}
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

          {/* Interactive Star Row (Optional Click, Fluid Hover States) */}
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

          {/* Optional Content Message Text Box Area */}
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

          {/* Actions */}
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

// ==========================================
// 2. MAIN ORDERS PAGE WITH LIVE TRACKING INTERCEPT
// ==========================================
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

  // Automated Hook: intercept completed items and request a feedback review session
  useEffect(() => {
    if (!data || !Array.isArray(data)) return;

    // Detect if an order has transitioned to completed, ignoring previously dismissed items in this window session
    const completedOrder = data.find(
      (o: any) => o.status === "completed" && !promptedOrders.includes(o.id)
    );

    if (completedOrder) {
      setActiveReviewShop({
        id: completedOrder.shop_id,
        name: completedOrder.shop_name || "the shop",
        orderId: completedOrder.id
      });
      // Register out the layout key variant to block loop triggers
      setPromptedOrders((prev) => [...prev, completedOrder.id]);
    }
  }, [data, promptedOrders]);

  // Network pipeline handler engine to submit values to database
  const submitReview = useMutation({
    mutationFn: async ({ shopId, rating, comment, orderId }: { shopId: string; rating: number | null; comment: string; orderId: string }) => {
      // Points cleanly to your global orders API/review handler configuration parameters
      return await ordersApi.submitReview(shopId, { rating, comment, order_id: orderId });
    },
    onSuccess: () => {
      toast.success("Thank you for your review!");
      setActiveReviewShop(null);
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Failed to post feedback data");
    }
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
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
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs text-muted-foreground">
                        #{o.id.slice(0, 8)}
                      </p>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-1 text-sm">
                      {o.items?.length ?? 0} {o.items?.length === 1 ? "item" : "items"} ·{" "}
                      {formatDate(o.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold">{formatCurrency(o.total_price)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Review Modal Insertion Overlay */}
      <ReviewModal
        isOpen={activeReviewShop !== null}
        shopName={activeReviewShop?.name || ""}
        onClose={() => setActiveReviewShop(null)}
        onSubmit={(rating, comment) => {
          if (activeReviewShop) {
            submitReview.mutate({
              shopId: activeReviewShop.id,
              rating,
              comment,
              orderId: activeReviewShop.orderId
            });
          }
        }}
      />
    </div>
  );
}