import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Phone, ChevronDown } from "lucide-react";
import { ApiError, otpApi, usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CountryPhoneInput,
  Msg91Widget,
  DEFAULT_COUNTRY,
  COUNTRIES,
  buildE164,
  isPhoneValid,
  type Country,
} from "@/components/phone";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function unwrapApiPayload(detail: unknown): Record<string, unknown> | null {
  if (!detail || typeof detail !== "object") return null;
  const o = detail as Record<string, unknown>;
  const inner = o.detail;
  if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  return o;
}

/** Guess the Country from an E.164 or legacy 10-digit phone stored in DB. */
function guessCountryFromPhone(phone: string | null | undefined): Country {
  if (!phone) return DEFAULT_COUNTRY;
  const normalized = phone.startsWith("+") ? phone : `+${phone}`;
  // Try to match dial code prefix (longest match first)
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (normalized.startsWith(c.dialCode)) return c;
  }
  return DEFAULT_COUNTRY;
}

function localNumberFromE164(phone: string | null | undefined, dialCode: string): string {
  if (!phone) return "";
  const normalized = phone.startsWith("+") ? phone : `+${phone}`;
  const dialDigits = dialCode.replace(/\D/g, "");
  if (normalized.startsWith(`+${dialDigits}`)) {
    return normalized.slice(1 + dialDigits.length);
  }
  // Legacy 10-digit — return as-is
  return phone.replace(/\D/g, "");
}

