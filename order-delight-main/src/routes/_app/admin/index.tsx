import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/")({ component: AdminOverview });

function AdminOverview() {
  const { data } = useQuery({ queryKey: ["admin", "analytics"], queryFn: adminApi.analytics });
  const entries = Object.entries((data ?? {}) as Record<string, unknown>).filter(
    ([, v]) => typeof v === "number" || typeof v === "string",
  );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Platform analytics.</p>
      </div>
      {entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No data yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {entries.map(([k, v]) => (
            <Card key={k}>
              <CardContent className="p-5">
                <p className="text-xs capitalize text-muted-foreground">{k.replace(/_/g, " ")}</p>
                <p className="mt-1 text-2xl font-bold">
                  {typeof v === "number" && k.toLowerCase().includes("revenue")
                    ? formatCurrency(v)
                    : String(v)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
