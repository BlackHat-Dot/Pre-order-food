import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api"; // Your custom fetch wrapper

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", "me"],
    queryFn: () => apiRequest<any[]>("/api/v1/notifications/me"),
    refetchInterval: 30000, // Poll every 30s
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", "me"] }),
  });

  
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 font-semibold">Notifications</div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications?.length ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`flex flex-col gap-1 border-b p-4 text-sm ${!n.is_read ? "bg-muted/50" : ""}`}
                onClick={() => !n.is_read && markRead.mutate(n.id)}
              >
                <span className="font-semibold">{n.title}</span>
                <span className="text-muted-foreground">{n.message}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}