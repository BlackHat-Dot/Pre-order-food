import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/api";

const map: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30" },
  confirmed: { label: "Confirmed", className: "bg-primary/15 text-primary border-primary/30" },
  preparing: { label: "Preparing", className: "bg-primary/15 text-primary border-primary/30" },
  ready: { label: "Ready", className: "bg-success/15 text-success border-success/30" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive border-destructive/30" },
  
  // 🚀 FIXED: Added beautiful, animated style layout mapping for the cancellation state
  cancel_requested: { 
    label: "Cancellation Requested", 
    className: "bg-rose-500/15 text-rose-500 border-rose-500/30 animate-pulse font-bold" 
  },
};

export function StatusBadge({ status }: { status: OrderStatus | string }) {
  // Normalize key lookup down to case-insulated string formats safely
  const lookupKey = status ? String(status).toLowerCase() : "pending";
  
  const m = map[lookupKey] ?? { 
    label: String(status).replace("_", " "), 
    className: "bg-muted text-muted-foreground border-border" 
  };

  return (
    <Badge variant="outline" className={`rounded-xl text-[10px] font-bold uppercase tracking-wider ${m.className}`}>
      {m.label}
    </Badge>
  );
}