function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
  });

  // ── Email OTP state ────────────────────────────────────────────────────────
  const [emailOtp, setEmailOtp] = useState("");
  const [emailSecondsLeft, setEmailSecondsLeft] = useState(0);
  const [emailVerificationToken, setEmailVerificationToken] = useState<string | null>(null);
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const sendEmailGuard = useRef(false);
  const verifyEmailGuard = useRef(false);

  // ── Phone change state ─────────────────────────────────────────────────────
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const currentCountry = guessCountryFromPhone(user?.phone);
  const [newCountry, setNewCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [newLocalNumber, setNewLocalNumber] = useState("");
  const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null);
  const [verifiedNewPhone, setVerifiedNewPhone] = useState<string | null>(null);
  const [phoneCurrentPassword, setPhoneCurrentPassword] = useState("");

  // ── Password change state ──────────────────────────────────────────────────
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.name ?? "", email: user.email ?? "" });
    setEmailOtp("");
    setEmailVerificationToken(null);
    setEmailSecondsLeft(0);
  }, [user?.id, user?.name, user?.email, user?.phone]);

  useEffect(() => {
    if (emailSecondsLeft <= 0) return;
    const id = window.setInterval(() => setEmailSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [emailSecondsLeft]);

  // ── Save profile (name + email) ────────────────────────────────────────────
  const requiresEmailProof = !!form.email.trim() && form.email.trim() !== (user?.email ?? "").trim();
  const canResendEmail = emailSecondsLeft <= 0 && !sendingEmailOtp;
  const mm = String(Math.floor(emailSecondsLeft / 60)).padStart(2, "0");
  const ss = String(emailSecondsLeft % 60).padStart(2, "0");

  const updateProfile = useMutation({
    mutationFn: () => {
      const emailTrim = form.email.trim();
      const emailPayload = emailTrim.length ? emailTrim : null;
      const requiresProof = !!emailPayload && emailTrim !== (user?.email ?? "").trim();
      return usersApi.updateProfile({
        name: form.name,
        email: emailPayload,
        ...(requiresProof ? { email_verification_token: emailVerificationToken } : {}),
      });
    },
    onSuccess: async () => {
      toast.success("Profile updated");
      setEmailVerificationToken(null);
      setEmailOtp("");
      setEmailSecondsLeft(0);
      await refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update profile"),
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

  async function sendEmailOtp() {
    const nextEmail = form.email.trim();
    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      toast.error("Enter a valid email address first.");
      return;
    }
    if (!requiresEmailProof) { toast.error("Email is unchanged."); return; }
    if (sendEmailGuard.current || sendingEmailOtp) return;
    sendEmailGuard.current = true;
    setSendingEmailOtp(true);
    try {
      const res = await otpApi.sendOtp({ channel: "email", purpose: "profile_email", email: nextEmail });
      if (!res.ok) { toast.error(res.message || "Could not send OTP"); applyEmailOtpMeta(res as unknown as Record<string, unknown>); return; }
      toast.success("Email verification code sent — check your inbox.");
      applyEmailOtpMeta(res as unknown as Record<string, unknown>);
      setEmailVerificationToken(null);
      setEmailOtp("");
    } catch (err) {
      if (err instanceof ApiError) { const inner = unwrapApiPayload(err.detail); toast.error(err.message || "Could not send OTP"); applyEmailOtpMeta(inner); }
      else { toast.error("Network error. Is the API running?"); }
    } finally { setSendingEmailOtp(false); sendEmailGuard.current = false; }
  }

  async function verifyEmailOtp() {
    const nextEmail = form.email.trim();
    if (!/^\d{6}$/.test(emailOtp)) { toast.error("Enter the 6-digit OTP."); return; }
    if (verifyEmailGuard.current || verifyingEmailOtp) return;
    verifyEmailGuard.current = true;
    setVerifyingEmailOtp(true);
    try {
      const res = await otpApi.verifyOtp({ channel: "email", purpose: "profile_email", email: nextEmail, code: emailOtp });
      if (!res.ok || !res.verification_token) { toast.error(res.message || "Invalid OTP"); return; }
      setEmailVerificationToken(res.verification_token);
      setEmailSecondsLeft(0);
      toast.success("Email verified — save your profile to apply the change.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Verification failed");
    } finally { setVerifyingEmailOtp(false); verifyEmailGuard.current = false; }
  }

  // ── Phone change ───────────────────────────────────────────────────────────
  const newFullPhone = buildE164(newCountry.dialCode, newLocalNumber);
  const newPhoneReady = isPhoneValid(newCountry, newLocalNumber);
  const newPhoneVerified = !!phoneVerificationToken && !!verifiedNewPhone;

  function resetPhoneForm() {
    setNewLocalNumber("");
    setNewCountry(DEFAULT_COUNTRY);
    setPhoneVerificationToken(null);
    setVerifiedNewPhone(null);
    setPhoneCurrentPassword("");
    setShowPhoneForm(false);
  }

  const updatePhone = useMutation({
    mutationFn: () => {
      if (!verifiedNewPhone || !phoneVerificationToken) {
        throw new ApiError(400, "Verify your new phone number first.");
      }
      if (!phoneCurrentPassword) {
        throw new ApiError(400, "Enter your current password to confirm the phone change.");
      }
      return usersApi.updateProfile({
        phone: verifiedNewPhone,
        phone_verification_token: phoneVerificationToken,
        current_password: phoneCurrentPassword,
      });
    },
    onSuccess: async () => {
      toast.success("Phone number updated successfully.");
      resetPhoneForm();
      await refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update phone number"),
  });

  // ── Password change ────────────────────────────────────────────────────────
  const updatePwd = useMutation({
    mutationFn: () => {
      if (!pwd.current_password || !pwd.new_password) throw new ApiError(400, "Please fill in both password fields.");
      return usersApi.updatePassword(pwd);
    },
    onSuccess: () => {
      toast.success("Password updated");
      setPwd({ current_password: "", new_password: "" });
      setShowPwdForm(false);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update password"),
  });

  const emailVerifiedUi = user?.email_verified && !requiresEmailProof && !!form.email.trim();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account details.</p>
      </div>

      {/* ── Personal info ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Personal info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Email */}
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
                disabled={sendingEmailOtp || !canResendEmail || !requiresEmailProof || !!emailVerificationToken || !form.email.trim()}
                onClick={() => void sendEmailOtp()}
              >
                {emailVerificationToken ? "Verified" : sendingEmailOtp ? "Sending…" : emailSecondsLeft > 0 ? "Wait" : "Verify email"}
              </Button>
            </div>
            {user?.email ? (
              <p className="text-xs text-muted-foreground">
                Email status: <span className="font-medium">{user.email_verified ? "verified" : "not verified"}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Add an email to make your account safer.</p>
            )}
            {emailSecondsLeft > 0 && !emailVerificationToken && requiresEmailProof && (
              <p className="text-xs text-muted-foreground">
                Resend available in <span className="font-mono">{mm}:{ss}</span>
              </p>
            )}
            {requiresEmailProof && !emailVerificationToken && (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="email-otp">6-digit verification code</Label>
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
                  {verifyingEmailOtp ? "Checking…" : "Submit code"}
                </Button>
              </div>
            )}
            {emailVerifiedUi && (
              <p className="text-xs text-emerald-600">Email matches your verified address.</p>
            )}
          </div>

          <Button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending || (requiresEmailProof && !emailVerificationToken)}
          >
            {updateProfile.isPending ? "Saving…" : "Save changes"}
          </Button>
          {requiresEmailProof && !emailVerificationToken && (
            <p className="text-xs text-muted-foreground">Verify your new email before saving.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Phone number ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone number
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current phone */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{user?.phone || "—"}</p>
              <p className="text-xs text-muted-foreground">Current phone number</p>
            </div>
            {user?.phone_verified ? (
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified
              </div>
            ) : (
              <span className="text-xs text-amber-600">Not verified</span>
            )}
          </div>

          {/* Toggle change form */}
          {!showPhoneForm ? (
            <Button
              variant="outline"
              onClick={() => setShowPhoneForm(true)}
              className="gap-2"
            >
              <ChevronDown className="h-4 w-4" />
              Change phone number
            </Button>
          ) : (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">New phone number</p>
              <p className="text-xs text-muted-foreground">
                We'll verify your new number via OTP. You'll also need to confirm with your current password.
              </p>

              {/* New phone input */}
              <div className="space-y-2">
                <Label>New number</Label>
                <div className="relative">
                  <CountryPhoneInput
                    country={newCountry}
                    localNumber={newLocalNumber}
                    onCountryChange={(c) => {
                      setNewCountry(c);
                      setPhoneVerificationToken(null);
                      setVerifiedNewPhone(null);
                    }}
                    onLocalNumberChange={(n) => {
                      setNewLocalNumber(n);
                      setPhoneVerificationToken(null);
                      setVerifiedNewPhone(null);
                    }}
                    disabled={newPhoneVerified}
                  />
                </div>
              </div>

              {/* MSG91 widget */}
              <div className="space-y-2">
                <Label>Verification</Label>
                <Msg91Widget
                  phone={newFullPhone}
                  purpose="profile_phone"
                  onVerified={(token, phone) => {
                    setPhoneVerificationToken(token);
                    setVerifiedNewPhone(phone);
                    toast.success("New phone verified!");
                  }}
                  disabled={!newPhoneReady}
                  isVerified={newPhoneVerified}
                />
              </div>

              {/* Current password */}
              {newPhoneVerified && (
                <div className="space-y-2">
                  <Label htmlFor="phone-pwd">Current password</Label>
                  <Input
                    id="phone-pwd"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Confirm with your password"
                    value={phoneCurrentPassword}
                    onChange={(e) => setPhoneCurrentPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required to confirm sensitive account changes.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => updatePhone.mutate()}
                  disabled={
                    updatePhone.isPending ||
                    !newPhoneVerified ||
                    !phoneCurrentPassword
                  }
                >
                  {updatePhone.isPending ? "Saving…" : "Save new phone"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={resetPhoneForm}
                  disabled={updatePhone.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Change password ────────────────────────────────────────────────── */}
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
