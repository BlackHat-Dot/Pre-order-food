import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });

  const updateProfile = useMutation({
    mutationFn: () => usersApi.updateProfile(form),
    onSuccess: async () => {
      toast.success("Profile updated");
      await refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const updatePwd = useMutation({
    mutationFn: () => {
      if (!pwd.current_password || !pwd.new_password) {
        throw new ApiError(400, "Please enter both current and new password");
      }
      return usersApi.updatePassword(pwd);
    },
    onSuccess: () => {
      toast.success("Password updated");
      setPwd({ current_password: "", new_password: "" });
      setShowPwdForm(false);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPwdForm ? (
            <Button variant="outline" onClick={() => setShowPwdForm(true)}>
              Change password
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={pwd.current_password}
                  onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={pwd.new_password}
                  onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => updatePwd.mutate()}
                  disabled={updatePwd.isPending || !pwd.current_password || !pwd.new_password}
                >
                  {updatePwd.isPending ? "Updating…" : "Update password"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowPwdForm(false);
                    setPwd({ current_password: "", new_password: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
