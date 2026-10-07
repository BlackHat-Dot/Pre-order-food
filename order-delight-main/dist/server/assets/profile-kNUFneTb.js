import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Plus, Info, CheckCircle2, Trash2, Loader2, Search, Compass, Briefcase, Home, Mail, ShieldCheck, X, AlertCircle, Phone, ChevronDown } from "lucide-react";
import { a as apiRequest, b as TooltipProvider, c as Tooltip, d as TooltipTrigger, B as Button, e as TooltipContent, u as useAuth, A as ApiError, n as usersApi, k as cn, p as otpApi } from "./router-DQr6eapq.js";
import { C as Card, d as CardContent, a as CardHeader, b as CardTitle } from "./card-BjRrBkxP.js";
import { I as Input } from "./input-B-ZXk5uj.js";
import { L as Label } from "./label-D-IOUQFS.js";
import { D as DEFAULT_COUNTRY, b as buildE164, i as isPhoneValid, C as CountryPhoneInput, M as Msg91Widget } from "./Msg91Widget-n1Mx60Yv.js";
import "@tanstack/react-router";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-label";
function ProfileAddresses() {
  const qc = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("Home");
  const [landmark, setLandmark] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVerifiedAddress, setSelectedVerifiedAddress] = useState(null);
  const [houseDetails, setHouseDetails] = useState("");
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["addresses", "me"],
    queryFn: () => apiRequest("/api/v1/addresses", { method: "GET" })
  });
  const isCapReached = addresses.length >= 3;
  const handleAddNewClick = () => {
    if (isCapReached) {
      toast.warning("Address limit reached", {
        description: "You can save up to 3 delivery locations. Please remove an old address to add a new one."
      });
      return;
    }
    setIsAdding(true);
  };
  useEffect(() => {
    if (searchQuery.trim().length < 4) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5`,
          { headers: { "User-Agent": "PreOrderFoodApp/1.0" } }
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (err) {
        console.error("Map query rejected", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);
  const addAddress = useMutation({
    mutationFn: async () => {
      const fullFinalLine = `${houseDetails.trim()}, ${selectedVerifiedAddress}`;
      return await apiRequest("/api/v1/addresses", {
        method: "POST",
        body: { title, address_line: fullFinalLine, landmark: landmark || void 0 }
      });
    },
    onSuccess: () => {
      toast.success("Verified delivery profile saved!");
      setIsAdding(false);
      setSearchQuery("");
      setSelectedVerifiedAddress(null);
      setHouseDetails("");
      setLandmark("");
      setSuggestions([]);
      qc.invalidateQueries({ queryKey: ["addresses", "me"] });
    },
    onError: () => toast.error("Failed to map coordinates safely.")
  });
  const setDefault = useMutation({
    mutationFn: async (id) => {
      return await apiRequest(`/api/v1/addresses/${id}/default`, { method: "PUT" });
    },
    onSuccess: () => {
      toast.success("Default delivery destination updated");
      qc.invalidateQueries({ queryKey: ["addresses", "me"] });
    }
  });
  const deleteAddress = useMutation({
    mutationFn: async (id) => {
      return await apiRequest(`/api/v1/addresses/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Address profile removed");
      qc.invalidateQueries({ queryKey: ["addresses", "me"] });
    },
    onError: () => toast.error("Could not delete address")
  });
  const getIcon = (type) => {
    switch (type.toLowerCase()) {
      case "home":
        return /* @__PURE__ */ jsx(Home, { className: "h-4 w-4" });
      case "office":
      case "work":
        return /* @__PURE__ */ jsx(Briefcase, { className: "h-4 w-4" });
      default:
        return /* @__PURE__ */ jsx(Compass, { className: "h-4 w-4" });
    }
  };
  return /* @__PURE__ */ jsx(Card, { className: "border-border/60 shadow-sm rounded-xl overflow-hidden mt-6", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-6 space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-b border-border/60 pb-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(MapPin, { className: "h-4 w-4 text-primary" }),
        /* @__PURE__ */ jsxs("h3", { className: "font-bold text-sm tracking-tight text-foreground", children: [
          "Saved Delivery Addresses (",
          addresses.length,
          "/3)"
        ] })
      ] }),
      !isAdding && /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsxs(Tooltip, { children: [
        /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx("span", { children: /* @__PURE__ */ jsxs(
          Button,
          {
            size: "sm",
            variant: "outline",
            onClick: handleAddNewClick,
            disabled: isCapReached,
            className: "h-8 rounded-xl text-xs gap-1 transition-all",
            children: [
              /* @__PURE__ */ jsx(Plus, { className: "h-3 w-3" }),
              " Add New"
            ]
          }
        ) }) }),
        isCapReached && /* @__PURE__ */ jsxs(TooltipContent, { className: "bg-popover border text-popover-foreground max-w-xs rounded-xl p-3 shadow-lg space-y-1", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-xs font-bold flex items-center gap-1.5 text-amber-500", children: [
            /* @__PURE__ */ jsx(Info, { className: "h-3.5 w-3.5" }),
            " Profile Limit Reached"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground leading-normal", children: "To safeguard account clarity, you can save a maximum of 3 unique locations. Please drop an older destination to save this profile." })
        ] })
      ] }) })
    ] }),
    isLoading ? /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground animate-pulse py-4 text-left", children: "Loading address profiles..." }) : addresses.length === 0 && !isAdding ? /* @__PURE__ */ jsx("div", { className: "text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl", children: "No saved delivery locations found. Add an address to speed up checkout." }) : /* @__PURE__ */ jsx("div", { className: "grid gap-3", children: !isAdding && addresses.map((addr) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: `p-4 rounded-xl border flex items-start gap-3 transition-colors text-left ${addr.is_default ? "bg-primary/5 border-primary/40" : "bg-card/50 border-border/80"}`,
        children: [
          /* @__PURE__ */ jsx("div", { className: `p-2 rounded-lg shrink-0 ${addr.is_default ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`, children: getIcon(addr.title) }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 space-y-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs font-bold uppercase tracking-wider text-foreground", children: addr.title }),
              addr.is_default && /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20", children: [
                /* @__PURE__ */ jsx(CheckCircle2, { className: "h-2.5 w-2.5" }),
                " Primary Destination"
              ] })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-foreground/90 font-medium leading-relaxed break-words", children: addr.address_line }),
            addr.landmark && /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
              "Landmark: ",
              addr.landmark
            ] }),
            !addr.is_default && /* @__PURE__ */ jsx("div", { className: "pt-1.5 flex gap-3", children: /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setDefault.mutate(addr.id),
                className: "text-[11px] text-primary hover:underline font-semibold",
                children: "Set as primary"
              }
            ) })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                if (confirm("Remove this address permanently?")) deleteAddress.mutate(addr.id);
              },
              className: "text-muted-foreground/60 hover:text-destructive p-1 rounded transition-colors self-start",
              children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" })
            }
          )
        ]
      },
      addr.id
    )) }),
    isAdding && !isCapReached && /* @__PURE__ */ jsxs("div", { className: "border border-border p-4 rounded-xl bg-muted/20 space-y-4 animate-in fade-in duration-200 text-left", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-black tracking-wider text-primary uppercase", children: "Verify Location Profile" }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-[11px] font-bold text-muted-foreground", children: "Address Label" }),
          /* @__PURE__ */ jsx("div", { className: "flex gap-2 mt-1", children: ["Home", "Office", "Other"].map((tag) => /* @__PURE__ */ jsx(
            Button,
            {
              type: "button",
              size: "sm",
              variant: title === tag ? "default" : "outline",
              onClick: () => setTitle(tag),
              className: "h-7 text-xs rounded-lg px-3",
              children: tag
            },
            tag
          )) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1 relative", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-[11px] font-bold text-muted-foreground", children: "Search Area / Street / City" }),
          /* @__PURE__ */ jsxs("div", { className: "relative mt-1", children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                value: searchQuery,
                onChange: (e) => {
                  setSearchQuery(e.target.value);
                  if (selectedVerifiedAddress) setSelectedVerifiedAddress(null);
                },
                className: "h-10 rounded-xl pl-9 text-xs focus-visible:ring-primary",
                placeholder: "Type area name (e.g. Polur, Chennai...)",
                disabled: !!selectedVerifiedAddress
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", children: isSearching ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin text-primary" }) : /* @__PURE__ */ jsx(Search, { className: "h-3.5 w-3.5" }) }),
            selectedVerifiedAddress && /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => {
                  setSelectedVerifiedAddress(null);
                  setSearchQuery("");
                },
                className: "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-muted hover:bg-border px-2 py-0.5 rounded font-medium",
                children: "Reset Filter"
              }
            )
          ] }),
          suggestions.length > 0 && !selectedVerifiedAddress && /* @__PURE__ */ jsx("div", { className: "absolute z-30 w-full bg-popover border border-border mt-1 rounded-xl shadow-xl overflow-hidden max-h-[160px] overflow-y-auto divide-y divide-border", children: suggestions.map((place, idx) => /* @__PURE__ */ jsxs(
            "div",
            {
              onClick: () => {
                setSelectedVerifiedAddress(place.display_name);
                setSearchQuery(place.display_name);
                setSuggestions([]);
              },
              className: "p-3 text-xs text-foreground hover:bg-accent cursor-pointer transition-colors text-left font-medium flex items-start gap-2",
              children: [
                /* @__PURE__ */ jsx(MapPin, { className: "h-3.5 w-3.5 mt-0.5 text-primary shrink-0" }),
                /* @__PURE__ */ jsx("span", { children: place.display_name })
              ]
            },
            idx
          )) })
        ] }),
        selectedVerifiedAddress ? /* @__PURE__ */ jsxs("div", { className: "space-y-3 pt-2 border-t border-dashed border-border/80 animate-in slide-in-from-top-2 duration-200", children: [
          /* @__PURE__ */ jsxs("div", { className: "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 rounded-xl p-3 text-xs font-semibold flex items-start gap-2", children: [
            /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-emerald-500 shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "Map Match Confirmed: ",
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground font-normal", children: selectedVerifiedAddress })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs(Label, { className: "text-[11px] font-bold text-muted-foreground", children: [
              "Flat / House / Door Number ",
              /* @__PURE__ */ jsx("span", { className: "text-destructive", children: "*" })
            ] }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: houseDetails,
                onChange: (e) => setHouseDetails(e.target.value),
                className: "h-9 rounded-lg mt-1 text-xs",
                placeholder: "e.g. Room 12, Door No 4A, Vijay Apartments"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { className: "text-[11px] font-bold text-muted-foreground", children: "Nearby Landmark (Optional)" }),
            /* @__PURE__ */ jsx(Input, { value: landmark, onChange: (e) => setLandmark(e.target.value), className: "h-9 rounded-lg mt-1 text-xs", placeholder: "e.g. Opposite the municipal water tank" })
          ] })
        ] }) : searchQuery.trim().length >= 4 && suggestions.length === 0 && !isSearching && /* @__PURE__ */ jsx("p", { className: "text-[11px] text-amber-500 font-medium bg-amber-500/5 p-2 rounded-lg border border-amber-500/10", children: "⚠️ No officially mapped location parameters found for that query. Please type a real neighborhood name." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 justify-end border-t border-border/50 pt-3", children: [
        /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", onClick: () => {
          setIsAdding(false);
          setSelectedVerifiedAddress(null);
          setSearchQuery("");
          setHouseDetails("");
        }, className: "h-8 text-xs rounded-lg", children: "Cancel" }),
        /* @__PURE__ */ jsx(
          Button,
          {
            type: "button",
            disabled: !selectedVerifiedAddress || !houseDetails.trim() || addAddress.isPending,
            onClick: () => addAddress.mutate(),
            className: "h-8 text-xs rounded-lg font-bold px-4 bg-primary text-primary-foreground shadow",
            children: addAddress.isPending ? "Locking..." : "Save Location"
          }
        )
      ] })
    ] })
  ] }) });
}
function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}
function useCountdown(seconds) {
  const [left, setLeft] = useState(seconds);
  const [target, setTarget] = useState(seconds);
  const id = useRef(null);
  function restart(s) {
    setTarget(s);
    setLeft(s);
  }
  useEffect(() => {
    if (target <= 0) return;
    if (id.current) clearInterval(id.current);
    id.current = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1e3);
    return () => {
      if (id.current) clearInterval(id.current);
    };
  }, [target]);
  return [left, restart];
}
function fmt(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}
function ProfilePage() {
  const {
    user,
    refresh
  } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);
  const [emailInput, setEmailInput] = useState(user?.email ?? "");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailToken, setEmailToken] = useState(null);
  const [emailStep, setEmailStep] = useState("idle");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [cooldownSecs, startCooldown] = useCountdown(0);
  const [emailCurrentPwd, setEmailCurrentPwd] = useState("");
  const [editingEmail, setEditingEmail] = useState(!user?.email);
  useEffect(() => {
    setEmailInput(user?.email ?? "");
    setEmailStep("idle");
    setEmailToken(null);
    setEmailOtp("");
    setOtpError(null);
    setEmailCurrentPwd("");
    setEditingEmail(!user?.email);
  }, [user?.id, user?.email]);
  const savedEmail = (user?.email ?? "").toLowerCase();
  const emailChanged = emailInput.trim().toLowerCase() !== savedEmail && emailInput.trim() !== "";
  const emailValid = isValidEmail(emailInput);
  const hasSavedEmail = Boolean(savedEmail);
  const emailUnverified = hasSavedEmail && !user?.email_verified;
  const needsPassword = !!(user?.email && user.email_verified && emailChanged);
  const canSendOtp = emailValid && emailStep !== "verified" && !sendingOtp && cooldownSecs === 0 && (emailChanged || emailUnverified || !hasSavedEmail || editingEmail);
  const sendEmailButtonText = sendingOtp ? /* @__PURE__ */ jsxs(Fragment, { children: [
    " ",
    /* @__PURE__ */ jsx(Loader2, { className: "mr-1.5 h-3.5 w-3.5 animate-spin" }),
    " Sending…"
  ] }) : cooldownSecs > 0 ? `Resend in ${fmt(cooldownSecs)}` : emailStep === "sent" ? "Resend code" : !emailChanged && emailUnverified && !editingEmail ? "Verify current email" : "Send code";
  function handleEmailChange(val) {
    setEmailInput(val);
    if (emailStep !== "idle") {
      setEmailStep("idle");
      setEmailToken(null);
      setEmailOtp("");
      setOtpError(null);
    }
  }
  function cancelEditingEmail() {
    setEditingEmail(false);
    setEmailInput(user?.email ?? "");
    setEmailStep("idle");
    setEmailToken(null);
    setEmailOtp("");
    setOtpError(null);
    setEmailCurrentPwd("");
  }
  async function sendEmailOtp() {
    if (!canSendOtp) return;
    setSendingOtp(true);
    setOtpError(null);
    try {
      const res = await otpApi.sendOtp({
        channel: "email",
        purpose: "profile_email",
        email: emailInput.trim()
      });
      if (typeof res.resend_in_seconds === "number" && res.resend_in_seconds > 0) {
        startCooldown(res.resend_in_seconds);
      }
      setEmailStep("sent");
      toast.success("Verification code sent — check your inbox.");
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.detail;
        const secs = detail?.resend_in_seconds ?? detail?.cooldown_seconds;
        if (typeof secs === "number" && secs > 0) startCooldown(secs);
        const msg = detail?.message || err.message || "Could not send code";
        setOtpError(msg);
        toast.error(msg);
      } else {
        console.error(err);
        setOtpError("Something went wrong");
        toast.error("Something went wrong");
      }
    } finally {
      setSendingOtp(false);
    }
  }
  async function verifyEmailOtp() {
    if (emailOtp.length !== 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    if (verifyingOtp) return;
    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await otpApi.verifyOtp({
        channel: "email",
        purpose: "profile_email",
        email: emailInput.trim(),
        code: emailOtp
      });
      if (!res.verification_token) throw new Error("Incorrect code. Please try again.");
      setEmailToken(res.verification_token);
      setEmailStep("verified");
      setOtpError(null);
      toast.success("Email verified — save your profile to apply the change.");
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.detail?.message || err.message;
        setOtpError(msg);
      } else {
        console.error(err);
        setOtpError("Something went wrong");
      }
    } finally {
      setVerifyingOtp(false);
    }
  }
  const saveProfile = useMutation({
    mutationFn: async () => {
      const body = {
        name
      };
      const emailTrimmed = emailInput.trim() || null;
      const emailLower = (emailTrimmed ?? "").toLowerCase();
      if (emailTrimmed && emailLower !== savedEmail) {
        if (!emailToken) throw new ApiError(400, "Verify your email before saving.");
        if (needsPassword && !emailCurrentPwd) throw new ApiError(400, "Enter your current password to change a verified email.");
        body.email = emailTrimmed;
        body.email_verification_token = emailToken;
        if (emailCurrentPwd) body.current_password = emailCurrentPwd;
      } else if (emailTrimmed && emailLower === savedEmail && emailToken) {
        body.email = emailTrimmed;
        body.email_verification_token = emailToken;
      } else if (!emailTrimmed && savedEmail) {
        body.email = null;
      }
      return usersApi.updateProfile(body);
    },
    onSuccess: async () => {
      toast.success("Profile saved.");
      setEmailStep("idle");
      setEmailToken(null);
      setEmailOtp("");
      setEmailCurrentPwd("");
      setOtpError(null);
      setEditingEmail(false);
      startCooldown(0);
      await refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong")
  });
  const canSaveProfile = !saveProfile.isPending && (name.trim() !== (user?.name ?? "").trim() || emailStep === "verified" || !emailChanged && emailInput.trim() !== (user?.email ?? "")) && (!emailChanged || emailStep === "verified") && (!needsPassword || !emailChanged || !!emailCurrentPwd);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [newCountry, setNewCountry] = useState(DEFAULT_COUNTRY);
  const [newLocalNumber, setNewLocalNumber] = useState("");
  const [phoneToken, setPhoneToken] = useState(null);
  const [verifiedNewPhone, setVerifiedNewPhone] = useState(null);
  const [phonePwd, setPhonePwd] = useState("");
  let newFullPhone = "";
  try {
    newFullPhone = buildE164(newCountry.dialCode, newLocalNumber.trim());
  } catch {
    newFullPhone = "";
  }
  const newPhoneReady = isPhoneValid(newCountry, newLocalNumber.trim());
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
        current_password: phonePwd
      });
    },
    onSuccess: async () => {
      toast.success("Phone number updated.");
      resetPhoneForm();
      await refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong")
  });
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwd, setPwd] = useState({
    current_password: "",
    new_password: ""
  });
  const savePwd = useMutation({
    mutationFn: () => {
      if (!pwd.current_password || !pwd.new_password) throw new ApiError(400, "Fill in both password fields.");
      return usersApi.updatePassword(pwd);
    },
    onSuccess: () => {
      toast.success("Password updated.");
      setPwd({
        current_password: "",
        new_password: ""
      });
      setShowPwdForm(false);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Something went wrong")
  });
  return /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-0", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Profile" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Manage your account details." })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Personal info" }) }),
      /* @__PURE__ */ jsxs(CardContent, { className: "space-y-5", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "profile-name", children: "Full name" }),
          /* @__PURE__ */ jsx(Input, { id: "profile-name", autoComplete: "name", value: name, onChange: (e) => setName(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxs(Label, { htmlFor: "profile-email", className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(Mail, { className: "h-3.5 w-3.5 text-muted-foreground" }),
              "Email address"
            ] }),
            emailStep === "verified" && !emailChanged && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600", children: [
              /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3 w-3" }),
              " Verified (save to apply)"
            ] }),
            user?.email_verified && !emailChanged && emailStep !== "verified" && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600", children: [
              /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3 w-3" }),
              " Verified"
            ] }),
            user?.email && !user.email_verified && !emailChanged && emailStep !== "verified" && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600", children: "Not verified" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-end", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative flex-1", children: [
              /* @__PURE__ */ jsx(Input, { id: "profile-email", type: "email", autoComplete: "email", placeholder: "you@example.com", value: emailInput, onChange: (e) => handleEmailChange(e.target.value), className: cn(emailInput && !emailValid && "border-destructive focus-visible:ring-destructive", emailStep === "verified" && "border-emerald-500 focus-visible:ring-emerald-500"), readOnly: !editingEmail && !!user?.email }),
              emailStep === "verified" && /* @__PURE__ */ jsx(CheckCircle2, { className: "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" })
            ] }),
            emailStep !== "verified" && (emailChanged || emailUnverified || !hasSavedEmail || editingEmail) && /* @__PURE__ */ jsx(Button, { type: "button", variant: "secondary", disabled: !canSendOtp, onClick: () => void sendEmailOtp(), className: "shrink-0", children: sendEmailButtonText }),
            user?.email && !editingEmail && /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", className: "shrink-0", onClick: () => setEditingEmail(true), children: "Edit email" }),
            user?.email && editingEmail && /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "shrink-0", onClick: cancelEditingEmail, children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
          ] }),
          emailInput && !emailValid && /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-1 text-xs text-destructive", children: [
            /* @__PURE__ */ jsx(AlertCircle, { className: "h-3 w-3 shrink-0" }),
            "Enter a valid email address"
          ] }),
          emailStep !== "verified" && needsPassword && emailChanged && emailValid && /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "email-pwd", className: "text-xs text-muted-foreground", children: "Current password required to change your verified email" }),
            /* @__PURE__ */ jsx(Input, { id: "email-pwd", type: "password", autoComplete: "current-password", placeholder: "Your current password", value: emailCurrentPwd, onChange: (e) => setEmailCurrentPwd(e.target.value) })
          ] }),
          emailStep === "sent" && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border bg-muted/30 p-4 space-y-3", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium", children: [
              "Enter the 6-digit code sent to ",
              /* @__PURE__ */ jsx("span", { className: "text-primary", children: emailInput.trim() })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Input, { autoFocus: true, inputMode: "numeric", autoComplete: "one-time-code", maxLength: 6, placeholder: "000000", value: emailOtp, onChange: (e) => {
                setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                setOtpError(null);
              }, className: cn("font-mono tracking-widest", otpError && "border-destructive") }),
              /* @__PURE__ */ jsx(Button, { type: "button", disabled: verifyingOtp || emailOtp.length !== 6, onClick: () => void verifyEmailOtp(), children: verifyingOtp ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "Verify" }),
              /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", size: "icon", onClick: () => {
                setEmailStep("idle");
                setEmailOtp("");
                setOtpError(null);
              }, children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
            ] }),
            otpError && /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-1 text-xs text-destructive", children: [
              /* @__PURE__ */ jsx(AlertCircle, { className: "h-3 w-3 shrink-0" }),
              " ",
              otpError
            ] })
          ] }),
          emailStep === "verified" && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-sm text-emerald-700", children: [
            /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 shrink-0" }),
            "Email verified — save your profile to apply the change.",
            needsPassword && /* @__PURE__ */ jsxs("div", { className: "mt-2 w-full space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "email-pwd-post", className: "text-xs text-muted-foreground", children: "Current password to confirm" }),
              /* @__PURE__ */ jsx(Input, { id: "email-pwd-post", type: "password", autoComplete: "off", placeholder: "Your current password", value: emailCurrentPwd, onChange: (e) => setEmailCurrentPwd(e.target.value) })
            ] })
          ] }),
          !user?.email && !emailInput && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Adding an email lets you recover your account and receive order updates." })
        ] }),
        /* @__PURE__ */ jsx(Button, { onClick: () => saveProfile.mutate(), disabled: !canSaveProfile, children: saveProfile.isPending ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
          " Saving…"
        ] }) : "Save changes" }),
        emailChanged && emailStep === "idle" && emailValid && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Send a verification code to confirm your new email before saving." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Phone, { className: "h-4 w-4" }),
        "Phone number"
      ] }) }),
      /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium font-mono", children: user?.phone || "—" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Current phone number" })
          ] }),
          user?.phone_verified ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 text-xs font-medium text-emerald-600", children: [
            /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5" }),
            "Verified"
          ] }) : /* @__PURE__ */ jsx("span", { className: "text-xs text-amber-600", children: "Not verified" })
        ] }),
        !showPhoneForm ? /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: () => setShowPhoneForm(true), className: "gap-2", children: [
          /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" }),
          "Change phone number"
        ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-4 rounded-lg border border-border p-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "New phone number" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "We'll send a verification code to confirm your new number. Your current password is also required." }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "New number" }),
            /* @__PURE__ */ jsx("div", { className: "relative", children: /* @__PURE__ */ jsx(CountryPhoneInput, { country: newCountry, localNumber: newLocalNumber, onCountryChange: (c) => {
              setNewCountry(c);
              setPhoneToken(null);
              setVerifiedNewPhone(null);
            }, onLocalNumberChange: (n) => {
              setNewLocalNumber(n);
              setPhoneToken(null);
              setVerifiedNewPhone(null);
            }, disabled: newPhoneVerified }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Verification" }),
            /* @__PURE__ */ jsx(Msg91Widget, { phone: newFullPhone, purpose: "profile_phone", onVerified: (token, phone) => {
              setPhoneToken(token);
              setVerifiedNewPhone(phone);
              toast.success("New phone verified!");
            }, disabled: !newPhoneReady, isVerified: newPhoneVerified })
          ] }),
          newPhoneVerified && /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "phone-pwd", children: "Current password" }),
            /* @__PURE__ */ jsx(Input, { id: "phone-pwd", type: "password", autoComplete: "off", placeholder: "Confirm with your current password", value: phonePwd, onChange: (e) => setPhonePwd(e.target.value) }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Required to confirm sensitive account changes." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
            /* @__PURE__ */ jsx(Button, { onClick: () => savePhone.mutate(), disabled: savePhone.isPending || !newPhoneVerified || !phonePwd, children: savePhone.isPending ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
              " Saving…"
            ] }) : "Save new phone" }),
            /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: resetPhoneForm, disabled: savePhone.isPending, children: "Cancel" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { children: "Change password" }) }),
      /* @__PURE__ */ jsx(CardContent, { className: "space-y-4", children: !showPwdForm ? /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setShowPwdForm(true), children: "Change password" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "curr-pwd", children: "Current password" }),
          /* @__PURE__ */ jsx(Input, { id: "curr-pwd", type: "password", autoComplete: "current-password", value: pwd.current_password, onChange: (e) => setPwd((p) => ({
            ...p,
            current_password: e.target.value
          })) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "new-pwd", children: "New password" }),
          /* @__PURE__ */ jsx(Input, { id: "new-pwd", type: "password", autoComplete: "new-password", value: pwd.new_password, onChange: (e) => setPwd((p) => ({
            ...p,
            new_password: e.target.value
          })) }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Minimum 8 characters." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsx(Button, { onClick: () => savePwd.mutate(), disabled: savePwd.isPending || !pwd.current_password || !pwd.new_password, children: savePwd.isPending ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
            " Updating…"
          ] }) : "Update password" }),
          /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => {
            setShowPwdForm(false);
            setPwd({
              current_password: "",
              new_password: ""
            });
          }, children: "Cancel" })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(ProfileAddresses, {})
  ] });
}
export {
  ProfilePage as component
};
