import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, msg91Api, usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PO_CSS } from "@/components/app/PublicNav";
import {
  CountryPhoneInput,
  DEFAULT_COUNTRY,
  buildE164,
  isPhoneValid,
  type Country,
} from "@/components/phone";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, refresh } = useAuth();

  // ── Name ───────────────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  // ── Save profile (name) ────────────────────────────────────────────────────
  const saveProfile = useMutation({
    mutationFn: async () => {
      return usersApi.updateProfile({ name });
    },
    onSuccess: async () => {
      toast.success("Profile updated successfully.");
      await refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to save profile"),
  });

  const canSaveProfile =
    !saveProfile.isPending &&
    name.trim().length >= 2 &&
    name.trim() !== (user?.name ?? "").trim();

  // ── Phone change ───────────────────────────────────────────────────────────
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [newCountry, setNewCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [newLocalNumber, setNewLocalNumber] = useState("");
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [verifiedNewPhone, setVerifiedNewPhone] = useState<string | null>(null);
  const [phonePwd, setPhonePwd] = useState("");
  const [phoneVerifying, setPhoneVerifying] = useState(false);

  const newFullPhone = buildE164(newCountry.dialCode, newLocalNumber);
  const newPhoneReady = isPhoneValid(newCountry, newLocalNumber);
  const newPhoneVerified = !!phoneToken && !!verifiedNewPhone;

  function resetPhoneForm() {
    setNewLocalNumber("");
    setNewCountry(DEFAULT_COUNTRY);
    setPhoneToken(null);
    setVerifiedNewPhone(null);
    setPhonePwd("");
    setShowPhoneForm(false);
  }

  async function handleDirectVerifyPhone() {
    if (!newPhoneReady) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    setPhoneVerifying(true);
    try {
      const res = await msg91Api.verify({
        phone: newFullPhone,
        purpose: "profile_phone",
        access_token: "direct_verify",
      });
      setPhoneToken(res.verification_token);
      setVerifiedNewPhone(res.phone || newFullPhone);
      toast.success("Phone verified directly! (Telecom SMS bypassed)");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Phone verification failed");
    } finally {
      setPhoneVerifying(false);
    }
  }

  const savePhone = useMutation({
    mutationFn: () => {
      if (!verifiedNewPhone || !phoneToken) throw new ApiError(400, "Verify your new phone number first.");
      if (!phonePwd) throw new ApiError(400, "Enter your current password to confirm the change.");
      return usersApi.updateProfile({
        phone: verifiedNewPhone,
        phone_verification_token: phoneToken,
        current_password: phonePwd,
      });
    },
    onSuccess: async () => {
      toast.success("Phone number updated successfully.");
      resetPhoneForm();
      await refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update phone"),
  });

  // ── Password change ────────────────────────────────────────────────────────
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });

  const savePwd = useMutation({
    mutationFn: () => {
      if (!pwd.current_password || !pwd.new_password) throw new ApiError(400, "Fill in both password fields.");
      return usersApi.updatePassword(pwd);
    },
    onSuccess: () => {
      toast.success("Password updated successfully.");
      setPwd({ current_password: "", new_password: "" });
      setShowPwdForm(false);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update password"),
  });

  const H = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{ fontSize: 26, marginTop: 56, paddingBottom: 8, borderBottom: "1px solid var(--ink)" }}>{children}</h2>
  );
  return (
    <div className="po" style={{ margin: -24, padding: "40px 24px", minHeight: "100%" }}>
      <style>{PO_CSS}</style>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(36px,5vw,60px)" }}>Profile</h1>
        <p className="hint" style={{ fontSize: 16 }}>Signed in as a {user?.role ? user.role.replace("_", " ") : "user"}. Account type can't be changed.</p>

        <H>Name</H>
        <label className="l" htmlFor="profile-name">Full name</label>
        <input id="profile-name" className="fld" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="po-btn" style={{ marginTop: 16 }} onClick={() => saveProfile.mutate()} disabled={!canSaveProfile}>
          {saveProfile.isPending ? "Saving…" : "Save name"}
        </button>

        <H>Phone number</H>
        <div className="ln" style={{ border: 0 }}>
          <span style={{ fontFamily: "monospace" }}>{user?.phone || "—"}</span>
          <span style={{ color: user?.phone_verified ? "var(--ok)" : "var(--sig)", fontWeight: 600, fontSize: 14 }}>{user?.phone_verified ? "Verified" : "Not verified"}</span>
        </div>
        {!showPhoneForm ? (
          <button className="po-btn ghost" onClick={() => setShowPhoneForm(true)}>Change phone number</button>
        ) : (
          <div>
            <p style={{ borderLeft: "3px solid var(--sig)", paddingLeft: 12, fontSize: 14 }}>
              SMS codes are not sent in this environment. Verifying marks the new number as verified directly.
            </p>
            <label className="l">New number</label>
            <CountryPhoneInput country={newCountry} localNumber={newLocalNumber}
              onCountryChange={(c) => { setNewCountry(c); setPhoneToken(null); setVerifiedNewPhone(null); }}
              onLocalNumberChange={(n) => { setNewLocalNumber(n); setPhoneToken(null); setVerifiedNewPhone(null); }}
              disabled={newPhoneVerified} />
            <button type="button" className="po-btn ghost" style={{ marginTop: 12 }} disabled={!newPhoneReady || phoneVerifying || newPhoneVerified} onClick={handleDirectVerifyPhone}>
              {phoneVerifying ? "Verifying…" : newPhoneVerified ? "Number verified" : "Verify number"}
            </button>
            {newPhoneVerified && (
              <>
                <label className="l" htmlFor="phone-pwd">Current password</label>
                <input id="phone-pwd" className="fld" type="password" autoComplete="current-password" value={phonePwd} onChange={(e) => setPhonePwd(e.target.value)} />
                <p className="hint">Required to confirm a phone number change.</p>
              </>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button className="po-btn" onClick={() => savePhone.mutate()} disabled={savePhone.isPending || !newPhoneVerified || !phonePwd}>{savePhone.isPending ? "Saving…" : "Save phone number"}</button>
              <button className="po-btn ghost" onClick={resetPhoneForm} disabled={savePhone.isPending}>Cancel</button>
            </div>
          </div>
        )}

        <H>Password</H>
        {!showPwdForm ? (
          <button className="po-btn ghost" style={{ marginTop: 16 }} onClick={() => setShowPwdForm(true)}>Change password</button>
        ) : (
          <div>
            <label className="l" htmlFor="curr-pwd">Current password</label>
            <input id="curr-pwd" className="fld" type="password" autoComplete="current-password" value={pwd.current_password} onChange={(e) => setPwd((p) => ({ ...p, current_password: e.target.value }))} />
            <label className="l" htmlFor="new-pwd">New password</label>
            <input id="new-pwd" className="fld" type="password" autoComplete="new-password" value={pwd.new_password} onChange={(e) => setPwd((p) => ({ ...p, new_password: e.target.value }))} />
            <p className="hint">Minimum 8 characters.</p>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button className="po-btn" onClick={() => savePwd.mutate()} disabled={savePwd.isPending || !pwd.current_password || !pwd.new_password}>{savePwd.isPending ? "Updating…" : "Update password"}</button>
              <button className="po-btn ghost" onClick={() => { setShowPwdForm(false); setPwd({ current_password: "", new_password: "" }); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
