import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Store, ShieldCheck } from "lucide-react";
import { shopsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/owner/")({ component: OwnerHome });

function OwnerHome() {
  const { data, isLoading } = useQuery({ queryKey: ["my-shops"], queryFn: shopsApi.myShops });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My shops</h1>
          <p className="text-sm text-muted-foreground">Manage your shops and menus.</p>
        </div>
        <Link to="/owner/shops/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New shop
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data || data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Store className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">You don't have any shops yet.</p>
            <Link to="/owner/shops/new" className="mt-4">
              <Button>Create your first shop</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <Link key={s.id} to="/owner/shops/$shopId" params={{ shopId: s.id }}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{s.name}</h3>
                    {s.is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.cuisine ?? "—"}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant={s.is_open ? "default" : "secondary"}>
                      {s.is_open ? "Open" : "Closed"}
                    </Badge>
                    <Badge variant={s.is_active ? "outline" : "destructive"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
