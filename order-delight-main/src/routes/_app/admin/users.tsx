import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, role],
    queryFn: () => adminApi.listUsers({ page, page_size: 20, role: role === "all" ? undefined : role }),
  });
  const setActive = useMutation({
    mutationFn: ({ id, v }: { id: string; v: boolean }) =>
      adminApi.setUserActive(id, { is_active: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Manage platform users.</p>
        </div>
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="shop_owner">Shop owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((u) => (
            <Card key={u.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email} · {u.phone}</p>
                </div>
                <Badge variant="outline" className="capitalize">{u.role.replace("_", " ")}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(u.created_at)}</span>
                <Switch
                  checked={u.is_active}
                  onCheckedChange={(v) => setActive.mutate({ id: u.id, v })}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="flex justify-center gap-2">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
        <span className="px-3 py-2 text-sm">Page {page}</span>
        <Button
          variant="outline"
          disabled={!data || data.length < 20}
          onClick={() => setPage((p) => p + 1)}
        >Next</Button>
      </div>
    </div>
  );
}
