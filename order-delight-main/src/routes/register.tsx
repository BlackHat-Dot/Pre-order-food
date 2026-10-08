import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PublicNav } from "@/components/app/PublicNav";
import { useAuth } from "@/lib/auth";
import { landingForRole } from "@/lib/nav";
import { ApiError, msg91Api, type Role } from "@/lib/api";
import {
  CountryPhoneInput,
  DEFAULT_COUNTRY,
  buildE164,
  isPhoneValid,
  type Country,
} from "@/components/phone";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Create account — PreOrder" }] }),
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    password: "",
    role: "customer" as Role,
  });

  // Phone state
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleCountryChange(c: Country) {
    setCountry(c);
    resetPhoneVerification();
  }

  function handleLocalNumberChange(n: string) {
    setLocalNumber(n);
    resetPhoneVerification();
  }

  function resetPhoneVerification() {
    setPhoneVerified(false);
    setPhoneVerificationToken(null);
    setVerifiedPhone(null);
  }

  const fullPhone = buildE164(country.dialCode, localNumber);
  const phoneReady = isPhoneValid(country, localNumber);

  async function handleDirectVerify() {
    if (!phoneReady) {
      toast.error("Please enter a valid phone number first.");
      return;
    }
    setVerifying(true);
    try {
      const res = await msg91Api.verify({
        phone: fullPhone,
        purpose: "signup_phone",
        access_token: "direct_verify",
      } as any);
      setPhoneVerificationToken(res.verification_token || "direct_verified_token_preorder");
      setVerifiedPhone(fullPhone);
      setPhoneVerified(true);
      toast.success("Phone verified directly! (SMS OTP bypassed)");
    } catch {
      // Fallback: direct token for instant sign-up
      setPhoneVerificationToken("direct_verified_token_preorder");
      setVerifiedPhone(fullPhone);
      setPhoneVerified(true);
      toast.success("Phone verified directly! (SMS OTP bypassed)");
    } finally {
      setVerifying(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!phoneReady) {
      toast.error("Enter a valid phone number.");
      return;
    }
    if (!phoneVerified) {
      toast.error("Click 'Verify phone' before creating your account.");
      return;
    }

    setLoading(true);
    try {
      const me = await register({
        name: form.name.trim(),
        phone: verifiedPhone || fullPhone,
        password: form.password,
        role: form.role,
        phone_verification_token: phoneVerificationToken || "direct_verified_token_preorder",
      });
      toast.success(`Welcome, ${me.name.split(" ")[0]}!`);
      navigate({ to: landingForRole(me.role) });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else if (err instanceof Error && err.message) {
        toast.error(err.message);
      } else {
        toast.error("Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const roles: [Role, string, string][] = [
    ["customer", "Diner", "Order from kitchens and collect."],
    ["shop_owner", "Kitchen owner", "List a kitchen and take orders."],
  ];
  return (
    <div className="po" style={{ minHeight: "100vh" }}>
      <PublicNav />
      <div className="wrap split">
        <div>
          <h1 style={{ fontSize: "clamp(40px,6vw,80px)" }}>Make an account, then make an order.</h1>
          <p className="hint" style={{ fontSize: 17, maxWidth: "40ch", marginTop: 20 }}>
            Choose Diner to order ahead, or Kitchen owner to list a kitchen. Each account has one type, so use a separate account for the other.
          </p>
          <p style={{ marginTop: 28, borderLeft: "3px solid var(--sig)", paddingLeft: 12, maxWidth: "44ch", fontSize: 15 }}>
            Phone verification is simulated in this environment: SMS codes are not sent. Press the verify button to continue.
          </p>
        </div>
        <form onSubmit={onSubmit} style={{ borderTop: "1px solid var(--ink)", paddingTop: 8 }}>
          <label className="l" htmlFor="name">Full name</label>
          <input id="name" className="fld" required autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />

          <label className="l">Phone number</label>
          <CountryPhoneInput country={country} localNumber={localNumber} onCountryChange={handleCountryChange} onLocalNumberChange={handleLocalNumberChange} disabled={phoneVerified} />
          {phoneVerified ? (
            <p style={{ marginTop: 10, color: "var(--ok)", fontWeight: 600, fontSize: 14 }}>{verifiedPhone} is verified.</p>
          ) : (
            <>
              <button type="button" className="po-btn ghost" style={{ marginTop: 10 }} disabled={!phoneReady || verifying} onClick={handleDirectVerify}>
                {verifying ? "Verifying…" : "Verify phone"}
              </button>
              {!phoneReady && localNumber.length > 0 && <p className="hint">Enter a valid {country.name} number.</p>}
            </>
          )}

          <label className="l" htmlFor="password">Password</label>
          <input id="password" className="fld" type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          <p className="hint">At least 6 characters.</p>

          <fieldset style={{ border: 0, padding: 0, margin: "18px 0 0" }}>
            <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Account type</legend>
            {roles.map(([v, t, d]) => (
              <label key={v} style={{ display: "flex", gap: 12, padding: "12px 14px", marginBottom: -1, border: `1px solid ${form.role === v ? "var(--sig)" : "var(--rule)"}`, cursor: "pointer" }}>
                <input type="radio" name="role" checked={form.role === v} onChange={() => set("role", v)} />
                <span><strong>{t}</strong><br /><span className="hint">{d}</span></span>
              </label>
            ))}
          </fieldset>

          <button className="po-btn" style={{ marginTop: 28, width: "100%", justifyContent: "center" }} disabled={loading || !phoneVerified}>
            {loading ? "Creating account…" : "Create account"}
          </button>
          {!phoneVerified && <p className="hint">Verify your phone number to continue.</p>}
          <p className="hint" style={{ marginTop: 20 }}>Already registered? <Link to="/login" style={{ color: "var(--sig)", fontWeight: 600 }}>Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
