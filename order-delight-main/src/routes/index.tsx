import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { shopsApi } from "@/lib/api";
import { PublicNav } from "@/components/app/PublicNav";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "PreOrder — Order now, collect when it's ready" },
      { name: "description", content: "Pre-order from local kitchens, follow your order through each stage and pick it up without queueing." },
    ],
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Instrument+Sans:wght@400;500;600&display=swap" }],
  }),
});

const STAGES = [
  { key: "Placed", status: "pending", you: "You choose items, add notes and an optional pickup time, then pay. The order appears in My orders as pending.", kitchen: "The kitchen receives your items, notes and pickup time.", note: "You can still cancel." },
  { key: "Confirmed", status: "confirmed", you: "The kitchen has accepted the order. You get a notification and the status badge updates.", kitchen: "Accepts the order and plans it against what is already cooking.", note: "You can still cancel." },
  { key: "Preparing", status: "preparing", you: "Cooking has started. Cancelling is no longer offered, because food is being made.", kitchen: "Cooks the order and marks it as preparing.", note: "Cancel is closed." },
  { key: "Ready", status: "ready", you: "Your order is waiting at the counter. Go and collect it; you can also leave a review now.", kitchen: "Marks the order ready and hands it over when you arrive.", note: "Review is open." },
  { key: "Completed", status: "completed", you: "Collected. The order stays in your history, and the shop's loyalty points are in your balance.", kitchen: "Closes the order.", note: "Review is open." },
];

const RULES = [
  ["One kitchen per cart", "Your cart holds items from a single shop. Adding from a different shop starts a new cart, so a pickup is always one place."],
  ["Up to 10 of any item", "Each item or variant is capped at 10 per order, which keeps pre-orders realistic for small kitchens."],
  ["Cancel until cooking starts", "Orders can be cancelled while pending or confirmed. Once a kitchen is preparing, the option is removed."],
  ["Points belong to the shop", "Loyalty is per kitchen. Each shop sets what one point is worth, and checkout shows the discount before you pay. Expect roughly 5% of the payable amount back as points."],
  ["Verified means reviewed", "A shield marks shops an admin has verified. Unverified shops are still listed, with a warning at checkout."],
  ["Reviews follow real orders", "You can review a shop only from an order that was paid or reached ready or completed."],
];

const OWNER = [
  ["Menus with variants", "Items can carry variants such as sizes, each with its own price, and the cart tracks them separately."],
  ["Open and closed, set by you", "Each shop has its own open state, so orders only arrive when you can cook them."],
  ["Your loyalty rate", "You set the discount value of a point per shop."],
  ["Notifications that refresh", "Order activity reaches the bell in the header, refreshed every 15 seconds."],
  ["Admin verification", "Admins review shops and can verify or disable them, which is where the shield on your listing comes from."],
];

function Rule() { return <hr style={{ border: 0, borderTop: "1px solid var(--rule)", margin: 0 }} />; }

