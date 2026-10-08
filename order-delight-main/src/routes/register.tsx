import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { ApiError, type Role } from "@/lib/api";
import {
  CountryPhoneInput,
  Msg91Widget,
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
    email: "",
    password: "",
    role: "customer" as Role,
  });

  // Phone state
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

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

  function handlePhoneVerified(token: string, phone: string) {
    setPhoneVerificationToken(token);
    setVerifiedPhone(phone);
    setPhoneVerified(true);
    toast.success("Phone number verified successfully!");
  }

  const fullPhone = buildE164(country.dialCode, localNumber);
  const phoneReady = isPhoneValid(country, localNumber);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!phoneReady) {
      toast.error("Enter a valid phone number.");
      return;
    }
    if (!phoneVerified || !phoneVerificationToken || !verifiedPhone) {
      toast.error("Verify your phone number before creating an account.");
      return;
    }

    setLoading(true);
    try {
      const me = await register({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: verifiedPhone,
        password: form.password,
        role: form.role,
        phone_verification_token: phoneVerificationToken,
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
              {/* Full name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>

              {/* Phone + MSG91 verification */}
              <div className="space-y-2">
                <Label>Phone number</Label>
                <div className="relative">
                  <CountryPhoneInput
                    country={country}
                    localNumber={localNumber}
                    onCountryChange={handleCountryChange}
                    onLocalNumberChange={handleLocalNumberChange}
                    disabled={phoneVerified}
                  />
                </div>

                {phoneVerified ? (
                  <Msg91Widget
                    phone={fullPhone}
                    purpose="signup_phone"
                    onVerified={handlePhoneVerified}
                    isVerified={true}
                  />
                ) : (
                  <Msg91Widget
                    phone={fullPhone}
                    purpose="signup_phone"
                    onVerified={handlePhoneVerified}
                    disabled={!phoneReady}
                    isVerified={false}
                  />
                )}

                {!phoneReady && localNumber.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Enter a valid {country.name} phone number to continue.
                  </p>
                )}
                {!phoneVerified && phoneReady && (
                  <p className="text-xs text-muted-foreground">
                    We'll send a one-time code to verify your number.
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
              </div>

              {/* Role */}
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

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !phoneVerified}
              >
                {loading ? "Creating account…" : "Create account"}
              </Button>

              {!phoneVerified && (
                <p className="text-center text-xs text-muted-foreground">
                  Verify your phone number above to continue.
                </p>
              )}
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
