import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { ApiError, shopsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CountryPhoneInput,
  Msg91Widget,
  DEFAULT_COUNTRY,
  buildE164,
  isPhoneValid,
  type Country,
} from "@/components/phone";

export const Route = createFileRoute("/_app/owner/shops/new")({ component: NewShop });

function NewShop() {
  const navigate = useNavigate();
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    cuisine: "",
    image_url: "",
    pincode: "",
  });

  function resetPhoneVerification() {
    setPhoneVerified(false);
    setVerifiedPhone(null);
    setPhoneVerificationToken(null);
  }

  function handleCountryChange(c: Country) {
    setCountry(c);
    resetPhoneVerification();
  }

  function handleLocalNumberChange(n: string) {
    setLocalNumber(n);
    resetPhoneVerification();
  }

  function handlePhoneVerified(token: string, phone: string) {
    setPhoneVerificationToken(token);
    setVerifiedPhone(phone);
    setPhoneVerified(true);

    setForm((f) => ({
      ...f,
      phone,
    }));

    toast.success("Phone verified successfully");
  }

  let fullPhone = "";
  try {
    fullPhone = buildE164(country.dialCode, localNumber.trim());
  } catch {
    fullPhone = "";
  }

  const phoneReady = isPhoneValid(country, localNumber.trim());

  const create = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) {
        throw new Error("Shop name is required");
      }
      if (!form.cuisine.trim()) {
        throw new Error("Cuisine type is required");
      }
      if (!form.address.trim()) {
        throw new Error("Address is required");
      }
      if (!form.pincode || form.pincode.trim().length < 4) {
        throw new Error("Pincode must be at least 4 characters");
      }
      if (!phoneVerified || !verifiedPhone) {
        throw new Error("Verify phone number first");
      }
      if (!phoneVerificationToken) {
        throw new Error("Phone verification token missing");
      }

      return shopsApi.create({
        ...form,
        phone: verifiedPhone,
        phone_verification_token: phoneVerificationToken,
      } as any);
    },
    onSuccess: (s) => {
      toast.success("Shop created");
      navigate({ to: "/owner/shops/$shopId", params: { shopId: s.id } });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong"),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/owner" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> My shops
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Create shop</h1>
      <Card>
        <CardContent className="space-y-4 p-6">
          {(["name", "cuisine", "address", "pincode", "image_url"] as const).map((k) => (
            <div key={k} className="space-y-2">
              <Label className="capitalize">{k.replace("_", " ")}</Label>
              <Input
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label>Phone number</Label>

            <CountryPhoneInput
              country={country}
              localNumber={localNumber}
              onCountryChange={handleCountryChange}
              onLocalNumberChange={handleLocalNumberChange}
              disabled={phoneVerified}
            />

            <Msg91Widget
              phone={fullPhone}
              purpose="signup_phone"
              onVerified={handlePhoneVerified}
              disabled={!phoneReady}
              isVerified={phoneVerified}
            />

            {phoneVerified && (
              <p className="text-xs text-emerald-500">
                Verified: {verifiedPhone}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Button 
            onClick={() => create.mutate()} 
            disabled={create.isPending || !phoneVerified}
          >
            {create.isPending ? "Creating…" : "Create shop"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}