import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { Bell, Loader2, CheckCheck, MailOpen, Utensils, ShoppingBag, User2, LogOut } from "lucide-react";
import { k as cn, a as apiRequest, B as Button, u as useAuth } from "./router-DQr6eapq.js";
import { l as landingForRole } from "./nav-CWlJKvXT.js";
import { u as useCart, D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, d as DropdownMenuLabel, e as DropdownMenuSeparator, f as DropdownMenuItem } from "./dropdown-menu-CRgp8eCB.js";
import * as React from "react";
import { useState } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { toast } from "sonner";
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(PopoverPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  PopoverPrimitive.Content,
  {
    ref,
    align,
    sideOffset,
    className: cn(
      "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: rawNotifications = [], isLoading } = useQuery({
    queryKey: ["notifications", "me"],
    queryFn: () => apiRequest("/api/v1/notifications/me"),
    refetchInterval: 15e3
    // Poll every 15s to capture immediate order shifts
  });
  const notifications = rawNotifications.slice(0, 5);
  const markRead = useMutation({
    mutationFn: (id) => apiRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", "me"] })
  });
  const markAllAsRead = useMutation({
    mutationFn: () => apiRequest("/api/v1/notifications/read-all", {
      method: "POST"
      // Binds directly to your Python FastAPI @router.post router path
    }),
    onSuccess: () => {
      toast.success("All updates marked as read!");
      qc.invalidateQueries({ queryKey: ["notifications", "me"] });
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to update notification standings.");
    }
  });
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const hasUnread = unreadCount > 0;
  return /* @__PURE__ */ jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "icon", className: "relative rounded-full h-9 w-9", children: [
      /* @__PURE__ */ jsx(Bell, { className: "h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" }),
      hasUnread && /* @__PURE__ */ jsx("span", { className: "absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[9px] font-black text-white animate-in zoom-in duration-200 shadow-sm", children: unreadCount })
    ] }) }),
    /* @__PURE__ */ jsxs(PopoverContent, { align: "end", className: "w-80 rounded-2xl p-1 shadow-xl border-border/60 mt-1", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/20 rounded-t-xl", children: [
        /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-foreground", children: "Notifications (Max 5)" }),
        hasUnread && /* @__PURE__ */ jsxs(
          Button,
          {
            variant: "ghost",
            size: "sm",
            onClick: (e) => {
              e.stopPropagation();
              markAllAsRead.mutate();
            },
            disabled: markAllAsRead.isPending,
            className: "h-7 text-[11px] font-bold text-primary hover:text-primary/90 hover:bg-primary/5 rounded-lg px-2 gap-1 transition-all",
            children: [
              markAllAsRead.isPending ? /* @__PURE__ */ jsx(Loader2, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ jsx(CheckCheck, { className: "h-3.5 w-3.5" }),
              "Mark all as read"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "max-h-80 overflow-y-auto", children: isLoading ? /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin text-primary" }),
        /* @__PURE__ */ jsx("span", { children: "Syncing alerts tray..." })
      ] }) : !notifications.length ? /* @__PURE__ */ jsxs("div", { className: "py-10 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground", children: [
        /* @__PURE__ */ jsx(MailOpen, { className: "h-5 w-5 opacity-40 stroke-[1.5]" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs font-medium", children: "All caught up! No notifications." })
      ] }) : notifications.map((n) => /* @__PURE__ */ jsx(
        "div",
        {
          className: `flex flex-col gap-1 border-b last:border-0 p-3 text-xs transition-colors cursor-pointer select-none mx-1 my-0.5 rounded-xl ${!n.is_read ? "bg-primary/5 font-medium border-l-2 border-primary rounded-l-none" : "opacity-80 hover:bg-muted/40"}`,
          onClick: () => !n.is_read && markRead.mutate(n.id),
          children: /* @__PURE__ */ jsxs("div", { className: "flex w-full items-start justify-between gap-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5 text-left", children: [
              n.title && /* @__PURE__ */ jsx("span", { className: "font-bold text-foreground", children: n.title }),
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground leading-normal", children: n.message })
            ] }),
            !n.is_read && /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-1.5 shadow-sm animate-pulse" })
          ] })
        },
        n.id
      )) })
    ] })
  ] });
}
function PublicNav() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  return /* @__PURE__ */ jsx("header", { className: "sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-xl", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6", children: [
    /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2 font-semibold tracking-tight hover:opacity-90 transition-opacity", children: [
      /* @__PURE__ */ jsx(
        "span",
        {
          className: "grid h-8 w-8 place-items-center rounded-lg text-primary-foreground",
          style: { background: "var(--gradient-primary)" },
          children: /* @__PURE__ */ jsx(Utensils, { className: "h-4 w-4" })
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "text-lg", children: "PreOrder" })
    ] }),
    /* @__PURE__ */ jsxs("nav", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(Link, { to: "/cart", children: /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", className: "gap-2 rounded-xl", children: [
        /* @__PURE__ */ jsx(ShoppingBag, { className: "h-4 w-4" }),
        /* @__PURE__ */ jsx("span", { children: "Cart" }),
        count > 0 && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground animate-in zoom-in duration-200", children: count })
      ] }) }),
      user ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(NotificationBell, {}),
        /* @__PURE__ */ jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "gap-2 rounded-xl", children: [
            /* @__PURE__ */ jsx(User2, { className: "h-4 w-4" }),
            /* @__PURE__ */ jsx("span", { children: user.name.split(" ")[0] })
          ] }) }),
          /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "end", className: "w-52 rounded-xl p-1 shadow-lg mt-1", children: [
            /* @__PURE__ */ jsx(DropdownMenuLabel, { className: "text-xs text-muted-foreground font-normal px-2 py-1.5 truncate", children: user.email }),
            /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
            /* @__PURE__ */ jsx(DropdownMenuItem, { asChild: true, className: "rounded-lg cursor-pointer", children: /* @__PURE__ */ jsx(Link, { to: landingForRole(user.role), children: "Dashboard" }) }),
            /* @__PURE__ */ jsx(DropdownMenuItem, { asChild: true, className: "rounded-lg cursor-pointer", children: /* @__PURE__ */ jsx(Link, { to: "/profile", children: "Profile" }) }),
            /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
            /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => logout(), className: "rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer", children: [
              /* @__PURE__ */ jsx(LogOut, { className: "mr-2 h-4 w-4" }),
              /* @__PURE__ */ jsx("span", { children: "Log out" })
            ] })
          ] })
        ] })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Link, { to: "/login", children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "rounded-xl", children: "Sign in" }) }),
        /* @__PURE__ */ jsx(Link, { to: "/register", children: /* @__PURE__ */ jsx(Button, { size: "sm", className: "rounded-xl", children: "Get started" }) })
      ] })
    ] })
  ] }) });
}
export {
  PublicNav as P
};
