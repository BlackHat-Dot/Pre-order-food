import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationsApi, type NotificationOut } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";

export function NotificationBell() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<NotificationOut[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        return await notificationsApi.list();
      } catch {
        return [];
      }
    },
    refetchInterval: 15000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}>
          Alerts{unreadCount > 0 && <span style={{ marginLeft: 6, background: "var(--sig)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 2 }}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="po w-80 p-0 sm:w-96" style={{ background: "var(--paper)", borderRadius: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--ink)" }}>
          <DropdownMenuLabel className="p-0 disp" style={{ fontSize: 18 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : "Notifications"}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button className="hint" style={{ background: "none", border: 0, cursor: "pointer", textDecoration: "underline" }} disabled={markAllRead.isPending} onClick={() => markAllRead.mutate()}>
              Mark all read
            </button>
          )}
        </div>
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {isLoading ? (
            <p className="hint" style={{ padding: 20 }}>Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="hint" style={{ padding: 20 }}>Nothing yet. Order updates will appear here.</p>
          ) : (
            notifications.map((n) => (
              <button key={n.id} onClick={() => { if (!n.is_read) markRead.mutate(n.id); }}
                style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: 0, borderBottom: "1px solid var(--rule)", borderLeft: `3px solid ${n.is_read ? "transparent" : "var(--sig)"}`, padding: "12px 16px", cursor: "pointer", font: "inherit", color: "inherit" }}>
                <span style={{ display: "block", fontWeight: n.is_read ? 500 : 700, fontSize: 14 }}>{n.title}</span>
                <span className="hint" style={{ display: "block", marginTop: 2 }}>{n.message}</span>
                <span className="hint" style={{ display: "block", fontSize: 12 }}>{formatDate(n.created_at)}</span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