function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["shops", "list", search],
    queryFn: () => shopsApi.list({ page: 1, page_size: 24, search: search || undefined }),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  function runKitchen() {
    if (!user) return navigate({ to: "/register" });
    if (user.role === "shop_owner") return navigate({ to: "/shops" });
    toast.error("Customer accounts can't run a kitchen. Create a new account with the Kitchen Owner type.");
  }

  const s = STAGES[stage];
  const open = (data ?? []).filter((x) => x.is_open).length;

  return (
    <div className="po" style={{ minHeight: "100vh" }}>
      <style>{`
        .h-wrap{max-width:1200px;margin:0 auto;padding:0 24px}
        .hero{padding:72px 0 56px;display:grid;grid-template-columns:1.25fr 1fr;gap:56px;align-items:end}
        .hero h1{font-size:clamp(44px,7.2vw,104px)}
        .sec{padding:80px 0}
        .sec h2{font-size:clamp(30px,4vw,52px);max-width:16ch}
        .lead{color:var(--mute);max-width:56ch;margin-top:20px}
        .track{display:grid;grid-template-columns:repeat(5,1fr);position:relative;margin:48px 0 40px}
        .track::before{content:"";position:absolute;left:10%;right:10%;top:15px;height:2px;background:var(--rule)}
        .track .fill{position:absolute;left:10%;top:15px;height:2px;background:var(--sig);transition:width .5s cubic-bezier(.3,.7,.2,1)}
        .track button{background:none;border:0;cursor:pointer;position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;font:500 14px "Instrument Sans";color:var(--mute)}
        .track i{width:32px;height:32px;border-radius:50%;background:var(--paper);border:2px solid var(--rule);transition:all .3s}
        .track .on{color:var(--ink);font-weight:600}.track .on i,.track .done i{border-color:var(--sig);background:var(--sig)}
        .two{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--ink)}
        .two>div{padding:28px 32px 28px 0}.two>div+div{padding-left:32px;border-left:1px solid var(--rule)}
        .two h3{font-size:15px;color:var(--mute);margin-bottom:10px;font-family:"Instrument Sans";letter-spacing:0;font-weight:600}
        .two p{font-size:19px;line-height:1.45;max-width:36ch}
        .row{display:grid;grid-template-columns:2fr 1.4fr 1.6fr auto;gap:20px;align-items:baseline;padding:20px 0;border-bottom:1px solid var(--rule);transition:padding .2s}
        .row:hover{padding-left:12px;color:var(--sig)}
        .rules{display:grid;grid-template-columns:repeat(2,1fr);column-gap:64px}
        .rules div{padding:24px 0;border-top:1px solid var(--rule)}
        .rules h3{font-size:22px;margin-bottom:8px}.rules p{color:var(--mute);max-width:46ch}
        .dark{background:var(--ink);color:var(--paper)}.dark .lead,.dark .rules p{color:#aab5ae}.dark .rules div{border-color:#33433a}
        .field{display:flex;border:1px solid var(--ink);max-width:520px;margin-top:32px}
        .field input{flex:1;border:0;background:transparent;padding:14px 16px;font:inherit;color:inherit;min-width:0}
        .field input:focus{outline:none}.field:focus-within{outline:2px solid var(--sig);outline-offset:3px}
        .field button{border-radius:0}
        @media(max-width:860px){.hero,.two,.rules{grid-template-columns:1fr}.two>div+div{padding-left:0;border-left:0;border-top:1px solid var(--rule)}
          .row{grid-template-columns:1fr auto}.row .addr{display:none}.track button{font-size:11px}.sec{padding:56px 0}}
        @media(prefers-reduced-motion:reduce){*{transition:none!important}}
      `}</style>
      <PublicNav />

      <section className="h-wrap hero">
        <div>
          <h1>Order now.<br />Collect when it's ready.</h1>
          <form className="field" role="search" onSubmit={(e) => { e.preventDefault(); setSearch(q); document.getElementById("shops")?.scrollIntoView({ behavior: "smooth" }); }}>
            <input aria-label="Search kitchens" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a kitchen, cuisine or city" />
            <button className="po-btn" type="submit">Search</button>
          </form>
        </div>
        <p className="lead" style={{ marginTop: 0 }}>
          PreOrder lets you place an order with a local kitchen before you leave, pay for it, and follow it from accepted to ready. You arrive to food that has been made for you, not a queue.
          {data && <><br /><br /><strong style={{ color: "var(--ink)" }}>{data.length}</strong> {data.length === 1 ? "kitchen" : "kitchens"} listed, <strong style={{ color: "var(--ink)" }}>{open}</strong> open right now.</>}
        </p>
      </section>
      <Rule />

      <section className="h-wrap sec">
        <h2>Follow one order, stage by stage.</h2>
        <p className="lead">Every order moves through the same stages. Select one to see what you see and what the kitchen is doing at that point.</p>
        <div className="track" role="tablist" aria-label="Order stages">
          <div className="fill" style={{ width: `${stage * 20}%` }} />
          {STAGES.map((st, i) => (
            <button key={st.key} role="tab" aria-selected={i === stage} className={i === stage ? "on" : i < stage ? "done" : ""} onClick={() => setStage(i)}>
              <i />{st.key}
            </button>
          ))}
        </div>
        <div className="two" aria-live="polite">
          <div><h3>What you see</h3><p>{s.you}</p></div>
          <div><h3>What the kitchen does</h3><p>{s.kitchen}</p><p style={{ marginTop: 14, color: "var(--sig)", fontSize: 15, fontWeight: 600 }}>{s.note} Status: {s.status}</p></div>
        </div>
      </section>
      <Rule />

      <section id="shops" className="h-wrap sec">
        <h2>{search ? `Kitchens matching “${search}”` : "Kitchens taking orders"}</h2>
        {search && <button className="po-btn ghost" style={{ marginTop: 20 }} onClick={() => { setSearch(""); setQ(""); }}>Clear search</button>}
        <div style={{ marginTop: 40, borderTop: "1px solid var(--ink)" }}>
          {isLoading && <p className="lead">Loading kitchens…</p>}
          {isError && <p className="lead">Kitchens could not be loaded. <button className="po-btn ghost" onClick={() => refetch()}>Try again</button></p>}
          {data?.length === 0 && <p className="lead" style={{ padding: "24px 0" }}>{search ? "No kitchen matches that search. Try a city or cuisine instead." : "No kitchens are listed yet."}</p>}
          {data?.map((shop) => (
            <Link key={shop.id} to="/shops/$shopId" params={{ shopId: shop.id }} className="row">
              <span className="disp" style={{ fontSize: 24 }}>{shop.name}{shop.is_verified && <span title="Verified by an admin" style={{ color: "var(--ok)", fontSize: 14, marginLeft: 10, fontFamily: "Instrument Sans", letterSpacing: 0 }}>Verified</span>}</span>
              <span style={{ color: "var(--mute)" }}>{shop.cuisine}</span>
              <span className="addr" style={{ color: "var(--mute)", fontSize: 14 }}>{shop.address}</span>
              <span style={{ fontSize: 14, color: shop.is_open ? "var(--ok)" : "var(--mute)", fontWeight: 600 }}>
                {shop.is_open ? "Open" : "Closed"}{shop.rating ? ` · ${Number(shop.rating).toFixed(1)}★` : ""}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dark">
        <div className="h-wrap sec">
          <h2>What to know before you order.</h2>
          <p className="lead">The rules the app enforces, written out so nothing surprises you at checkout.</p>
          <div className="rules" style={{ marginTop: 48 }}>
            {RULES.map(([t, d]) => <div key={t}><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="h-wrap sec">
        <h2>Running a kitchen on PreOrder.</h2>
        <p className="lead">Owners get a dashboard built around the same order stages customers see.</p>
        <div className="rules" style={{ marginTop: 48 }}>
          {OWNER.map(([t, d]) => <div key={t}><h3>{t}</h3><p style={{ color: "var(--mute)" }}>{d}</p></div>)}
        </div>
        <button className="po-btn" style={{ marginTop: 32 }} onClick={runKitchen}>Open a kitchen</button>
      </section>
      <Rule />

      <footer className="h-wrap" style={{ padding: "28px 24px", display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "space-between", fontSize: 14, color: "var(--mute)" }}>
        <span className="disp" style={{ color: "var(--ink)", fontSize: 18 }}>preorder<span style={{ color: "var(--sig)" }}>.</span></span>
        <span style={{ display: "flex", gap: 20 }}>
          <Link to="/cart">Cart</Link>
          <button onClick={runKitchen} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", color: "inherit" }}>Run a kitchen</button>
          {user ? (
            <button onClick={() => logout()} style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", color: "inherit" }}>Sign out</button>
          ) : (
            <Link to="/login">Sign in</Link>
          )}
        </span>
        <span>© {new Date().getFullYear()} PreOrder</span>
      </footer>
    </div>
  );
}
