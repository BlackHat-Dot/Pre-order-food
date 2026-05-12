import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Utensils } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { landingForRole } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ApiError, otpApi, type Role } from "@/lib/api";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Create account — PreOrder" }] }),
});

/** FastAPI wraps dict errors as `{ detail: { ... } }` — unwrap for timers/messages. */
function unwrapApiPayload(detail: unknown): Record<string, unknown> | null {
  if (!detail || typeof detail !== "object") return null;
  const o = detail as Record<string, unknown>;
  const inner = o.detail;
  if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  return o;
}

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "customer" as Role,
  });
  const [loading, setLoading] = useState(false);

  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const sendGuard = useRef(false);
  const verifyGuard = useRef(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  function applyOtpMeta(payload: Record<string, unknown> | null) {
    if (!payload) return;
    const secs =
      typeof payload.resend_in_seconds === "number"
        ? payload.resend_in_seconds
        : typeof payload.expires_in_seconds === "number"
          ? payload.expires_in_seconds
          : 0;
    if (secs > 0) setSecondsLeft(Math.ceil(secs));
  }

  async function sendPhoneOtp() {
    if (!/^\d{10}$/.test(form.phone.trim())) {
      toast.error("Enter a valid 10-digit phone number first.");
      return;
    }
    if (sendGuard.current || sendingOtp) return;
    sendGuard.current = true;
    setSendingOtp(true);
    try {
      const res = await otpApi.sendOtp({
        channel: "phone",
        purpose: "signup_phone",
        phone: form.phone.trim(),
      });
      if (!res.ok) {
        toast.error(res.message || "Could not send OTP");
        applyOtpMeta(res as unknown as Record<string, unknown>);
        return;
      }
      toast.success("OTP sent — check the API terminal for the code.");
      applyOtpMeta(res as unknown as Record<string, unknown>);
      setPhoneVerified(false);
      setPhoneVerificationToken(null);
      setOtpCode("");
    } catch (err) {
      if (err instanceof ApiError) {
        const inner = unwrapApiPayload(err.detail);
        toast.error(err.message || "Could not send OTP");
        applyOtpMeta(inner);
      } else {
        toast.error("Network error. Is the API running?");
      }
    } finally {
      setSendingOtp(false);
      sendGuard.current = false;
    }
  }

  async function verifyPhoneOtp() {
    if (!/^\d{6}$/.test(otpCode)) {
      toast.error("Enter the 6-digit OTP.");
      return;
    }
    if (verifyGuard.current || verifyingOtp) return;
    verifyGuard.current = true;
    setVerifyingOtp(true);
    try {
      const res = await otpApi.verifyOtp({
        channel: "phone",
        purpose: "signup_phone",
        phone: form.phone.trim(),
        code: otpCode,
      });
      if (!res.ok || !res.verification_token) {
        toast.error(res.message || "Invalid OTP");
        return;
      }
      setPhoneVerificationToken(res.verification_token);
      setPhoneVerified(true);
      setSecondsLeft(0);
      toast.success("Phone verified");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || "Verification failed");
      } else {
        toast.error("Network error. Is the API running?");
      }
    } finally {
      setVerifyingOtp(false);
      verifyGuard.current = false;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim(),
      password: form.password,
    };

    if (!/^\d{10}$/.test(payload.phone)) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }
    if (!phoneVerified || !phoneVerificationToken) {
      toast.error("Verify your phone number before creating an account.");
      return;
    }

    setLoading(true);
    try {
      const me = await register({
        ...payload,
        phone_verification_token: phoneVerificationToken,
      });
      toast.success(`Welcome, ${me.name.split(" ")[0]}`);
      navigate({ to: landingForRole(me.role) });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else if (err instanceof Error && err.message) {
        toast.error(err.message);
      } else {
        toast.error("Sign up failed");
      }
    } finally {
      setLoading(false);
    }
  }

  const canResend = secondsLeft <= 0 && !sendingOtp;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <span
            className="grid h-9 w-9 place-items-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Utensils className="h-4 w-4" />
          </span>
          PreOrder
        </Link>
        <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Start ordering or sell on PreOrder.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                />
                <p className="text-xs text-muted-foreground">You can verify email later in your profile.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => {
                        set("phone", e.target.value.replace(/\D/g, "").slice(0, 10));
                        setPhoneVerified(false);
                        setPhoneVerificationToken(null);
                        setOtpCode("");
                        setSecondsLeft(0);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={sendingOtp || !canResend || phoneVerified}
                    onClick={() => void sendPhoneOtp()}
                  >
                    {phoneVerified ? "Verified" : sendingOtp ? "Sending…" : secondsLeft > 0 ? "Wait" : "Verify"}
                  </Button>
                </div>
                {secondsLeft > 0 && !phoneVerified ? (
                  <p className="text-xs text-muted-foreground">
                    Resend available in <span className="font-mono">{mm}:{ss}</span>
                  </p>
                ) : null}
                {phoneVerified ? (
                  <p className="text-xs text-emerald-600">Phone verified — you can finish the form.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="otp">6-digit OTP (from API terminal)</Label>
                      <Input
                        id="otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                      />
                    </div>
                    <Button
                      type="button"
                      disabled={verifyingOtp || otpCode.length !== 6 || phoneVerified}
                      onClick={() => void verifyPhoneOtp()}
                    >
                      {verifyingOtp ? "Checking…" : "Submit OTP"}
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>I'm a…</Label>
                <RadioGroup
                  value={form.role}
                  onValueChange={(v) => set("role", v as Role)}
                  className="grid grid-cols-2 gap-2"
                >
                  <Label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10">
                    <RadioGroupItem value="customer" /> Customer
                  </Label>
                  <Label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10">
                    <RadioGroupItem value="shop_owner" /> Shop owner
                  </Label>
                </RadioGroup>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !phoneVerified}>
                {loading ? "Creating…" : "Create account"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
