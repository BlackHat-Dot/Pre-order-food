import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck,
  Phone,
  ChevronDown,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

function guessCountryFromPhone(phone: string | null | undefined): Country {
  if (!phone) return DEFAULT_COUNTRY;
  const normalized = phone.startsWith("+") ? phone : `+${phone}`;
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (normalized.startsWith(c.dialCode)) return c;
  }
  return DEFAULT_COUNTRY;
}

function useCountdown(seconds: number): [number, (s: number) => void] {
  const [left, setLeft] = useState(seconds);
  const [target, setTarget] = useState(seconds);
  const id = useRef<ReturnType<typeof setInterval> | null>(null);

  function restart(s: number) {
    setTarget(s);
    setLeft(s);
  }

  useEffect(() => {
    if (target <= 0) return;
    if (id.current) clearInterval(id.current);
    id.current = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => { if (id.current) clearInterval(id.current!); };
  }, [target]);

  return [left, restart];
}

function fmt(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ── Main Component ─────────────────────────────────────────────────────────────

function ProfilePage() {
  const { user, refresh } = useAuth();

  // ── Name ───────────────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  useEffect(() => { setName(user?.name ?? ""); }, [user?.name]);

  // ── Email verification state machine ──────────────────────────────────────
  const [emailInput, setEmailInput] = useState(user?.email ?? "");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailToken, setEmailToken] = useState<string | null>(null); // proof JWT after OTP verified
  const [emailStep, setEmailStep] = useState<"idle" | "sent" | "verified">("idle");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [cooldownSecs, startCooldown] = useCountdown(0);
  // Password required when changing a verified email
  const [emailCurrentPwd, setEmailCurrentPwd] = useState("");

  useEffect(() => {
    setEmailInput(user?.email ?? "");
    setEmailStep("idle");
    setEmailToken(null);
    setEmailOtp("");
    setOtpError(null);
    setEmailCurrentPwd("");
  }, [user?.id, user?.email]);

  const savedEmail = (user?.email ?? "").toLowerCase();
  const emailChanged = emailInput.trim().toLowerCase() !== savedEmail && emailInput.trim() !== "";
  const emailValid = isValidEmail(emailInput);
  // Require password when changing an already-verified email
  const needsPassword = !!(user?.email && user.email_verified && emailChanged);
  // Send/Resend button enabled: valid email, changed, not yet verified, not in cooldown, not loading
  const canSendOtp = emailValid && emailChanged && emailStep !== "verified" && !sendingOtp && cooldownSecs === 0;

  // Reset verification state when email input changes
  function handleEmailChange(val: string) {
    setEmailInput(val);
    if (emailStep !== "idle") {
      setEmailStep("idle");
      setEmailToken(null);
      setEmailOtp("");
      setOtpError(null);
    }
  }

  async function sendEmailOtp() {
    if (!canSendOtp) return;
    setSendingOtp(true);
    setOtpError(null);
    try {
      const res = await otpApi.sendOtp({
        channel: "email",
        purpose: "profile_email",
        email: emailInput.trim(),
      });
      if (typeof res.resend_in_seconds === "number" && res.resend_in_seconds > 0) {
        startCooldown(res.resend_in_seconds);
      }
      setEmailStep("sent");
      toast.success("Verification code sent — check your inbox.");
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.detail as Record<string, unknown> | null;
        const secs = (detail?.resend_in_seconds ?? detail?.cooldown_seconds) as number | undefined;
        if (typeof secs === "number" && secs > 0) startCooldown(secs);
        const msg = (detail?.message as string) || err.message || "Could not send code";
        setOtpError(msg);
        toast.error(msg);
      } else {
        const msg = err instanceof Error ? err.message : "Could not send code";
        setOtpError(msg);
        toast.error(msg);
      }
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyEmailOtp() {
    if (emailOtp.length !== 6) { setOtpError("Enter the 6-digit code."); return; }
    if (verifyingOtp) return;
    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await otpApi.verifyOtp({
        channel: "email",
        purpose: "profile_email",
        email: emailInput.trim(),
        code: emailOtp,
      });
      if (!res.verification_token) throw new Error("Incorrect code. Please try again.");
      setEmailToken(res.verification_token);
      setEmailStep("verified");
      setOtpError(null);
      toast.success("Email verified — save your profile to apply the change.");
    } catch (err) {
      const msg = err instanceof ApiError
        ? ((err.detail as Record<string, unknown>)?.message as string) || err.message
        : err instanceof Error ? err.message : "Incorrect code";
      setOtpError(msg);
    } finally {
      setVerifyingOtp(false);
    }
  }

  // ── Save profile (name + email) ────────────────────────────────────────────
  const saveProfile = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { name };

      const emailTrimmed = emailInput.trim() || null;
      const emailLower = (emailTrimmed ?? "").toLowerCase();

      if (emailTrimmed && emailLower !== savedEmail) {
        if (!emailToken) throw new ApiError(400, "Verify your email before saving.");
        if (needsPassword && !emailCurrentPwd) throw new ApiError(400, "Enter your current password to change a verified email.");
        body.email = emailTrimmed;
        body.email_verification_token = emailToken;
        if (emailCurrentPwd) body.current_password = emailCurrentPwd;
      } else if (!emailTrimmed && savedEmail) {
        // Removing email
        body.email = null;
      }

      return usersApi.updateProfile(body as Parameters<typeof usersApi.updateProfile>[0]);
    },
    onSuccess: async () => {
      toast.success("Profile saved.");
      setEmailStep("idle");
      setEmailToken(null);
      setEmailOtp("");
      setEmailCurrentPwd("");
      setOtpError(null);
      await refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to save profile"),
  });

  const canSaveProfile =
    !saveProfile.isPending &&
    // Something must have changed
    (name.trim() !== (user?.name ?? "").trim() || emailStep === "verified" || (!emailChanged && emailInput.trim() !== (user?.email ?? ""))) &&
    // If email changed, it must be verified before saving
    (!emailChanged || emailStep === "verified") &&
    // If password is required (changing verified email), it must be provided
    (!needsPassword || !emailChanged || !!emailCurrentPwd);

  // ── Phone change ───────────────────────────────────────────────────────────
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [newCountry, setNewCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [newLocalNumber, setNewLocalNumber] = useState("");
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [verifiedNewPhone, setVerifiedNewPhone] = useState<string | null>(null);
  const [phonePwd, setPhonePwd] = useState("");

  const newFullPhone = buildE164(newCountry.dialCode, newLocalNumber);
  const newPhoneReady = isPhoneValid(newCountry, newLocalNumber);
  const newPhoneVerified = !!phoneToken && !!verifiedNewPhone;

  function resetPhoneForm() {
    setNewLocalNumber("");
    setNewCountry(DEFAULT_COUNTRY);
    setPhoneToken(null);
    setVerifiedNewPhone(null);
    setPhonePwd("");
    setShowPhoneForm(false);
  }

  const savePhone = useMutation({
    mutationFn: () => {
      if (!verifiedNewPhone || !phoneToken) throw new ApiError(400, "Verify your new phone number first.");
      if (!phonePwd) throw new ApiError(400, "Enter your current password to confirm the change.");
      return usersApi.updateProfile({
        phone: verifiedNewPhone,
        phone_verification_token: phoneToken,
        current_password: phonePwd,
      });
    },
    onSuccess: async () => {
      toast.success("Phone number updated.");
      resetPhoneForm();
      await refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update phone"),
  });

  // ── Password change ────────────────────────────────────────────────────────
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });

  const savePwd = useMutation({
    mutationFn: () => {
      if (!pwd.current_password || !pwd.new_password) throw new ApiError(400, "Fill in both password fields.");
      return usersApi.updatePassword(pwd);
    },
    onSuccess: () => {
      toast.success("Password updated.");
      setPwd({ current_password: "", new_password: "" });
      setShowPwdForm(false);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update password"),
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account details.</p>
      </div>

      {/* ── Personal info ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Personal info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* ── Email section ─────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="profile-email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email address
              </Label>
              {user?.email_verified && !emailChanged && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              )}
              {user?.email && !user.email_verified && !emailChanged && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
                  Not verified
                </span>
              )}
            </div>

            {/* Email input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={emailInput}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={cn(
                    emailInput && !emailValid && "border-destructive focus-visible:ring-destructive",
                    emailStep === "verified" && "border-emerald-500 focus-visible:ring-emerald-500",
                  )}
                />
                {emailStep === "verified" && (
                  <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                )}
              </div>

              {/* Send OTP / Resend button */}
              {emailChanged && emailValid && emailStep !== "verified" && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canSendOtp}
                  onClick={() => void sendEmailOtp()}
                  className="shrink-0"
                >
                  {sendingOtp ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending…</>
                  ) : cooldownSecs > 0 ? (
                    `Resend in ${fmt(cooldownSecs)}`
                  ) : emailStep === "sent" ? (
                    "Resend code"
                  ) : (
                    "Send code"
                  )}
                </Button>
              )}
            </div>

            {/* Inline validation */}
            {emailInput && !emailValid && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Enter a valid email address
              </p>
            )}

            {/* Password gate for verified email change */}
            {emailStep !== "verified" && needsPassword && emailChanged && emailValid && (
              <div className="space-y-1.5">
                <Label htmlFor="email-pwd" className="text-xs text-muted-foreground">
                  Current password required to change your verified email
                </Label>
                <Input
                  id="email-pwd"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your current password"
                  value={emailCurrentPwd}
                  onChange={(e) => setEmailCurrentPwd(e.target.value)}
                />
              </div>
            )}

            {/* OTP entry — shown after sending */}
            {emailStep === "sent" && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-medium">Enter the 6-digit code sent to <span className="text-primary">{emailInput.trim()}</span></p>
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={emailOtp}
                    onChange={(e) => {
                      setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setOtpError(null);
                    }}
                    className={cn("font-mono tracking-widest", otpError && "border-destructive")}
                  />
                  <Button
                    type="button"
                    disabled={verifyingOtp || emailOtp.length !== 6}
                    onClick={() => void verifyEmailOtp()}
                  >
                    {verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEmailStep("idle"); setEmailOtp(""); setOtpError(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {otpError && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" /> {otpError}
                  </p>
                )}
              </div>
            )}

            {/* Verified banner */}
            {emailStep === "verified" && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Email verified — save your profile to apply the change.
                {needsPassword && (
                  <div className="mt-2 w-full space-y-1.5">
                    <Label htmlFor="email-pwd-post" className="text-xs text-muted-foreground">
                      Current password to confirm
                    </Label>
                    <Input
                      id="email-pwd-post"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Your current password"
                      value={emailCurrentPwd}
                      onChange={(e) => setEmailCurrentPwd(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {!user?.email && !emailInput && (
              <p className="text-xs text-muted-foreground">
                Adding an email lets you recover your account and receive order updates.
              </p>
            )}
          </div>

          {/* Save button */}
          <Button
            onClick={() => saveProfile.mutate()}
            disabled={!canSaveProfile}
          >
            {saveProfile.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
            ) : "Save changes"}
          </Button>

          {emailChanged && emailStep === "idle" && emailValid && (
            <p className="text-xs text-muted-foreground">Send a verification code to confirm your new email before saving.</p>
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
          {/* Current phone display */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium font-mono">{user?.phone || "—"}</p>
              <p className="text-xs text-muted-foreground">Current phone number</p>
            </div>
            {user?.phone_verified ? (
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" />Verified
              </div>
            ) : (
              <span className="text-xs text-amber-600">Not verified</span>
            )}
          </div>

          {!showPhoneForm ? (
            <Button variant="outline" onClick={() => setShowPhoneForm(true)} className="gap-2">
              <ChevronDown className="h-4 w-4" />
              Change phone number
            </Button>
          ) : (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">New phone number</p>
              <p className="text-xs text-muted-foreground">
                We'll send a verification code to confirm your new number. Your current password is also required.
              </p>

              <div className="space-y-2">
                <Label>New number</Label>
                <div className="relative">
                  <CountryPhoneInput
                    country={newCountry}
                    localNumber={newLocalNumber}
                    onCountryChange={(c) => { setNewCountry(c); setPhoneToken(null); setVerifiedNewPhone(null); }}
                    onLocalNumberChange={(n) => { setNewLocalNumber(n); setPhoneToken(null); setVerifiedNewPhone(null); }}
                    disabled={newPhoneVerified}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Verification</Label>
                <Msg91Widget
                  phone={newFullPhone}
                  purpose="profile_phone"
                  onVerified={(token, phone) => { setPhoneToken(token); setVerifiedNewPhone(phone); toast.success("New phone verified!"); }}
                  disabled={!newPhoneReady}
                  isVerified={newPhoneVerified}
                />
              </div>

              {newPhoneVerified && (
                <div className="space-y-2">
                  <Label htmlFor="phone-pwd">Current password</Label>
                  <Input
                    id="phone-pwd"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Confirm with your current password"
                    value={phonePwd}
                    onChange={(e) => setPhonePwd(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Required to confirm sensitive account changes.</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => savePhone.mutate()}
                  disabled={savePhone.isPending || !newPhoneVerified || !phonePwd}
                >
                  {savePhone.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Save new phone"}
                </Button>
                <Button variant="ghost" onClick={resetPhoneForm} disabled={savePhone.isPending}>Cancel</Button>
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
            <Button variant="outline" onClick={() => setShowPwdForm(true)}>Change password</Button>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="curr-pwd">Current password</Label>
                <Input id="curr-pwd" type="password" autoComplete="current-password" value={pwd.current_password} onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pwd">New password</Label>
                <Input id="new-pwd" type="password" autoComplete="new-password" value={pwd.new_password} onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))} />
                <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => savePwd.mutate()}
                  disabled={savePwd.isPending || !pwd.current_password || !pwd.new_password}
                >
                  {savePwd.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…</> : "Update password"}
                </Button>
                <Button variant="ghost" onClick={() => { setShowPwdForm(false); setPwd({ current_password: "", new_password: "" }); }}>Cancel</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
