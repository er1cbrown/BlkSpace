import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageSquare, Repeat2, UserPlus, Bell } from "lucide-react";
import { useTauriGetNotifications } from "@/hooks/use-app-data";
import { isTauri, type TauriNotification } from "@/lib/tauri-api";

const mockNotifications = [
  {
    id: 1,
    type: "like",
    user: "jane_doe",
    display: "Jane Doe",
    message: "liked your post",
    time: "2m ago",
    unread: true,
  },
  {
    id: 2,
    type: "reply",
    user: "campus_king",
    display: "Campus King",
    message: "replied to your post",
    time: "15m ago",
    unread: true,
  },
  {
    id: 3,
    type: "repost",
    user: "hbcustudent",
    display: "HBCU Student",
    message: "reposted your post",
    time: "1h ago",
    unread: false,
  },
  {
    id: 4,
    type: "follow",
    user: "new_freshman",
    display: "New Freshman",
    message: "followed you",
    time: "3h ago",
    unread: false,
  },
  {
    id: 5,
    type: "like",
    user: "alumnus_01",
    display: "Alumnus 01",
    message: "liked your post",
    time: "5h ago",
    unread: false,
  },
  {
    id: 6,
    type: "reply",
    user: "grad_student",
    display: "Grad Student",
    message: "replied to your thread",
    time: "1d ago",
    unread: false,
  },
];

const iconMap: Record<string, typeof Heart> = {
  like: Heart,
  reply: MessageSquare,
  repost: Repeat2,
  follow: UserPlus,
};

const iconStyles: Record<string, string> = {
  like: "text-destructive bg-destructive/10",
  reply: "text-primary bg-primary/10",
  repost: "text-green-500 bg-green-500/10",
  follow: "text-accent bg-accent/10",
};

function mapTauriNotification(n: TauriNotification) {
  return {
    id: n.id,
    type: n.notificationType,
    user: n.fromHandle,
    display: n.fromDisplayName,
    message: n.message,
    time: new Date(n.createdAt).toLocaleDateString(),
    unread: n.unread,
  };
}

const typeToIcon: Record<string, string> = {
  like: "like",
  reply: "reply",
  follow: "follow",
};

export default function NotificationsPage() {
  const { data: tauriData } = useTauriGetNotifications();

  const items =
    isTauri() && Array.isArray(tauriData)
      ? tauriData.map(mapTauriNotification)
      : mockNotifications;

  return (
    <AppShell>
        <div className="flex items-center gap-3 mb-8">
          <Bell className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-1">
            {items.map((n) => {
              const Icon = iconMap[n.type] || Bell;
              const style =
                iconStyles[n.type] || "text-muted-foreground bg-muted";
              return (
                <Card
                  key={n.id}
                  className={`border-0 shadow-none rounded-none ${n.unread ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                >
                  <CardContent className="flex items-start gap-4 py-4 px-2">
                    <div className={`p-2 rounded-full shrink-0 ${style}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>{n.display.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-bold">{n.display}</span>{" "}
                        {n.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {n.time}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="mentions">
            <div className="text-center py-20 text-muted-foreground">
              No mentions yet.
            </div>
          </TabsContent>
        </Tabs>
    </AppShell>
  );
}
