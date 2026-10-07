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
import "@tanstack/react-query";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
import "@radix-ui/react-label";
function LoginPage() {
  const {
    login
  } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function onSubmit(e) {
    e.preventDefault();
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      toast.error("Email or phone is required.");
      return;
    }
    setLoading(true);
    try {
      const me = await login(cleanIdentifier, password);
      toast.success(`Welcome back, ${me.name.split(" ")[0]}`);
      navigate({
        to: landingForRole(me.role)
      });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else if (err instanceof Error && err.message) {
        toast.error(err.message);
      } else {
        toast.error("Sign in failed");
      }
    } finally {
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsx("div", { className: "grid min-h-screen place-items-center px-4", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-sm", children: [
    /* @__PURE__ */ jsxs(Link, { to: "/", className: "mb-8 flex items-center justify-center gap-2 font-semibold", children: [
      /* @__PURE__ */ jsx("span", { className: "grid h-9 w-9 place-items-center rounded-lg text-primary-foreground", style: {
        background: "var(--gradient-primary)"
      }, children: /* @__PURE__ */ jsx(Utensils, { className: "h-4 w-4" }) }),
      "PreOrder"
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "border-border/60 shadow-[var(--shadow-elegant)]", children: [
      /* @__PURE__ */ jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsx(CardTitle, { children: "Sign in" }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Welcome back. Enter your details." })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { children: [
        /* @__PURE__ */ jsxs("form", { onSubmit, className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "identifier", children: "Email or phone" }),
            /* @__PURE__ */ jsx(Input, { id: "identifier", type: "text", required: true, value: identifier, onChange: (e) => setIdentifier(e.target.value), autoComplete: "username" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Password" }),
            /* @__PURE__ */ jsx(Input, { id: "password", type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password" })
          ] }),
          /* @__PURE__ */ jsx(Button, { type: "submit", className: "w-full", disabled: loading, children: loading ? "Signing in…" : "Sign in" })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "mt-6 text-center text-sm text-muted-foreground", children: [
          "No account?",
          " ",
          /* @__PURE__ */ jsx(Link, { to: "/register", className: "text-primary hover:underline", children: "Create one" })
        ] })
      ] })
    ] })
  ] }) });
}
export {
  LoginPage as component
};
