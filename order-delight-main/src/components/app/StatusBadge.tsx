import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/api";

const map: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30" },
  
  // 🟢 CHANGED TO EMERALD GREEN: Clean distinction from preparing/completed states
  accepted: { label: "Accepted", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold" },
  confirmed: { label: "Confirmed", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold" },
  
  preparing: { label: "Preparing", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  ready: { label: "Ready", className: "bg-success/15 text-success border-success/30" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive border-destructive/30" },
  
  // 🚨 FLASHING CRITICAL INDICATOR: Applied dynamic color blinking variables
  cancel_requested: { 
    label: "Cancellation Requested", 
    className: "bg-rose-500 text-white border-rose-600 font-black animate-pulse shadow-md" 
  },
};

export function StatusBadge({ status }: { status: OrderStatus | string }) {
  const lookupKey = status ? String(status).toLowerCase() : "pending";
  
  const m = map[lookupKey] ?? { 
    label: String(status).replace("_", " "), 
    className: "bg-muted text-muted-foreground border-border" 
  };

  return (
    <Badge variant="outline" className={`rounded-xl text-[10px] uppercase tracking-wider ${m.className}`}>
      {m.label}
    </Badge>
  );
}