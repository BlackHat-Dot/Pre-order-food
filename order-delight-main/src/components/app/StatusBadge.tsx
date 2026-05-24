import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/api";

const map: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30" },
  
  // 🟢 Enterprise Emerald Green theme configurations
  accepted: { label: "Accepted", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-semibold" },
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-semibold" },
  
  preparing: { label: "Preparing", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  ready: { label: "Ready", className: "bg-success/15 text-success border-success/30" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
  
  // 🔴 Polished Clean Design (Removed flashing animations completely)
  cancel_requested: { 
    label: "Cancellation Requested", 
    className: "bg-rose-500/10 text-rose-500 border-rose-500/20 font-semibold" 
  },
};

export function StatusBadge({ status }: { status: OrderStatus | string }) {
  const lookupKey = status ? String(status).toLowerCase() : "pending";
  
  const m = map[lookupKey] ?? { 
    label: String(status).replace("_", " "), 
    className: "bg-muted text-muted-foreground border-border" 
  };

  return (
    <Badge variant="outline" className={`rounded-xl text-[11px] font-medium tracking-wide shadow-none normal-case ${m.className}`}>
      {m.label}
    </Badge>
  );
}