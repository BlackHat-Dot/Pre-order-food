import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { landingForRole } from "@/lib/nav";
import { ApiError } from "@/lib/api";
import { PublicNav } from "@/components/app/PublicNav";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — PreOrder" }] }),
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    let clean = phone.trim();
    const digits = clean.replace(/\D/g, "");
    if (digits.length === 10) clean = "+91" + digits;
    else if (digits.length > 10 && !clean.startsWith("+")) clean = "+" + digits;
    setLoading(true);
    try {
      const me = await login(clean, password);
      toast.success(`Welcome back, ${me.name.split(" ")[0]}`);
      navigate({ to: landingForRole(me.role) });
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Sign in failed. Check your phone number and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="po" style={{ minHeight: "100vh" }}>
      <PublicNav />
      <div className="wrap split">
        <div>
          <h1 style={{ fontSize: "clamp(40px,6vw,80px)" }}>Your orders are where you left them.</h1>
          <p className="hint" style={{ fontSize: 17, maxWidth: "40ch", marginTop: 20 }}>
            Sign in to see order status, notifications and your loyalty points for each kitchen.
          </p>
        </div>
        <form onSubmit={onSubmit} style={{ borderTop: "1px solid var(--ink)", paddingTop: 8 }}>
          <label className="l" htmlFor="phone">Phone number</label>
          <input id="phone" className="fld" type="tel" required autoComplete="tel" placeholder="+919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <p className="hint">A 10-digit number is read as an Indian (+91) number.</p>
          <label className="l" htmlFor="password">Password</label>
          <input id="password" className="fld" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="po-btn" style={{ marginTop: 28, width: "100%", justifyContent: "center" }} disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
          <p className="hint" style={{ marginTop: 20 }}>No account? <Link to="/register" style={{ color: "var(--sig)", fontWeight: 600 }}>Create one</Link></p>
        </form>
      </div>
    </div>
  );
}
