import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { landingForRole } from "@/lib/nav";
import { useCart } from "@/lib/cart";
import { NotificationBell } from "@/components/app/NotificationBell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const PO_CSS = `
.po{--paper:#eceee7;--ink:#16201b;--mute:#5d6a62;--rule:#c9cec3;--sig:#c9560f;--ok:#2f6b46;
background:var(--paper);color:var(--ink);font-family:"Instrument Sans",system-ui,sans-serif;font-size:16px;line-height:1.55}
.po h1,.po h2,.po h3,.po .disp{font-family:"Bricolage Grotesque","Instrument Sans",sans-serif;letter-spacing:-.03em;line-height:1.02;font-weight:700}
.po a{color:inherit;text-decoration:none}
.po :focus-visible{outline:2px solid var(--sig);outline-offset:3px}
.po-nav{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--paper) 92%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--rule)}
.po-nav .in{max-width:1200px;margin:0 auto;padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.po-nav nav{display:flex;align-items:center;gap:22px;font-size:14px}
.po-nav nav a,.po-nav nav button{background:none;border:0;cursor:pointer;color:var(--ink);font:inherit}
.po-nav nav a:hover,.po-nav nav button:hover{color:var(--sig)}
.po-btn{display:inline-flex;align-items:center;gap:8px;background:var(--ink);color:var(--paper)!important;padding:10px 18px;border:0;cursor:pointer;font:600 14px "Instrument Sans";border-radius:2px}
.po-btn:hover{background:var(--sig)}
.po-btn.ghost{background:none;color:var(--ink)!important;border:1px solid var(--ink)}
.po-btn.ghost:hover{background:var(--ink);color:var(--paper)!important}
.po .fld{display:block;width:100%;border:1px solid var(--ink);background:transparent;padding:12px 14px;font:inherit;color:inherit;border-radius:0}
.po .fld:focus{outline:2px solid var(--sig);outline-offset:2px}
.po label.l{display:block;font-size:14px;font-weight:600;margin:18px 0 6px}
.po .hint{font-size:13px;color:var(--mute);margin-top:6px}
.po .wrap{max-width:1000px;margin:0 auto;padding:48px 24px 96px}
.po .ln{display:flex;justify-content:space-between;gap:16px;padding:16px 0;border-bottom:1px solid var(--rule)}
.po .split{display:grid;grid-template-columns:1.3fr 1fr;gap:64px;align-items:start}
.po .step{width:34px;height:34px;border:1px solid var(--ink);background:none;cursor:pointer;font:inherit;color:inherit}
.po .step:hover:not(:disabled){background:var(--ink);color:var(--paper)}.po .step:disabled{opacity:.35;cursor:default}
@media(max-width:860px){.po .split{grid-template-columns:1fr;gap:32px}}
@media(max-width:700px){.po-nav .hide-s{display:none}}
`;

export function PublicNav() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  function runKitchen() {
    if (!user) return navigate({ to: "/register" });
    if (user.role === "shop_owner") return navigate({ to: "/shops" });
    toast.error("Customer accounts can't run a kitchen. Create a new account with the Kitchen Owner type.");
  }

  return (
    <header className="po po-nav">
      <style>{PO_CSS}</style>
      <div className="in">
        <Link to="/" className="disp" style={{ fontSize: 22 }}>preorder<span style={{ color: "var(--sig)" }}>.</span></Link>
        <nav>
          <button className="hide-s" onClick={runKitchen}>Run a kitchen</button>
          <Link to="/cart">Cart{count > 0 ? ` (${count})` : ""}</Link>
          {user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button>{user.name.split(" ")[0]}</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{user.phone}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to={landingForRole(user.role)}>Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem onClick={runKitchen}>Run a kitchen</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/register" className="po-btn">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
