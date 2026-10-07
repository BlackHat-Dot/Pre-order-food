import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { k as cn, y as authApi, B as Button } from "./router-DQr6eapq.js";
import { toast } from "sonner";
const COUNTRIES = [
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", minDigits: 10, maxDigits: 10 },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸", minDigits: 10, maxDigits: 10 },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", minDigits: 10, maxDigits: 10 },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺", minDigits: 9, maxDigits: 9 },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", minDigits: 10, maxDigits: 10 },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬", minDigits: 8, maxDigits: 8 },
  { code: "AE", name: "UAE", dialCode: "+971", flag: "🇦🇪", minDigits: 9, maxDigits: 9 },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪", minDigits: 10, maxDigits: 11 },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷", minDigits: 9, maxDigits: 9 },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵", minDigits: 10, maxDigits: 10 },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷", minDigits: 10, maxDigits: 11 },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦", minDigits: 9, maxDigits: 9 }
];
const DEFAULT_COUNTRY = COUNTRIES[0];
function buildE164(dialCode, localNumber) {
  const digits = localNumber.replace(/\D/g, "");
  const dialDigits = dialCode.replace(/\D/g, "");
  return `+${dialDigits}${digits}`;
}
function isPhoneValid(country, localNumber) {
  const digits = localNumber.replace(/\D/g, "");
  return digits.length >= country.minDigits && digits.length <= country.maxDigits;
}
function CountryPhoneInput({
  country,
  localNumber,
  onCountryChange,
  onLocalNumberChange,
  disabled = false,
  className
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const filtered = search.trim() ? COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.dialCode.includes(search)
  ) : COUNTRIES;
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const valid = isPhoneValid(country, localNumber);
  const digits = localNumber.replace(/\D/g, "");
  const showError = digits.length > 0 && !valid;
  return /* @__PURE__ */ jsxs("div", { className: cn("space-y-1", className), ref, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          disabled,
          onClick: () => {
            setOpen((o) => !o);
            setSearch("");
          },
          className: cn(
            "flex shrink-0 items-center gap-1.5 rounded-l-md border border-r-0 border-input bg-muted px-3 py-2 text-sm transition-colors",
            "hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            disabled && "cursor-not-allowed opacity-50"
          ),
          "aria-label": "Select country",
          children: [
            /* @__PURE__ */ jsx("span", { className: "text-base leading-none", children: country.flag }),
            /* @__PURE__ */ jsx("span", { className: "font-mono text-muted-foreground", children: country.dialCode }),
            /* @__PURE__ */ jsx(ChevronDown, { className: cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180") })
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "tel",
          inputMode: "numeric",
          disabled,
          value: localNumber,
          onChange: (e) => onLocalNumberChange(e.target.value.replace(/[^\d\s\-()]/g, "").slice(0, 15)),
          placeholder: `${"0".repeat(country.minDigits)}`,
          className: cn(
            "flex-1 rounded-r-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showError && "border-destructive focus:ring-destructive"
          ),
          autoComplete: "tel-national"
        }
      )
    ] }),
    open && /* @__PURE__ */ jsxs("div", { className: "absolute z-50 mt-1 max-h-60 w-72 overflow-hidden rounded-md border border-border bg-popover shadow-lg", children: [
      /* @__PURE__ */ jsx("div", { className: "border-b border-border p-2", children: /* @__PURE__ */ jsx(
        "input",
        {
          autoFocus: true,
          type: "text",
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "Search country…",
          className: "w-full rounded-sm bg-background px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
        }
      ) }),
      /* @__PURE__ */ jsxs("ul", { className: "max-h-48 overflow-y-auto py-1", children: [
        filtered.length === 0 && /* @__PURE__ */ jsx("li", { className: "px-3 py-2 text-sm text-muted-foreground", children: "No results" }),
        filtered.map((c) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => {
              onCountryChange(c);
              setOpen(false);
              setSearch("");
            },
            className: cn(
              "flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent",
              c.code === country.code && "bg-accent/50"
            ),
            children: [
              /* @__PURE__ */ jsx("span", { className: "text-base", children: c.flag }),
              /* @__PURE__ */ jsx("span", { className: "flex-1 text-left", children: c.name }),
              /* @__PURE__ */ jsx("span", { className: "font-mono text-muted-foreground", children: c.dialCode }),
              c.code === country.code && /* @__PURE__ */ jsx(Check, { className: "h-3 w-3 text-primary" })
            ]
          }
        ) }, c.code))
      ] })
    ] }),
    showError && /* @__PURE__ */ jsxs("p", { className: "text-xs text-destructive", children: [
      "Enter ",
      country.minDigits === country.maxDigits ? `${country.minDigits} digits` : `${country.minDigits}–${country.maxDigits} digits`,
      " for ",
      country.name
    ] })
  ] });
}
const MSG91_SDK_URL = "https://control.msg91.com/app/assets/otp-provider/otp-provider.js";
const WIDGET_ID = "36656c6f6867323433323337";
const TOKEN_AUTH = "516068TEEotSwiUFzE6a0347acP1";
let sdkLoadPromise = null;
function loadMsg91Sdk() {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${MSG91_SDK_URL}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = MSG91_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load MSG91 SDK"));
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
}
function Msg91Widget({
  phone,
  purpose,
  onVerified,
  disabled = false,
  isVerified = false,
  className
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const guardRef = useRef(false);
  const isDev = !TOKEN_AUTH;
  const handleClick = useCallback(async () => {
    if (guardRef.current || loading || isVerified || disabled) return;
    guardRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const check = await authApi.checkPhone(phone);
      if (check.exists) {
        toast.error("Phone already registered");
        setLoading(false);
        guardRef.current = false;
        return;
      }
    } catch (err) {
      console.error("Phone check failed", err);
    }
    try {
      if (isDev) ;
      try {
        await loadMsg91Sdk();
      } catch {
        throw new Error("Could not load phone verification service. Check your connection.");
      }
      if (!window.initSendOTP) {
        throw new Error("Phone verification SDK failed to initialise.");
      }
      window.initSendOTP({
        widgetId: WIDGET_ID,
        tokenAuth: TOKEN_AUTH,
        identifier: phone.replace("+", ""),
        success: async (data) => {
          console.log("MSG91 RAW SUCCESS:", data);
          try {
            if (data?.type !== "success") {
              throw new Error("Phone verification failed.");
            }
            onVerified(`msg91_verified_${Date.now()}_${phone}`, phone);
            setError(null);
            toast.success("Phone verified successfully.");
            setLoading(false);
            guardRef.current = false;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Verification failed.";
            setError(msg);
            toast.error(msg);
            setLoading(false);
            guardRef.current = false;
          }
        },
        failure: (err) => {
          console.error("MSG91 failure:", err);
          const msg = typeof err === "string" ? err : err?.message || "Phone verification failed.";
          setError(msg);
          toast.error(msg);
          setLoading(false);
          guardRef.current = false;
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Phone verification failed. Please try again.";
      setError(msg);
      toast.error(msg);
    }
  }, [guardRef, loading, isVerified, disabled, isDev, phone, onVerified]);
  if (isVerified) {
    return /* @__PURE__ */ jsxs("div", { className: cn("flex items-center gap-1.5 text-sm font-medium text-emerald-600", className), children: [
      /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4" }),
      "Phone verified"
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: cn("space-y-1", className), children: [
    /* @__PURE__ */ jsx(
      Button,
      {
        type: "button",
        variant: "secondary",
        className: "w-full sm:w-auto",
        disabled: disabled || loading,
        onClick: () => void handleClick(),
        children: loading ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
          "Verifying…"
        ] }) : "Verify Phone"
      }
    ),
    error && /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-1 text-xs text-destructive", children: [
      /* @__PURE__ */ jsx(AlertCircle, { className: "h-3 w-3 shrink-0" }),
      error
    ] }),
    isDev
  ] });
}
export {
  CountryPhoneInput as C,
  DEFAULT_COUNTRY as D,
  Msg91Widget as M,
  COUNTRIES as a,
  buildE164 as b,
  isPhoneValid as i
};
