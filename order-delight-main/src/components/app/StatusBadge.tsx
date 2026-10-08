import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/api";

const map: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning border-warning/30" },
  confirmed: { label: "Confirmed", className: "bg-primary/15 text-primary border-primary/30" },
  preparing: { label: "Preparing", className: "bg-primary/15 text-primary border-primary/30" },
  ready: { label: "Ready", className: "bg-success/15 text-success border-success/30" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function StatusBadge({ status }: { status: OrderStatus | string }) {
  const m = map[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={m.className}>
      {m.label}
    </Badge>
  );
}
