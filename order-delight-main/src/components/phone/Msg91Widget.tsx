/**
 * Msg91Widget — integrates the MSG91 OTP Widget SDK.
 *
 * Flow:
 *  1. User clicks "Verify Phone"
 *  2. The MSG91 SDK is loaded from CDN (once per session)
 *  3. window.initSendOTP() is called with the phone number
 *  4. The MSG91 widget handles OTP send + entry
 *  5. On success the widget fires our callback with an access_token
 *  6. We POST that token to our backend (/api/v1/verify-msg91)
 *  7. Backend verifies with MSG91 API and issues our own short-lived JWT
 *  8. We call onVerified(proofToken, phone) for the parent to use
 *
 * Dev mode (no VITE_MSG91_WIDGET_ID set):
 *  - Backend skips real MSG91 verification (MSG91_AUTH_KEY also unset)
 *  - We call the backend with an empty access_token for local testing
 */
import { useCallback, useRef, useState } from "react";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { msg91Api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const MSG91_SDK_URL = "https://control.msg91.com/app/assets/otp-provider/otp-provider.js";
const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID as string | undefined;
const TOKEN_AUTH = import.meta.env.VITE_MSG91_TOKEN_AUTH as string | undefined;

// Extend window with MSG91 types
declare global {
  interface Window {
    initSendOTP?: (config: {
      widgetId: string;
      tokenAuth: string;
      identifier: string;
      success: (data: {
    access_token?: string;
    token?: string;
    message?: string;
}) => void;
      failure: (error: unknown) => void;
    }) => void;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

function loadMsg91Sdk(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise<void>((resolve, reject) => {
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

interface Msg91WidgetProps {
  /** Full E.164 phone number with + prefix (e.g. "+919876543210") */
  phone: string;
  /** Whether this is for initial signup or profile phone change */
  purpose: "signup_phone" | "profile_phone";
  /** Called after backend proof token is issued */
  onVerified: (proofToken: string, verifiedPhone: string) => void;
  disabled?: boolean;
  isVerified?: boolean;
  className?: string;
}

export function Msg91Widget({
  phone,
  purpose,
  onVerified,
  disabled = false,
  isVerified = false,
  className,
}: Msg91WidgetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guardRef = useRef(false);

  const isDev = !WIDGET_ID || !TOKEN_AUTH;

  const exchangeToken = useCallback(
    async ({
    reqId,
    otp,
    }: {
        reqId: string;
        otp: string;
    }) => {
      try {
        const res = await msg91Api.verify({
          reqId,
          otp,
          phone,
          purpose,
        });
        if (!res.ok || !res.verification_token) {
          throw new Error("Verification service returned an invalid response.");
        }
        onVerified(res.verification_token, res.phone);
        setError(null);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Verification failed. Please try again.";
        setError(msg);
        toast.error(msg);
      }
    },
    [phone, purpose, onVerified],
  );

  const handleClick = useCallback(async () => {
    if (guardRef.current || loading || isVerified || disabled) return;
    guardRef.current = true;
    setLoading(true);
    setError(null);

    try {
      if (isDev) {
        // Dev mode: skip real MSG91 widget, call backend directly with empty token.
        // This only works when MSG91_AUTH_KEY is also unset on the backend.
        await exchangeToken({
  reqId: "dev",
  otp: "000000",
});
        return;
      }

      // Load MSG91 SDK
      try {
        await loadMsg91Sdk();
      } catch {
        throw new Error("Could not load phone verification service. Check your connection.");
      }

      if (!window.initSendOTP) {
        throw new Error("Phone verification SDK failed to initialise.");
      }

      // Launch the MSG91 widget
     window.initSendOTP!({
  widgetId: WIDGET_ID!,
  tokenAuth: TOKEN_AUTH!,
  identifier: phone.replace("+", ""),

  success: async (data) => {
    console.log("MSG91 RAW SUCCESS:", data);

    try {
      const reqId = (data as any)?.reqId;
const otp = (data as any)?.otp;

console.log("REQ ID:", reqId);
console.log("OTP:", otp);

if (!reqId || !otp) {
  throw new Error("Invalid OTP verification response.");
}

await exchangeToken({
  reqId,
  otp,
});

      setLoading(false);
      guardRef.current = false;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Verification failed.";

      setError(msg);
      toast.error(msg);

      setLoading(false);
      guardRef.current = false;
    }
  },

  failure: (err) => {
    console.error("MSG91 failure:", err);

    const msg =
      typeof err === "string"
        ? err
        : (err as { message?: string })?.message ||
          "Phone verification failed.";

    setError(msg);
    toast.error(msg);

    setLoading(false);
    guardRef.current = false;
  },
});


    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Phone verification failed. Please try again.";
      setError(msg);
      toast.error(msg);
    }
  }, [guardRef, loading, isVerified, disabled, isDev, exchangeToken, phone]);

  if (isVerified) {
    return (
      <div className={cn("flex items-center gap-1.5 text-sm font-medium text-emerald-600", className)}>
        <ShieldCheck className="h-4 w-4" />
        Phone verified
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <Button
        type="button"
        variant="secondary"
        className="w-full sm:w-auto"
        disabled={disabled || loading}
        onClick={() => void handleClick()}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying…
          </>
        ) : isDev ? (
          "Verify Phone (Dev Mode)"
        ) : (
          "Verify Phone"
        )}
      </Button>
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
      {isDev && (
        <p className="text-xs text-amber-600">
          ⚠ MSG91 credentials not configured — running in dev bypass mode.
        </p>
      )}
    </div>
  );
}
