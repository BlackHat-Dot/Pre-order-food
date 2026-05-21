import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2, MailOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api"; // Your custom fetch wrapper
import { toast } from "sonner";

interface NotificationOut {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  title?: string; // Optional field if your DB schema is just text messages
}

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // 1. Fetch live notification items from the user feed
  const { data: rawNotifications = [], isLoading } = useQuery<NotificationOut[]>({
    queryKey: ["notifications", "me"],
    queryFn: () => apiRequest<NotificationOut[]>("/api/v1/notifications/me"),
    refetchInterval: 15000, // Poll every 15s to capture immediate order shifts
  });

  // 🚀 FIXED: Enforce strict maximum display array slice footprint of exactly 5 elements
  const notifications = rawNotifications.slice(0, 5);

  // 2. Clear out single specific alert node state
  const markRead = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", "me"] }),
  });

  // 🚀 FIXED: Incorporated the missing "Mark all as read" structural database mutation call
  const markAllAsRead = useMutation({
    mutationFn: () =>
      apiRequest<void>("/api/v1/notifications/read-all", {
        method: "POST", // Binds directly to your Python FastAPI @router.post router path
      }),
    onSuccess: () => {
      toast.success("All updates marked as read!");
      qc.invalidateQueries({ queryKey: ["notifications", "me"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update notification standings.");
    },
  });

  // Calculate remaining unread badge index counters derived out of our capped array view
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const hasUnread = unreadCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9">
          <Bell className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          
          {/* Dynamic Counter Bubble Indicator Badge for the top button */}
          {hasUnread && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[9px] font-black text-white animate-in zoom-in duration-200 shadow-sm">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-80 rounded-2xl p-1 shadow-xl border-border/60 mt-1">
        
        {/* DROPDOWN HEADER AREA WITH MARK-ALL-AS-READ LINK TRIGGER */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/20 rounded-t-xl">
          <span className="text-xs font-bold text-foreground">Notifications (Max 5)</span>
          
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation(); // Prevent the layout from breaking or snapping shut on click
                markAllAsRead.mutate();
              }}
              disabled={markAllAsRead.isPending}
              className="h-7 text-[11px] font-bold text-primary hover:text-primary/90 hover:bg-primary/5 rounded-lg px-2 gap-1 transition-all"
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Mark all as read
            </Button>
          )}
        </div>

        {/* NOTIFICATION ITEM STREAMING FEED CONTAINER */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Syncing alerts tray...</span>
            </div>
          ) : !notifications.length ? (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <MailOpen className="h-5 w-5 opacity-40 stroke-[1.5]" />
              <p className="text-xs font-medium">All caught up! No notifications.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`flex flex-col gap-1 border-b last:border-0 p-3 text-xs transition-colors cursor-pointer select-none mx-1 my-0.5 rounded-xl ${
                  !n.is_read 
                    ? "bg-primary/5 font-medium border-l-2 border-primary rounded-l-none" 
                    : "opacity-80 hover:bg-muted/40"
                }`}
                onClick={() => !n.is_read && markRead.mutate(n.id)}
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5 text-left">
                    {n.title && <span className="font-bold text-foreground">{n.title}</span>}
                    <span className="text-muted-foreground leading-normal">{n.message}</span>
                  </div>
                  {!n.is_read && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary mt-1.5 shadow-sm animate-pulse" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </PopoverContent>
    </Popover>
  );
}