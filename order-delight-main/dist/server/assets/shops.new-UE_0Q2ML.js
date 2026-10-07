import { jsxs, jsx } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { A as ApiError, s as shopsApi, T as Textarea, B as Button } from "./router-DQr6eapq.js";
import { C as Card, d as CardContent } from "./card-BjRrBkxP.js";
import { I as Input } from "./input-B-ZXk5uj.js";
import { L as Label } from "./label-D-IOUQFS.js";
import { D as DEFAULT_COUNTRY, b as buildE164, i as isPhoneValid, C as CountryPhoneInput, M as Msg91Widget } from "./Msg91Widget-n1Mx60Yv.js";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-label";
function NewShop() {
  const navigate = useNavigate();
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState(null);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    cuisine: "",
    image_url: "",
    pincode: ""
  });
  function resetPhoneVerification() {
    setPhoneVerified(false);
    setVerifiedPhone(null);
    setPhoneVerificationToken(null);
  }
  function handleCountryChange(c) {
    setCountry(c);
    resetPhoneVerification();
  }
  function handleLocalNumberChange(n) {
    setLocalNumber(n);
    resetPhoneVerification();
  }
  function handlePhoneVerified(token, phone) {
    setPhoneVerificationToken(token);
    setVerifiedPhone(phone);
    setPhoneVerified(true);
    setForm((f) => ({
      ...f,
      phone
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
        phone_verification_token: phoneVerificationToken
      });
    },
    onSuccess: (s) => {
      toast.success("Shop created");
      navigate({
        to: "/owner/shops/$shopId",
        params: {
          shopId: s.id
        }
      });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong")
  });
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl space-y-6", children: [
    /* @__PURE__ */ jsxs(Link, { to: "/owner", className: "inline-flex items-center text-sm text-muted-foreground hover:text-foreground", children: [
      /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }),
      " My shops"
    ] }),
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Create shop" }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4 p-6", children: [
      ["name", "cuisine", "address", "pincode", "image_url"].map((k) => /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { className: "capitalize", children: k.replace("_", " ") }),
        /* @__PURE__ */ jsx(Input, { value: form[k], onChange: (e) => setForm((f) => ({
          ...f,
          [k]: e.target.value
        })) })
      ] }, k)),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Phone number" }),
        /* @__PURE__ */ jsx(CountryPhoneInput, { country, localNumber, onCountryChange: handleCountryChange, onLocalNumberChange: handleLocalNumberChange, disabled: phoneVerified }),
        /* @__PURE__ */ jsx(Msg91Widget, { phone: fullPhone, purpose: "signup_phone", onVerified: handlePhoneVerified, disabled: !phoneReady, isVerified: phoneVerified }),
        phoneVerified && /* @__PURE__ */ jsxs("p", { className: "text-xs text-emerald-500", children: [
          "Verified: ",
          verifiedPhone
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Description" }),
        /* @__PURE__ */ jsx(Textarea, { value: form.description, onChange: (e) => setForm((f) => ({
          ...f,
          description: e.target.value
        })) })
      ] }),
      /* @__PURE__ */ jsx(Button, { onClick: () => create.mutate(), disabled: create.isPending || !phoneVerified, children: create.isPending ? "Creating…" : "Create shop" })
    ] }) })
  ] });
}
export {
  NewShop as component
};
