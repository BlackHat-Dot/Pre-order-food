import { jsx, jsxs } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Utensils } from "lucide-react";
import { toast } from "sonner";
import { u as useAuth, B as Button, A as ApiError } from "./router-DQr6eapq.js";
import { l as landingForRole } from "./nav-CWlJKvXT.js";
import { I as Input } from "./input-B-ZXk5uj.js";
import { L as Label } from "./label-D-IOUQFS.js";
import { C as Card, a as CardHeader, b as CardTitle, c as CardDescription, d as CardContent } from "./card-BjRrBkxP.js";
import { R as RadioGroup, a as RadioGroupItem } from "./radio-group-2MWZD7N6.js";
import { D as DEFAULT_COUNTRY, b as buildE164, i as isPhoneValid, C as CountryPhoneInput, M as Msg91Widget } from "./Msg91Widget-n1Mx60Yv.js";
import "@tanstack/react-query";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-label";
import "@radix-ui/react-radio-group";
function RegisterPage() {
  const {
    register
  } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer"
  });
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState(null);
  const [verifiedPhone, setVerifiedPhone] = useState(null);
  const [loading, setLoading] = useState(false);
  function set(k, v) {
    setForm((f) => ({
      ...f,
      [k]: v
    }));
  }
  function handleCountryChange(c) {
    setCountry(c);
    resetPhoneVerification();
  }
  function handleLocalNumberChange(n) {
    setLocalNumber(n);
    resetPhoneVerification();
  }
  function resetPhoneVerification() {
    setPhoneVerified(false);
    setPhoneVerificationToken(null);
    setVerifiedPhone(null);
  }
  function handlePhoneVerified(token, phone) {
    setPhoneVerificationToken(token);
    setVerifiedPhone(phone);
    setPhoneVerified(true);
    toast.success("Phone number verified successfully!");
  }
  const fullPhone = buildE164(country.dialCode, localNumber);
  const phoneReady = isPhoneValid(country, localNumber);
  async function onSubmit(e) {
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
        phone_verification_token: phoneVerificationToken
      });
      toast.success(`Welcome, ${me.name.split(" ")[0]}!`);
      navigate({
        to: landingForRole(me.role)
      });
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
  return /* @__PURE__ */ jsx("div", { className: "grid min-h-screen place-items-center px-4 py-10", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-sm", children: [
    /* @__PURE__ */ jsxs(Link, { to: "/", className: "mb-8 flex items-center justify-center gap-2 font-semibold", children: [
      /* @__PURE__ */ jsx("span", { className: "grid h-9 w-9 place-items-center rounded-lg text-primary-foreground", style: {
        background: "var(--gradient-primary)"
      }, children: /* @__PURE__ */ jsx(Utensils, { className: "h-4 w-4" }) }),
      "PreOrder"
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "border-border/60 shadow-[var(--shadow-elegant)]", children: [
      /* @__PURE__ */ jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsx(CardTitle, { children: "Create account" }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Start ordering or sell on PreOrder." })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { children: [
        /* @__PURE__ */ jsxs("form", { onSubmit, className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: "Full name" }),
            /* @__PURE__ */ jsx(Input, { id: "name", required: true, autoComplete: "name", value: form.name, onChange: (e) => set("name", e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Phone number" }),
            /* @__PURE__ */ jsx("div", { className: "relative", children: /* @__PURE__ */ jsx(CountryPhoneInput, { country, localNumber, onCountryChange: handleCountryChange, onLocalNumberChange: handleLocalNumberChange, disabled: phoneVerified }) }),
            phoneVerified ? /* @__PURE__ */ jsx(Msg91Widget, { phone: fullPhone, purpose: "signup_phone", onVerified: handlePhoneVerified, isVerified: true }) : /* @__PURE__ */ jsx(Msg91Widget, { phone: fullPhone, purpose: "signup_phone", onVerified: handlePhoneVerified, disabled: !phoneReady, isVerified: false }),
            !phoneReady && localNumber.length > 0 && /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
              "Enter a valid ",
              country.name,
              " phone number to continue."
            ] }),
            !phoneVerified && phoneReady && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "We'll send a one-time code to verify your number." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Password" }),
            /* @__PURE__ */ jsx(Input, { id: "password", type: "password", required: true, minLength: 8, autoComplete: "new-password", value: form.password, onChange: (e) => set("password", e.target.value) }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Minimum 8 characters." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "I'm a…" }),
            /* @__PURE__ */ jsxs(RadioGroup, { value: form.role, onValueChange: (v) => set("role", v), className: "grid grid-cols-2 gap-2", children: [
              /* @__PURE__ */ jsxs(Label, { className: "flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10", children: [
                /* @__PURE__ */ jsx(RadioGroupItem, { value: "customer" }),
                " Customer"
              ] }),
              /* @__PURE__ */ jsxs(Label, { className: "flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10", children: [
                /* @__PURE__ */ jsx(RadioGroupItem, { value: "shop_owner" }),
                " Shop owner"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Button, { type: "submit", className: "w-full", disabled: loading || !phoneVerified, children: loading ? "Creating account…" : "Create account" }),
          !phoneVerified && /* @__PURE__ */ jsx("p", { className: "text-center text-xs text-muted-foreground", children: "Verify your phone number above to continue." })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "mt-6 text-center text-sm text-muted-foreground", children: [
          "Have an account?",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/login", className: "text-primary hover:underline", children: "Sign in" })
        ] })
      ] })
    ] })
  ] }) });
}
export {
  RegisterPage as component
};
