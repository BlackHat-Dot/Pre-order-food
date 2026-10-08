import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { notificationsApi, type NotificationOut } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function timeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (Number.isNaN(diffMs)) return formatDate(dateStr);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(dateStr);
  } catch {
    return formatDate(dateStr);
  }
}

interface NotificationButtonProps {
  className?: string;
  variant?: "ghost" | "outline";
}

export function NotificationButton({
  className,
  variant = "ghost",
}: NotificationButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [], refetch, isFetching } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => notificationsApi.me(),
    enabled: !!user,
    refetchInterval: 25000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      toast.success("All notifications marked as read");
    },
  });

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      void refetch();
    }
  };

  const handleItemClick = (n: NotificationOut) => {
    if (!n.is_read && !markReadMutation.isPending) {
      markReadMutation.mutate(n.id);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={cn(
            "relative h-9 px-2.5 text-foreground hover:bg-muted/80",
            className,
          )}
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm",
                "bg-primary animate-in zoom-in-50",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-32px)] sm:w-88 p-0 shadow-xl border-border bg-popover text-popover-foreground rounded-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/40">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              disabled={markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {isFetching && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-xs gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Loading notifications…</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-muted/60 mb-2">
                <Bell className="h-5 w-5 opacity-40" />
              </div>
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We'll notify you when your orders update.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={cn(
                  "p-3.5 text-left transition-colors cursor-pointer select-none",
                  n.is_read
                    ? "bg-transparent hover:bg-muted/40 opacity-80"
                    : "bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-xs truncate",
                        n.is_read ? "font-medium text-foreground" : "font-semibold text-primary",
                      )}
                    >
                      {n.title || "Notification"}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {n.message}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
