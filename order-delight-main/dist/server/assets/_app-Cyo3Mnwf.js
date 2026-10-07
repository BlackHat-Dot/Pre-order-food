import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useRouterState, Link, useNavigate, Outlet } from "@tanstack/react-router";
import * as React from "react";
import { useState, useEffect } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { X, PanelLeft, Utensils, ShoppingBag, Store, Sparkles, User2, LogOut, LayoutDashboard, Users, Receipt, Gift, ShieldCheck, AlertTriangle } from "lucide-react";
import { k as cn, b as TooltipProvider, B as Button, c as Tooltip, d as TooltipTrigger, e as TooltipContent, u as useAuth, l as healthApi, s as shopsApi, D as Dialog, f as DialogContent, g as DialogHeader, h as DialogTitle, i as DialogDescription, j as DialogFooter } from "./router-DQr6eapq.js";
import { I as Input } from "./input-B-ZXk5uj.js";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { S as Skeleton } from "./skeleton-B35717OU.js";
import { B as Badge } from "./badge-sM2V1NmW.js";
import { u as useCart, D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, d as DropdownMenuLabel, e as DropdownMenuSeparator, f as DropdownMenuItem, c as cart } from "./dropdown-menu-CRgp8eCB.js";
import { useQuery } from "@tanstack/react-query";
import "sonner";
import "@radix-ui/react-tooltip";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-dropdown-menu";
const MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(void 0);
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}
const Separator = React.forwardRef(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => /* @__PURE__ */ jsx(
  SeparatorPrimitive.Root,
  {
    ref,
    decorative,
    orientation,
    className: cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    ),
    ...props
  }
));
Separator.displayName = SeparatorPrimitive.Root.displayName;
const Sheet = DialogPrimitive.Root;
const SheetPortal = DialogPrimitive.Portal;
const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Overlay,
  {
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props,
    ref
  }
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
      }
    },
    defaultVariants: {
      side: "right"
    }
  }
);
const SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SheetPortal, { children: [
  /* @__PURE__ */ jsx(SheetOverlay, {}),
  /* @__PURE__ */ jsxs(DialogPrimitive.Content, { ref, className: cn(sheetVariants({ side }), className), ...props, children: [
    /* @__PURE__ */ jsxs(DialogPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary", children: [
      /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
      /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
    ] }),
    children
  ] })
] }));
SheetContent.displayName = DialogPrimitive.Content.displayName;
const SheetHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", { className: cn("flex flex-col space-y-2 text-center sm:text-left", className), ...props });
SheetHeader.displayName = "SheetHeader";
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Title,
  {
    ref,
    className: cn("text-lg font-semibold text-foreground", className),
    ...props
  }
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const SidebarContext = React.createContext(null);
function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}
const SidebarProvider = React.forwardRef(
  ({
    defaultOpen = true,
    open: openProp,
    onOpenChange: setOpenProp,
    className,
    style,
    children,
    ...props
  }, ref) => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);
    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;
    const setOpen = React.useCallback(
      (value) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      },
      [setOpenProp, open]
    );
    const toggleSidebar = React.useCallback(() => {
      return isMobile ? setOpenMobile((open2) => !open2) : setOpen((open2) => !open2);
    }, [isMobile, setOpen, setOpenMobile]);
    React.useEffect(() => {
      const handleKeyDown = (event) => {
        if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          toggleSidebar();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);
    const state = open ? "expanded" : "collapsed";
    const contextValue = React.useMemo(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    );
    return /* @__PURE__ */ jsx(SidebarContext.Provider, { value: contextValue, children: /* @__PURE__ */ jsx(TooltipProvider, { delayDuration: 0, children: /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
          ...style
        },
        className: cn(
          "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
          className
        ),
        ref,
        ...props,
        children
      }
    ) }) });
  }
);
SidebarProvider.displayName = "SidebarProvider";
const Sidebar = React.forwardRef(
  ({
    side = "left",
    variant = "sidebar",
    collapsible = "offcanvas",
    className,
    children,
    ...props
  }, ref) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
    if (collapsible === "none") {
      return /* @__PURE__ */ jsx(
        "div",
        {
          className: cn(
            "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
            className
          ),
          ref,
          ...props,
          children
        }
      );
    }
    if (isMobile) {
      return /* @__PURE__ */ jsx(Sheet, { open: openMobile, onOpenChange: setOpenMobile, ...props, children: /* @__PURE__ */ jsxs(
        SheetContent,
        {
          "data-sidebar": "sidebar",
          "data-mobile": "true",
          className: "w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden",
          style: {
            "--sidebar-width": SIDEBAR_WIDTH_MOBILE
          },
          side,
          children: [
            /* @__PURE__ */ jsxs(SheetHeader, { className: "sr-only", children: [
              /* @__PURE__ */ jsx(SheetTitle, { children: "Sidebar" }),
              /* @__PURE__ */ jsx(SheetDescription, { children: "Displays the mobile sidebar." })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "flex h-full w-full flex-col", children })
          ]
        }
      ) });
    }
    return /* @__PURE__ */ jsxs(
      "div",
      {
        ref,
        className: "group peer hidden text-sidebar-foreground md:block",
        "data-state": state,
        "data-collapsible": state === "collapsed" ? collapsible : "",
        "data-variant": variant,
        "data-side": side,
        children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: cn(
                "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
                "group-data-[collapsible=offcanvas]:w-0",
                "group-data-[side=right]:rotate-180",
                variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
              )
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: cn(
                "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
                side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
                // Adjust the padding for floating and inset variants.
                variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
                className
              ),
              ...props,
              children: /* @__PURE__ */ jsx(
                "div",
                {
                  "data-sidebar": "sidebar",
                  className: "flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow",
                  children
                }
              )
            }
          )
        ]
      }
    );
  }
);
Sidebar.displayName = "Sidebar";
const SidebarTrigger = React.forwardRef(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  return /* @__PURE__ */ jsxs(
    Button,
    {
      ref,
      "data-sidebar": "trigger",
      variant: "ghost",
      size: "icon",
      className: cn("h-7 w-7", className),
      onClick: (event) => {
        onClick?.(event);
        toggleSidebar();
      },
      ...props,
      children: [
        /* @__PURE__ */ jsx(PanelLeft, {}),
        /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Toggle Sidebar" })
      ]
    }
  );
});
SidebarTrigger.displayName = "SidebarTrigger";
const SidebarRail = React.forwardRef(
  ({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar();
    return /* @__PURE__ */ jsx(
      "button",
      {
        ref,
        "data-sidebar": "rail",
        "aria-label": "Toggle Sidebar",
        tabIndex: -1,
        onClick: toggleSidebar,
        title: "Toggle Sidebar",
        className: cn(
          "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
          "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
          "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
          "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
          "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
          "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
          className
        ),
        ...props
      }
    );
  }
);
SidebarRail.displayName = "SidebarRail";
const SidebarInset = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "main",
      {
        ref,
        className: cn(
          "relative flex w-full flex-1 flex-col bg-background",
          "md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
          className
        ),
        ...props
      }
    );
  }
);
SidebarInset.displayName = "SidebarInset";
const SidebarInput = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx(
    Input,
    {
      ref,
      "data-sidebar": "input",
      className: cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      ),
      ...props
    }
  );
});
SidebarInput.displayName = "SidebarInput";
const SidebarHeader = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "div",
      {
        ref,
        "data-sidebar": "header",
        className: cn("flex flex-col gap-2 p-2", className),
        ...props
      }
    );
  }
);
SidebarHeader.displayName = "SidebarHeader";
const SidebarFooter = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "div",
      {
        ref,
        "data-sidebar": "footer",
        className: cn("flex flex-col gap-2 p-2", className),
        ...props
      }
    );
  }
);
SidebarFooter.displayName = "SidebarFooter";
const SidebarSeparator = React.forwardRef(({ className, ...props }, ref) => {
  return /* @__PURE__ */ jsx(
    Separator,
    {
      ref,
      "data-sidebar": "separator",
      className: cn("mx-2 w-auto bg-sidebar-border", className),
      ...props
    }
  );
});
SidebarSeparator.displayName = "SidebarSeparator";
const SidebarContent = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "div",
      {
        ref,
        "data-sidebar": "content",
        className: cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
          className
        ),
        ...props
      }
    );
  }
);
SidebarContent.displayName = "SidebarContent";
const SidebarGroup = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "div",
      {
        ref,
        "data-sidebar": "group",
        className: cn("relative flex w-full min-w-0 flex-col p-2", className),
        ...props
      }
    );
  }
);
SidebarGroup.displayName = "SidebarGroup";
const SidebarGroupLabel = React.forwardRef(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      ref,
      "data-sidebar": "group-label",
      className: cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className
      ),
      ...props
    }
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";
const SidebarGroupAction = React.forwardRef(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      ref,
      "data-sidebar": "group-action",
      className: cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  );
});
SidebarGroupAction.displayName = "SidebarGroupAction";
const SidebarGroupContent = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "div",
    {
      ref,
      "data-sidebar": "group-content",
      className: cn("w-full text-sm", className),
      ...props
    }
  )
);
SidebarGroupContent.displayName = "SidebarGroupContent";
const SidebarMenu = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "ul",
    {
      ref,
      "data-sidebar": "menu",
      className: cn("flex w-full min-w-0 flex-col gap-1", className),
      ...props
    }
  )
);
SidebarMenu.displayName = "SidebarMenu";
const SidebarMenuItem = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "li",
    {
      ref,
      "data-sidebar": "menu-item",
      className: cn("group/menu-item relative", className),
      ...props
    }
  )
);
SidebarMenuItem.displayName = "SidebarMenuItem";
const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline: "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]"
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const SidebarMenuButton = React.forwardRef(
  ({
    asChild = false,
    isActive: isActive2 = false,
    variant = "default",
    size = "default",
    tooltip,
    className,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    const { isMobile, state } = useSidebar();
    const button = /* @__PURE__ */ jsx(
      Comp,
      {
        ref,
        "data-sidebar": "menu-button",
        "data-size": size,
        "data-active": isActive2,
        className: cn(sidebarMenuButtonVariants({ variant, size }), className),
        ...props
      }
    );
    if (!tooltip) {
      return button;
    }
    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip
      };
    }
    return /* @__PURE__ */ jsxs(Tooltip, { children: [
      /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: button }),
      /* @__PURE__ */ jsx(
        TooltipContent,
        {
          side: "right",
          align: "center",
          hidden: state !== "collapsed" || isMobile,
          ...tooltip
        }
      )
    ] });
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";
const SidebarMenuAction = React.forwardRef(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      ref,
      "data-sidebar": "menu-action",
      className: cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      ),
      ...props
    }
  );
});
SidebarMenuAction.displayName = "SidebarMenuAction";
const SidebarMenuBadge = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "div",
    {
      ref,
      "data-sidebar": "menu-badge",
      className: cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  )
);
SidebarMenuBadge.displayName = "SidebarMenuBadge";
const SidebarMenuSkeleton = React.forwardRef(({ className, showIcon = false, ...props }, ref) => {
  const width = "70%";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref,
      "data-sidebar": "menu-skeleton",
      className: cn("flex h-8 items-center gap-2 rounded-md px-2", className),
      ...props,
      children: [
        showIcon && /* @__PURE__ */ jsx(Skeleton, { className: "size-4 rounded-md", "data-sidebar": "menu-skeleton-icon" }),
        /* @__PURE__ */ jsx(
          Skeleton,
          {
            className: "h-4 max-w-(--skeleton-width) flex-1",
            "data-sidebar": "menu-skeleton-text",
            style: {
              "--skeleton-width": width
            }
          }
        )
      ]
    }
  );
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";
const SidebarMenuSub = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "ul",
    {
      ref,
      "data-sidebar": "menu-sub",
      className: cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  )
);
SidebarMenuSub.displayName = "SidebarMenuSub";
const SidebarMenuSubItem = React.forwardRef(
  ({ ...props }, ref) => /* @__PURE__ */ jsx("li", { ref, ...props })
);
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";
const SidebarMenuSubButton = React.forwardRef(({ asChild = false, size = "md", isActive: isActive2, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";
  return /* @__PURE__ */ jsx(
    Comp,
    {
      ref,
      "data-sidebar": "menu-sub-button",
      "data-size": size,
      "data-active": isActive2,
      className: cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className
      ),
      ...props
    }
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";
const customerNav = [
  { title: "Browse shops", url: "/", icon: Store },
  { title: "My orders", url: "/orders", icon: ShoppingBag },
  { title: "Loyalty rewards", url: "/loyalty", icon: Sparkles },
  { title: "Profile", url: "/profile", icon: User2 }
];
const ownerNav = [
  { title: "My shops", url: "/owner", icon: Store },
  { title: "Profile", url: "/profile", icon: User2 }
];
const adminNav = [
  { title: "Command Center", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Shops", url: "/admin/shops", icon: Store },
  { title: "Orders", url: "/admin/orders", icon: Receipt },
  { title: "Loyalty", url: "/admin/loyalty", icon: Gift },
  { title: "Profile", url: "/profile", icon: User2 }
];
function AppSidebar() {
  const { user, logout } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  let items = customerNav;
  let label = "Customer";
  let roleColor = "text-emerald-400";
  let Icon = ShoppingBag;
  if (user?.role === "shop_owner") {
    items = ownerNav;
    label = "Shop Owner";
    roleColor = "text-blue-400";
    Icon = Utensils;
  } else if (user?.role === "admin") {
    items = adminNav;
    label = "Administrator";
    roleColor = "text-amber-400";
    Icon = ShieldCheck;
  }
  return /* @__PURE__ */ jsxs(Sidebar, { collapsible: "icon", children: [
    /* @__PURE__ */ jsx(SidebarHeader, { children: /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2.5 px-2 py-2", children: [
      /* @__PURE__ */ jsx(
        "span",
        {
          className: "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white shadow-lg",
          style: { background: "var(--gradient-primary)" },
          children: /* @__PURE__ */ jsx(Utensils, { className: "h-4 w-4" })
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "grid leading-tight group-data-[collapsible=icon]:hidden", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm font-bold tracking-tight", children: "PreOrder" }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "Skip the queue" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(SidebarContent, { children: /* @__PURE__ */ jsxs(SidebarGroup, { children: [
      /* @__PURE__ */ jsxs(SidebarGroupLabel, { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Icon, { className: `h-3 w-3 ${roleColor}` }),
        /* @__PURE__ */ jsx("span", { className: `text-xs font-semibold ${roleColor}`, children: label })
      ] }),
      /* @__PURE__ */ jsx(SidebarGroupContent, { children: /* @__PURE__ */ jsx(SidebarMenu, { children: items.map((item) => /* @__PURE__ */ jsx(SidebarMenuItem, { children: /* @__PURE__ */ jsx(
        SidebarMenuButton,
        {
          asChild: true,
          isActive: isActive(path, item.url),
          tooltip: item.title,
          className: "transition-all",
          children: /* @__PURE__ */ jsxs(Link, { to: item.url, className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(item.icon, { className: "h-4 w-4" }),
            /* @__PURE__ */ jsx("span", { children: item.title }),
            item.badge && /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "ml-auto text-xs h-4 px-1.5", children: item.badge })
          ] })
        }
      ) }, item.url)) }) })
    ] }) }),
    /* @__PURE__ */ jsxs(SidebarFooter, { className: "pb-2", children: [
      user && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(SidebarSeparator, { className: "group-data-[collapsible=icon]:hidden" }),
        /* @__PURE__ */ jsx("div", { className: "px-3 py-2 group-data-[collapsible=icon]:hidden", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold uppercase", children: user.name.slice(0, 2) }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "truncate text-sm font-medium", children: user.name }),
            /* @__PURE__ */ jsx("div", { className: "truncate text-xs text-muted-foreground", children: user.email })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(
        Button,
        {
          variant: "ghost",
          size: "sm",
          className: "justify-start text-muted-foreground hover:text-destructive w-full",
          onClick: () => logout(),
          children: [
            /* @__PURE__ */ jsx(LogOut, { className: "h-4 w-4" }),
            /* @__PURE__ */ jsx("span", { className: "group-data-[collapsible=icon]:hidden ml-2", children: "Sign out" })
          ]
        }
      )
    ] })
  ] });
}
function isActive(current, target) {
  if (target === "/") return current === "/";
  if (target === "/admin") return current === "/admin";
  if (target === "/owner") return current === "/owner";
  return current.startsWith(target + "/") || current === target;
}
function GlobalCartConflictModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingLine, setPendingLine] = useState(null);
  const currentCart = cart.all();
  const existingShopId = currentCart[0]?.shop_id;
  const incomingShopId = pendingLine?.shop_id;
  const {
    data: oldShop
  } = useQuery({
    queryKey: ["shop", existingShopId],
    queryFn: () => shopsApi.get(existingShopId),
    enabled: !!existingShopId && isOpen
  });
  const {
    data: newShop
  } = useQuery({
    queryKey: ["shop", incomingShopId],
    queryFn: () => shopsApi.get(incomingShopId),
    enabled: !!incomingShopId && isOpen
  });
  useEffect(() => {
    const handleConflict = (e) => {
      const customEvent = e;
      setPendingLine(customEvent.detail.pendingLine);
      setIsOpen(true);
    };
    window.addEventListener("pof_cart_conflict", handleConflict);
    return () => window.removeEventListener("pof_cart_conflict", handleConflict);
  }, []);
  const handleConfirmReplacement = () => {
    if (pendingLine) {
      cart.add(pendingLine, true);
    }
    setIsOpen(false);
    setPendingLine(null);
  };
  return /* @__PURE__ */ jsx(Dialog, { open: isOpen, onOpenChange: setIsOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md rounded-2xl p-6 border-none shadow-2xl", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { className: "flex flex-col items-center text-center space-y-3", children: [
      /* @__PURE__ */ jsx("div", { className: "bg-amber-500/10 text-amber-500 p-3 rounded-2xl border border-amber-500/20 animate-bounce", children: /* @__PURE__ */ jsx(AlertTriangle, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx(DialogTitle, { className: "text-base font-black tracking-tight text-foreground", children: "Switch restaurants?" }),
      /* @__PURE__ */ jsxs(DialogDescription, { className: "text-xs text-muted-foreground leading-relaxed max-w-xs", children: [
        "Your cart already contains selections from",
        " ",
        /* @__PURE__ */ jsx("span", { className: "font-bold text-foreground", children: oldShop?.name || "another restaurant" }),
        ".",
        /* @__PURE__ */ jsx("br", {}),
        /* @__PURE__ */ jsx("br", {}),
        "Would you like to clear your current cart and replace it with your new item from",
        " ",
        /* @__PURE__ */ jsx("span", { className: "font-bold text-primary", children: newShop?.name || "this restaurant" }),
        "?"
      ] })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { className: "flex flex-col sm:flex-row gap-2 sm:justify-center pt-3 w-full", children: [
      /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", onClick: () => setIsOpen(false), className: "rounded-xl text-xs h-10 order-2 sm:order-1 flex-1 font-medium", children: "Keep Existing Items" }),
      /* @__PURE__ */ jsx(Button, { type: "button", onClick: handleConfirmReplacement, className: "rounded-xl text-xs h-10 order-1 sm:order-2 flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold shadow-md shadow-destructive/10", children: "Replace Cart" })
    ] })
  ] }) });
}
function AppLayout() {
  const {
    user,
    loading,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({
    select: (s) => s.location.pathname
  });
  const {
    count
  } = useCart();
  const [backendHealthy, setBackendHealthy] = useState(true);
  useEffect(() => {
    if (!loading && !user) {
      navigate({
        to: "/login"
      });
    }
  }, [loading, user, navigate]);
  useEffect(() => {
    let active = true;
    healthApi.check().then(() => {
      if (active) setBackendHealthy(true);
    }).catch(() => {
      if (active) setBackendHealthy(false);
    });
    return () => {
      active = false;
    };
  }, []);
  if (loading || !user) {
    return /* @__PURE__ */ jsx("div", { className: "grid min-h-screen place-items-center text-sm text-muted-foreground", children: "Loading…" });
  }
  if (path.startsWith("/admin") && user.role !== "admin") {
    return /* @__PURE__ */ jsx(RedirectTo, { to: "/unauthorized" });
  }
  if (path.startsWith("/owner") && user.role !== "shop_owner" && user.role !== "admin") {
    return /* @__PURE__ */ jsx(RedirectTo, { to: "/unauthorized" });
  }
  return /* @__PURE__ */ jsxs(SidebarProvider, { children: [
    /* @__PURE__ */ jsx(AppSidebar, {}),
    /* @__PURE__ */ jsxs(SidebarInset, { children: [
      /* @__PURE__ */ jsxs("header", { className: "sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-3 backdrop-blur", children: [
        /* @__PURE__ */ jsx(SidebarTrigger, {}),
        !backendHealthy && /* @__PURE__ */ jsx("span", { className: "rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-600", children: "Backend unavailable" }),
        /* @__PURE__ */ jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
          user.role === "customer" && /* @__PURE__ */ jsx(Link, { to: "/cart", children: /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", className: "gap-2 relative", children: [
            /* @__PURE__ */ jsx(ShoppingBag, { className: "h-4 w-4" }),
            count > 0 && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground", children: count })
          ] }) }),
          /* @__PURE__ */ jsxs(DropdownMenu, { children: [
            /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "gap-2", children: [
              /* @__PURE__ */ jsx(User2, { className: "h-4 w-4" }),
              user.name.split(" ")[0]
            ] }) }),
            /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "end", className: "w-48", children: [
              /* @__PURE__ */ jsx(DropdownMenuLabel, { children: user.email }),
              /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
              /* @__PURE__ */ jsx(DropdownMenuItem, { asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/profile", children: "Profile" }) }),
              /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
              /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => logout(), children: [
                /* @__PURE__ */ jsx(LogOut, { className: "mr-2 h-4 w-4" }),
                " Sign out"
              ] })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("main", { className: "flex-1 p-4 sm:p-6", children: /* @__PURE__ */ jsx(Outlet, {}) })
    ] }),
    /* @__PURE__ */ jsx(GlobalCartConflictModal, {})
  ] });
}
function RedirectTo({
  to
}) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({
      to
    });
  }, [navigate, to]);
  return null;
}
export {
  AppLayout as component
};
