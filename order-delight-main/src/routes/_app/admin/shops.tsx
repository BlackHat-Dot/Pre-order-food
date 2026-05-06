import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { adminApi, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/admin/shops")({ component: AdminShops });

function AdminShops() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "shops", page],
    queryFn: () => adminApi.listShops({ page, page_size: 20 }),
  });
  const verify = useMutation({
    mutationFn: ({ id, v }: { id: string; v: boolean }) => adminApi.verifyShop(id, { is_verified: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "shops"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });
  const active = useMutation({
    mutationFn: ({ id, v }: { id: string; v: boolean }) => adminApi.setShopActive(id, { is_active: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "shops"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Shops</h1>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{s.name}</p>
                    {s.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{s.cuisine ?? "—"} · {s.address ?? ""}</p>
                </div>
                <Badge variant={s.is_open ? "default" : "secondary"}>{s.is_open ? "Open" : "Closed"}</Badge>
                <Button
                  size="sm"
                  variant={s.is_verified ? "outline" : "default"}
                  onClick={() => verify.mutate({ id: s.id, v: !s.is_verified })}
                >
                  {s.is_verified ? "Unverify" : "Verify"}
                </Button>
                <Switch
                  checked={!!s.is_active}
                  onCheckedChange={(v) => active.mutate({ id: s.id, v })}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="flex justify-center gap-2">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
        <span className="px-3 py-2 text-sm">Page {page}</span>
        <Button variant="outline" disabled={!data || data.length < 20} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
