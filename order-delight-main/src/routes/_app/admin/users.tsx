import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search, UserPlus, ShieldCheck, Users, ChevronLeft, ChevronRight, Key } from "lucide-react";
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
  admin: "bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_12px_-3px_rgba(245,158,11,0.2)]",
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
        <Button size="sm" className="gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black rounded-xl border border-amber-400/20 shadow-md">
          <UserPlus className="h-4 w-4" /> Add User Account
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-amber-500/20 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-400" /> Provision New Identity Profile
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {(["name", "phone", "email", "password"] as const).map((f) => (
            <div key={f} className="space-y-1.5">
              <Label className="capitalize text-xs font-semibold text-muted-foreground">{f}{f === "email" ? " (optional)" : ""}</Label>
              <Input
                type={f === "password" ? "password" : f === "email" ? "email" : "text"}
                value={form[f]}
                onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                placeholder={f === "phone" ? "10-digit number" : undefined}
                className="rounded-xl focus-visible:ring-amber-500/40 focus-visible:border-amber-500/50"
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Clearance Role Assignment</Label>
            <Select value={form.role} onValueChange={(v) => setForm((p: any) => ({ ...p, role: v }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="customer">Customer (Standard End-User)</SelectItem>
                <SelectItem value="shop_owner">Shop Owner (Merchant Level)</SelectItem>
                <SelectItem value="admin">Admin (System Authority)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl text-xs" onClick={() => setOpen(false)}>Abort</Button>
          <Button 
            className="rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400"
            onClick={() => create.mutate()} 
            disabled={create.isPending || !form.name || !form.phone || !form.password}
          >
            {create.isPending ? "Provisioning..." : "Commit Credentials"}
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
    mutationFn: (role: string) => (adminApi as any).changeUserRole(u.id, { role }),
    onSuccess: () => { 
      toast.success("Role updated"); 
      setRoleOpen(false); 
      onMutated(); 
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Card className="border-border/40 hover:border-amber-500/30 bg-card/40 backdrop-blur-sm transition-all duration-300 group shadow-sm text-left">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black uppercase border border-border/60 text-muted-foreground tracking-wider group-hover:border-amber-500/20 group-hover:bg-amber-500/5 group-hover:text-amber-500 transition-colors">
          {u.name.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-bold text-sm tracking-tight text-foreground truncate max-w-[180px] sm:max-w-none">{u.name}</p>
            {u.role === "admin" && <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-pulse" />}
            
            {/* 🚀 HIGH UTILITY: Interactive Click-to-Copy User UID Badge Container */}
            <span 
              onClick={(e) => {
                e.stopPropagation(); 
                navigator.clipboard.writeText(u.id);
                toast.success(`Copied UID for ${u.name}!`);
              }}
              className="inline-flex items-center gap-1 font-mono text-[10px] bg-muted hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30 text-foreground/80 px-2 py-0.5 rounded-md border border-border/60 transition-all cursor-pointer select-all shadow-sm shrink-0"
              title="Click to copy raw Customer UID string"
            >
              <Key className="h-2.5 w-2.5 text-muted-foreground/70 group-hover:text-amber-400" />
              <span>UID: {u.id.slice(0, 8)}...</span>
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground mt-0.5 font-medium">{u.email ?? "no email"} · {u.phone}</p>
        </div>
        <span className="text-xs text-muted-foreground font-mono hidden sm:block">{formatDate(u.created_at)}</span>

        {/* Role badge — click to change */}
        <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
          <DialogTrigger asChild>
            <button className={`rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase transition-all hover:opacity-80 active:scale-95 ${ROLE_COLORS[u.role] ?? ""}`}>
              {u.role.replace("_", " ")}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-xs rounded-2xl border-border/60">
            <DialogHeader><DialogTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">Modify Privilege Ring</DialogTitle></DialogHeader>
            <div className="space-y-2 py-1">
              {["customer", "shop_owner", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => changeRole.mutate(r)}
                  disabled={r === u.role || changeRole.isPending}
                  className={`w-full rounded-xl border p-2.5 text-left text-xs font-bold uppercase tracking-wider transition-colors hover:bg-muted ${r === u.role ? "opacity-40 cursor-not-allowed border-amber-500/20 bg-amber-500/5 text-amber-500" : "cursor-pointer"}`}
                >
                  {r.replace("_", " ")}
                  {r === u.role && " (Active Ring)"}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Switch
          checked={u.is_active}
          onCheckedChange={(v) => setActive.mutate(v)}
          disabled={setActive.isPending}
          title={u.is_active ? "Revoke Access Profile" : "Grant Access Profile"}
          className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-600"
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
      
      {/* 🚀 ELITE VIEW UPGRADE: High-Authority Core Terminal Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 text-left border-b border-amber-500/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Central Identity Registry
            </h1>
            <Badge variant="outline" className="font-mono text-[10px] bg-red-500/10 text-red-400 border-red-500/20 px-2 py-0.5 rounded-md uppercase tracking-widest font-black shadow-[0_0_12px_-3px_rgba(239,68,68,0.2)] animate-pulse">
              Root Authority Level 3
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Secure system operator terminal context initialized. Auditing all live cryptographic account records.
          </p>
        </div>
        <CreateUserDialog onCreated={invalidate} />
      </div>

      {/* Count cards with Embedded Clearance Session Alert Banner */}
      {counts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          
          {/* 🚀 GLOWING AUTHORITY HEADER DECORATION BAR */}
          <div className="col-span-2 sm:col-span-4 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent px-4 py-3 text-[11px] font-mono tracking-wider text-amber-400 uppercase shadow-[0_0_20px_-6px_rgba(245,158,11,0.15)]">
            <ShieldCheck className="h-4 w-4 text-amber-400 animate-spin [animation-duration:5s]" />
            <span>Operator Privilege Scope: Universal System Overwrites Enabled</span>
          </div>

          {[
            { label: "Total Accounts Indexed", value: counts.total, icon: Users },
            { label: "Administrative Core", value: counts.by_role.admin ?? 0, icon: ShieldCheck },
            { label: "Merchant Proprietors", value: counts.by_role.shop_owner ?? 0, icon: Users },
            { label: "Verified Consumers", value: counts.by_role.customer ?? 0, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-border/40 text-left bg-card/30">
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className="h-4 w-4 text-muted-foreground/70" />
                <div>
                  <p className="text-xl font-black tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground/80 font-medium">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters & Control Parameters Row */}
      <div className="flex flex-wrap gap-3">
        <form
          className="relative flex-1 min-w-48"
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            className="pl-9 rounded-xl border-border/60 focus-visible:ring-amber-500/30 focus-visible:border-amber-500/40"
            placeholder="Search matching signatures by name, email, or registry metrics..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        <Select value={role} onValueChange={(v: any) => { setRole(v); setPage(1); }}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Global Database</SelectItem>
            <SelectItem value="customer">Role: Customer</SelectItem>
            <SelectItem value="shop_owner">Role: Shop Owner</SelectItem>
            <SelectItem value="admin">Role: Admin</SelectItem>
          </SelectContent>
        </Select>
        {search && (
          <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
            Reset Query
          </Button>
        )}
      </div>

      {/* Identity Profile Stack List */}
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
            <Card className="border-dashed border-border/60 rounded-2xl">
              <CardContent className="py-12 text-center text-muted-foreground text-sm font-medium">
                No matching user signatures isolated inside current cluster segment.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" className="h-8 rounded-xl" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 py-2 text-xs font-mono font-bold bg-muted/40 border rounded-xl">PAGE {page}</span>
        <Button variant="outline" size="sm" className="h-8 rounded-xl" disabled={!data || data.length < 20} onClick={() => setPage((p) => p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}