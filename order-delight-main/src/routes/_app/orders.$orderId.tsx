import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, HelpCircle, XCircle } from "lucide-react";

export function CustomerOrderActionModule({ order }: { order: any }) {
  const qc = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { status: string; reason?: string }) => {
      return await apiRequest(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: payload,
      });
    },
    onSuccess: (updatedOrder: any) => {
      toast.success(
        updatedOrder.status === "cancelled" 
          ? "Order cancelled instantly. Vouchers and points have been restored."
          : "Cancellation request forwarded to store management tracking view lines."
      );
      setIsModalOpen(false);
      setReasonText("");
      qc.invalidateQueries({ queryKey: ["order", order.id] });
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Lifecycle status alteration error occurred.");
    }
  });

  // Render rules matching specified status bounds
  const canInstantlyCancel = order.status === "pending";
  const canRequestCancel = ["accepted", "preparing", "ready"].includes(order.status);

  if (!canInstantlyCancel && !canRequestCancel) return null;

  return (
    <div className="mt-4 p-4 border border-destructive/20 bg-destructive/5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="space-y-1 text-center sm:text-left">
        <p className="text-xs font-bold flex items-center gap-1.5 justify-center sm:justify-start text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" /> Need to cancel this meal ticket request?
        </p>
        <p className="text-[11px] text-muted-foreground max-w-md leading-normal">
          {canInstantlyCancel 
            ? "Since this purchase is still pending kitchen processing authorization metrics, you are entitled to execute an instant order tear-down down here."
            : "The kitchen is actively processing your order. You can submit a cancellation request to the shop owner along with a short message."}
        </p>
      </div>

      {canInstantlyCancel ? (
        <Button
          variant="destructive"
          size="sm"
          className="rounded-xl text-xs font-semibold gap-1.5 shrink-0 px-4 transition-transform active:scale-95"
          disabled={updateStatusMutation.isPending}
          onClick={() => updateStatusMutation.mutate({ status: "cancelled" })}
        >
          <XCircle className="h-4 w-4" /> Cancel Order
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-medium gap-1.5 shrink-0 border-destructive/30 hover:bg-destructive/10 text-destructive bg-transparent"
          onClick={() => setIsModalOpen(true)}
        >
          <HelpCircle className="h-4 w-4" /> Request Cancellation
        </Button>
      )}

      {/* CANCELLATION EXPLANATION BOX TEXT DIALOG MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black tracking-tight">Specify Cancellation Reason</DialogTitle>
            <DialogDescription className="text-xs leading-normal pt-1">
              Please tell the shop owner why you need to cancel this order. They will view your explanation inside their live order tracker lines to approve the change.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="e.g., Changed my mind / Selected wrong pickup storefront location..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="text-xs rounded-xl min-h-[90px] focus-visible:ring-destructive"
              maxLength={250}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" className="text-xs rounded-xl h-9" onClick={() => setIsModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              className="text-xs rounded-xl h-9 font-semibold px-4"
              disabled={!reasonText.trim() || updateStatusMutation.isPending}
              onClick={() => updateStatusMutation.mutate({ status: "cancel_requested", reason: reasonText.trim() })}
            >
              {updateStatusMutation.isPending ? "Submitting..." : "Send Request Line"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 