import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, otpApi, usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function unwrapApiPayload(detail: unknown): Record<string, unknown> | null {
  if (!detail || typeof detail !== "object") return null;
  const o = detail as Record<string, unknown>;
  const inner = o.detail;
  if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  return o;
}

function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });

  const [emailOtp, setEmailOtp] = useState("");
  const [emailSecondsLeft, setEmailSecondsLeft] = useState(0);
  const [emailVerificationToken, setEmailVerificationToken] = useState<string | null>(null);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const sendEmailGuard = useRef(false);
  const verifyEmailGuard = useRef(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
    });
    setEmailOtp("");
    setEmailVerificationToken(null);
    setEmailSecondsLeft(0);
  }, [user?.id, user?.name, user?.email, user?.phone]);

  useEffect(() => {
    if (emailSecondsLeft <= 0) return;
    const id = window.setInterval(() => setEmailSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [emailSecondsLeft]);

  const updateProfile = useMutation({
    mutationFn: () => {
      const emailTrim = form.email.trim();
      const emailPayload = emailTrim.length ? emailTrim : null;
      const requiresEmailProof =
        !!emailPayload && emailTrim !== (user?.email ?? "").trim();
      return usersApi.updateProfile({
        name: form.name,
        phone: form.phone,
        email: emailPayload,
        ...(requiresEmailProof ? { email_verification_token: emailVerificationToken } : {}),
      });
    },
    onSuccess: async () => {
      toast.success("Profile updated");
      setEmailVerificationToken(null);
      setEmailOtp("");
      setEmailSecondsLeft(0);
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

  function applyEmailOtpMeta(payload: Record<string, unknown> | null) {
    if (!payload) return;
    const secs =
      typeof payload.resend_in_seconds === "number"
        ? payload.resend_in_seconds
        : typeof payload.expires_in_seconds === "number"
          ? payload.expires_in_seconds
          : 0;
    if (secs > 0) setEmailSecondsLeft(Math.ceil(secs));
  }

  const requiresEmailProof = !!form.email.trim() && form.email.trim() !== (user?.email ?? "").trim();
  const canResendEmail = emailSecondsLeft <= 0 && !sendingEmailOtp;
  const mm = String(Math.floor(emailSecondsLeft / 60)).padStart(2, "0");
  const ss = String(emailSecondsLeft % 60).padStart(2, "0");

  async function sendEmailOtp() {
    const nextEmail = form.email.trim();
    if (!nextEmail) {
      toast.error("Enter an email address first.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!requiresEmailProof) {
      toast.error("Email is unchanged.");
      return;
    }
    if (sendEmailGuard.current || sendingEmailOtp) return;
    sendEmailGuard.current = true;
    setSendingEmailOtp(true);
    try {
      const res = await otpApi.sendOtp({
        channel: "email",
        purpose: "profile_email",
        email: nextEmail,
      });
      if (!res.ok) {
        toast.error(res.message || "Could not send OTP");
        applyEmailOtpMeta(res as unknown as Record<string, unknown>);
        return;
      }
      toast.success("Email OTP sent — check the API terminal.");
      applyEmailOtpMeta(res as unknown as Record<string, unknown>);
      setEmailVerificationToken(null);
      setEmailOtp("");
    } catch (err) {
      if (err instanceof ApiError) {
        const inner = unwrapApiPayload(err.detail);
        toast.error(err.message || "Could not send OTP");
        applyEmailOtpMeta(inner);
      } else {
        toast.error("Network error. Is the API running?");
      }
    } finally {
      setSendingEmailOtp(false);
      sendEmailGuard.current = false;
    }
  }

  async function verifyEmailOtp() {
    const nextEmail = form.email.trim();
    if (!/^\d{6}$/.test(emailOtp)) {
      toast.error("Enter the 6-digit OTP.");
      return;
    }
    if (verifyEmailGuard.current || verifyingEmailOtp) return;
    verifyEmailGuard.current = true;
    setVerifyingEmailOtp(true);
    try {
      const res = await otpApi.verifyOtp({
        channel: "email",
        purpose: "profile_email",
        email: nextEmail,
        code: emailOtp,
      });
      if (!res.ok || !res.verification_token) {
        toast.error(res.message || "Invalid OTP");
        return;
      }
      setEmailVerificationToken(res.verification_token);
      setEmailSecondsLeft(0);
      toast.success("Email verified — you can save your profile.");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || "Verification failed");
      } else {
        toast.error("Network error. Is the API running?");
      }
    } finally {
      setVerifyingEmailOtp(false);
      verifyEmailGuard.current = false;
    }
  }

  const emailVerifiedUi = user?.email_verified && !requiresEmailProof && !!form.email.trim();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-0">
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, email: e.target.value }));
                    setEmailVerificationToken(null);
                    setEmailOtp("");
                    setEmailSecondsLeft(0);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full shrink-0 sm:w-auto"
                disabled={
                  sendingEmailOtp ||
                  !canResendEmail ||
                  !requiresEmailProof ||
                  !!emailVerificationToken ||
                  !form.email.trim()
                }
                onClick={() => void sendEmailOtp()}
              >
                {emailVerificationToken
                  ? "Verified"
                  : sendingEmailOtp
                    ? "Sending…"
                    : emailSecondsLeft > 0
                      ? "Wait"
                      : "Verify email"}
              </Button>
            </div>
            {user?.email ? (
              <p className="text-xs text-muted-foreground">
                Email status:{" "}
                <span className="font-medium">{user.email_verified ? "verified" : "not verified"}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Add an email and verify it to mark your account safer.</p>
            )}
            {emailSecondsLeft > 0 && !emailVerificationToken && requiresEmailProof ? (
              <p className="text-xs text-muted-foreground">
                Resend available in <span className="font-mono">{mm}:{ss}</span>
              </p>
            ) : null}
            {requiresEmailProof && !emailVerificationToken ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="email-otp">6-digit email OTP</Label>
                  <Input
                    id="email-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                  />
                </div>
                <Button
                  type="button"
                  disabled={verifyingEmailOtp || emailOtp.length !== 6 || !!emailVerificationToken}
                  onClick={() => void verifyEmailOtp()}
                >
                  {verifyingEmailOtp ? "Checking…" : "Submit OTP"}
                </Button>
              </div>
            ) : null}
            {emailVerifiedUi ? (
              <p className="text-xs text-emerald-600">Email matches your verified address.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <Button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending || (requiresEmailProof && !emailVerificationToken)}
          >
            {updateProfile.isPending ? "Saving…" : "Save changes"}
          </Button>
          {requiresEmailProof && !emailVerificationToken ? (
            <p className="text-xs text-muted-foreground">Verify your new email before saving.</p>
          ) : null}
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
              <div className="flex flex-wrap gap-2">
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
