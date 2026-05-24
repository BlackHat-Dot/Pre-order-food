import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/api";

const map: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  
  // 🟢 Clean Emerald Fills for Acceptance
  accepted: { label: "Accepted", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium" },
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium" },
  
  preparing: { label: "Preparing", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  ready: { label: "Ready", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  completed: { label: "Completed", className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20" },
  cancelled: { label: "Cancelled", className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20" },
  
  // 🔴 Minimalist Crimson Tint for Customer Disputes
  cancel_requested: { 
    label: "Cancellation Requested", 
    className: "bg-rose-500/10 text-rose-600 border-rose-500/20 font-medium" 
  },
};

export function StatusBadge({ status }: { status: OrderStatus | string }) {
  const lookupKey = status ? String(status).toLowerCase() : "pending";
  
  const m = map[lookupKey] ?? { 
    label: String(status).replace("_", " "), 
    className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20" 
  };

  return (
    <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[11px] font-medium tracking-wide shadow-none capitalize ${m.className}`}>
      {m.label}
    </Badge>
  );
}