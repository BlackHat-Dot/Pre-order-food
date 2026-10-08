import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search, UserPlus, ShieldCheck, Users, ChevronLeft, ChevronRight, Key } from "lucide-react";
import { adminApi, ApiError, type UserOut, type Role } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
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
  admin: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  shop_owner: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  customer: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
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
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-xl">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {(["name", "phone", "email", "password"] as const).map((f) => (
            <div key={f} className="space-y-1.5">
              <Label className="capitalize text-xs">{f}{f === "email" ? " (optional)" : ""}</Label>
              <Input
                type={f === "password" ? "password" : f === "email" ? "email" : "text"}
                value={form[f]}
                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                placeholder={f === "phone" ? "10-digit number" : undefined}
                className="rounded-lg"
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm((p: any) => ({ ...p, role: v }))}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="shop_owner">Shop Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-lg" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            className="rounded-lg"
            onClick={() => create.mutate()} 
            disabled={create.isPending || !form.name || !form.phone || !form.password}
          >
            {create.isPending ? "Creating..." : "Create User"}
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
    onSuccess: () => { toast.success("Status updated"); onMutated(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong"),
  });

  const changeRole = useMutation({
    mutationFn: (role: string) => (adminApi as any).changeUserRole(u.id, { role }),
    onSuccess: () => { 
      toast.success("Role updated"); 
      setRoleOpen(false); 
      onMutated(); 
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong"),
  });

  return (
    <Card className="border-border/60 hover:border-border transition-colors shadow-sm text-left">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase border">
          {u.name.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-sm text-foreground truncate max-w-[180px] sm:max-w-none">{u.name}</p>
            {u.role === "admin" && <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
            
            <span 
              onClick={(e) => {
                e.stopPropagation(); 
                navigator.clipboard.writeText(u.id);
                toast.success("User UID copied!");
              }}
              className="inline-flex items-center gap-1 font-mono text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-0.5 rounded border border-border/80 transition-colors cursor-pointer select-all shadow-sm"
              title="Click to copy full UID"
            >
              <Key className="h-2.5 w-2.5" />
              <span>UID: {u.id.slice(0, 8)}...</span>
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground mt-0.5">{u.email ?? "No email"} · {u.phone}</p>
        </div>
        <span className="text-xs text-muted-foreground font-mono hidden sm:block">{formatDate(u.created_at)}</span>

        <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
          <DialogTrigger asChild>
            <button className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:opacity-80 active:scale-95 ${ROLE_COLORS[u.role] ?? ""}`}>
              {u.role.replace("_", " ")}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-xs rounded-xl">
            <DialogHeader><DialogTitle className="text-sm font-bold text-muted-foreground">Change User Role</DialogTitle></DialogHeader>
            <div className="space-y-1.5 py-1">
              {["customer", "shop_owner", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => changeRole.mutate(r)}
                  disabled={r === u.role || changeRole.isPending}
                  className={`w-full rounded-lg border p-2 text-left text-xs font-semibold capitalize transition-colors hover:bg-muted ${r === u.role ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {r.replace("_", " ")} {r === u.role && "(Current)"}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Switch
          checked={u.is_active}
          onCheckedChange={(v) => setActive.mutate(v)}
          disabled={setActive.isPending}
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
      
      <div className="flex flex-wrap items-center justify-between gap-4 text-left border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Users Panel <Badge variant="secondary" className="font-mono text-[10px]">Admin</Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {counts ? `${counts.total} total · ${counts.active} active users on the platform` : "Manage platform users"}
          </p>
        </div>
        <CreateUserDialog onCreated={invalidate} />
      </div>

      {counts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Users", value: counts.total, icon: Users },
            { label: "Admins", value: counts.by_role.admin ?? 0, icon: ShieldCheck },
            { label: "Shop Owners", value: counts.by_role.shop_owner ?? 0, icon: Users },
            { label: "Customers", value: counts.by_role.customer ?? 0, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border/60 text-left bg-card/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className="h-4 w-4 text-muted-foreground/70" />
                <div>
                  <p className="text-lg font-bold tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <form
          className="relative flex-1 min-w-48"
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            className="pl-9 rounded-xl border-border/60"
            placeholder="Search by name, email, or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        <Select value={role} onValueChange={(v: any) => { setRole(v); setPage(1); }}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="shop_owner">Shop Owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        {search && (
          <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
            Clear Search
          </Button>
        )}
      </div>

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
            <Card className="border-dashed border-border/60 rounded-xl">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No users found matching the filter criteria.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 py-1.5 text-xs font-mono font-bold bg-muted border rounded-lg">Page {page}</span>
        <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={!data || data.length < 20} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}