import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { B as Button } from "./router-DQr6eapq.js";
import "@tanstack/react-query";
import "react";
import "sonner";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-dialog";
const SplitComponent = () => /* @__PURE__ */ jsx("div", { className: "grid min-h-screen place-items-center px-4 text-center", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md", children: [
  /* @__PURE__ */ jsx(ShieldAlert, { className: "mx-auto h-12 w-12 text-primary" }),
  /* @__PURE__ */ jsx("h1", { className: "mt-4 text-3xl font-bold", children: "Not authorized" }),
  /* @__PURE__ */ jsx("p", { className: "mt-2 text-muted-foreground", children: "You don't have access to that page with your current role." }),
  /* @__PURE__ */ jsx(Link, { to: "/", className: "mt-6 inline-block", children: /* @__PURE__ */ jsx(Button, { children: "Go home" }) })
] }) });
export {
  SplitComponent as component
};
