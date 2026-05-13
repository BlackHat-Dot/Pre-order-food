import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  minDigits: number;
  maxDigits: number;
}

export const COUNTRIES: Country[] = [
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
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦", minDigits: 9, maxDigits: 9 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India

export function buildE164(dialCode: string, localNumber: string): string {
  const digits = localNumber.replace(/\D/g, "");
  const dialDigits = dialCode.replace(/\D/g, "");
  return `+${dialDigits}${digits}`;
}

export function isPhoneValid(country: Country, localNumber: string): boolean {
  const digits = localNumber.replace(/\D/g, "");
  return digits.length >= country.minDigits && digits.length <= country.maxDigits;
}

interface CountryPhoneInputProps {
  country: Country;
  localNumber: string;
  onCountryChange: (c: Country) => void;
  onLocalNumberChange: (n: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CountryPhoneInput({
  country,
  localNumber,
  onCountryChange,
  onLocalNumberChange,
  disabled = false,
  className,
}: CountryPhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search),
      )
    : COUNTRIES;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
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

  return (
    <div className={cn("space-y-1", className)} ref={ref}>
      <div className="flex">
        {/* Country selector */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => { setOpen((o) => !o); setSearch(""); }}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-l-md border border-r-0 border-input bg-muted px-3 py-2 text-sm transition-colors",
            "hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            disabled && "cursor-not-allowed opacity-50",
          )}
          aria-label="Select country"
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="font-mono text-muted-foreground">{country.dialCode}</span>
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>

        {/* Phone number input */}
        <input
          type="tel"
          inputMode="numeric"
          disabled={disabled}
          value={localNumber}
          onChange={(e) => onLocalNumberChange(e.target.value.replace(/[^\d\s\-()]/g, "").slice(0, 15))}
          placeholder={`${"0".repeat(country.minDigits)}`}
          className={cn(
            "flex-1 rounded-r-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showError && "border-destructive focus:ring-destructive",
          )}
          autoComplete="tel-national"
        />
      </div>

      {/* Country dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-72 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country…"
              className="w-full rounded-sm bg-background px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No results</li>
            )}
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => { onCountryChange(c); setOpen(false); setSearch(""); }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent",
                    c.code === country.code && "bg-accent/50",
                  )}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 text-left">{c.name}</span>
                  <span className="font-mono text-muted-foreground">{c.dialCode}</span>
                  {c.code === country.code && <Check className="h-3 w-3 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inline validation hint */}
      {showError && (
        <p className="text-xs text-destructive">
          Enter {country.minDigits === country.maxDigits
            ? `${country.minDigits} digits`
            : `${country.minDigits}–${country.maxDigits} digits`} for {country.name}
        </p>
      )}
    </div>
  );
}
