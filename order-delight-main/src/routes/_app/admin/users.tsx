import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search, UserPlus, ShieldCheck, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi, ApiError, type UserOut, type Role } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/users")({ component: AdminUsers });

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  shop_owner: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  customer: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", role: "customer" as Role });
  const create = useMutation({
    mutationFn: () => adminApi.createUser({ ...form, email: form.email || undefined }),
    onSuccess: () => {
      toast.success("User created successfully");
      setOpen(false);
      setForm({ name: "", phone: "", email: "", password: "", role: "customer" });
      onCreated();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to create user"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><UserPlus className="h-4 w-4" /> Add user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create new user</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {(["name", "phone", "email", "password"] as const).map((f) => (
            <div key={f} className="space-y-1.5">
              <Label className="capitalize">{f}{f === "email" ? " (optional)" : ""}</Label>
              <Input
                type={f === "password" ? "password" : f === "email" ? "email" : "text"}
                value={form[f]}
                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                placeholder={f === "phone" ? "10-digit number" : undefined}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm((p: any) => ({ ...p, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="shop_owner">Shop Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name || !form.phone || !form.password}>
            {create.isPending ? "Creating…" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserRow({ u, onMutated }: { u: UserOut; onMutated: () => void }) {
  const [roleOpen, setRoleOpen] = useState(false);
  const setActive = useMutation({
    mutationFn: (v: boolean) => adminApi.setUserActive(u.id, { is_active: v }),
    onSuccess: () => { toast.success("Updated"); onMutated(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });
  const changeRole = useMutation({
    // FIXED: Cast adminApi to any, and pass role as an object (or just forward it safely)
    mutationFn: (role: string) => (adminApi as any).changeUserRole(u.id, { role }),
    onSuccess: () => { 
      toast.success("Role updated"); 
      setRoleOpen(false); 
      onMutated(); 
    },
    // FIXED: Use standard Error to prevent ApiError import mismatches
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Card className="border-border/50 hover:border-border transition-colors">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase">
          {u.name.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{u.name}</p>
            {u.role === "admin" && <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />}
          </div>
          <p className="truncate text-xs text-muted-foreground">{u.email ?? "no email"} · {u.phone}</p>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:block">{formatDate(u.created_at)}</span>

        {/* Role badge — click to change */}
        <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
          <DialogTrigger asChild>
            <button className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-70 ${ROLE_COLORS[u.role] ?? ""}`}>
              {u.role.replace("_", " ")}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader><DialogTitle>Change role for {u.name}</DialogTitle></DialogHeader>
            <div className="space-y-2 py-2">
              {["customer", "shop_owner", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => changeRole.mutate(r)}
                  disabled={r === u.role || changeRole.isPending}
                  className={`w-full rounded-lg border p-2.5 text-left text-sm capitalize transition-colors hover:bg-muted ${r === u.role ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {r.replace("_", " ")}
                  {r === u.role && " (current)"}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Switch
          checked={u.is_active}
          onCheckedChange={(v) => setActive.mutate(v)}
          disabled={setActive.isPending}
          title={u.is_active ? "Deactivate" : "Activate"}
        />
      </CardContent>
    </Card>
  );
}

function AdminUsers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<Role | "all">("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, role, search],
    queryFn: () => {
      const params: Parameters<typeof adminApi.listUsers>[0] = { page, page_size: 20 };
      if (role !== "all") params.role = role;
      if (search) params.search = search;
      return adminApi.listUsers(params);
    },
    staleTime: 0,
  });

  const { data: counts } = useQuery({
    queryKey: ["admin", "users", "count"],
    queryFn: () => adminApi.countUsers(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {counts ? `${counts.total} total · ${counts.active} active` : "Manage platform users"}
          </p>
        </div>
        <CreateUserDialog onCreated={invalidate} />
      </div>

      {/* Count cards */}
      {counts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: counts.total, icon: Users },
            { label: "Admins", value: counts.by_role.admin ?? 0, icon: ShieldCheck },
            { label: "Owners", value: counts.by_role.shop_owner ?? 0, icon: Users },
            { label: "Customers", value: counts.by_role.customer ?? 0, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form
          className="relative flex-1 min-w-48"
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, email, phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        <Select value={role} onValueChange={(v: any) => { setRole(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="shop_owner">Shop owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((u) => (
            <UserRow key={u.id} u={u} onMutated={invalidate} />
          ))}
          {data?.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                No users found.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 py-2 text-sm font-medium">Page {page}</span>
        <Button variant="outline" size="sm" disabled={!data || data.length < 20} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
