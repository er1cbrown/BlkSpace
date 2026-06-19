import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Shield, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import {
  isTauri,
  YARD_ROLES,
  type TauriUser,
  type YardRole,
} from "@/lib/tauri-api";
import {
  useTauriListUsers,
  useTauriListYardMembers,
  useTauriListCommunityRoles,
  useTauriSetCommunityRole,
} from "@/hooks/use-app-data";

const ROLE_STYLES: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  Admin: "destructive",
  "Yard Mod": "default",
  Alum: "secondary",
  Student: "outline",
};

export function RoleBadge({ role }: { role: string }) {
  const variant = ROLE_STYLES[role] ?? "outline";
  return (
    <Badge variant={variant} className="text-[10px] uppercase tracking-wide">
      {role}
    </Badge>
  );
}

type MemberRow = {
  handle: string;
  displayName: string;
  weixBucks: number;
  role: string;
};

function AssignRoleDialog({
  open,
  onOpenChange,
  member,
  communityId,
  isMember,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberRow | null;
  communityId: string;
  isMember: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState<YardRole>("Student");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const setRole = useTauriSetCommunityRole();

  const handleOpenChange = (next: boolean) => {
    if (!next) setConfirmOpen(false);
    onOpenChange(next);
    if (next && member) setSelectedRole((member.role as YardRole) || "Student");
  };

  const runAssign = () => {
    if (!member) return;
    if (!isTauri()) {
      toast.success(`@${member.handle} is now ${selectedRole} (demo preview)`);
      setConfirmOpen(false);
      onOpenChange(false);
      return;
    }
    if (!getSessionToken()) {
      toast.error("Sign in to assign roles");
      return;
    }
    if (!isMember) {
      toast.error("Join the yard before assigning roles");
      return;
    }
    setRole.mutate(
      {
        communityId,
        handle: member.handle,
        role: selectedRole,
      },
      {
        onSuccess: () => {
          toast.success(`@${member.handle} is now ${selectedRole}`, {
            description: `Role saved for ${communityId} yard. Badge updated.`,
          });
          setConfirmOpen(false);
          onOpenChange(false);
        },
        onError: (e) => toast.error(String(e)),
      },
    );
  };

  if (!member) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign yard role</DialogTitle>
            <DialogDescription>
              Roles are stored per yard in this install. Yard mods can moderate
              channels and help run pilot tests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{member.displayName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{member.displayName}</div>
                <div className="text-xs text-muted-foreground">
                  @{member.handle}
                </div>
              </div>
              <RoleBadge role={member.role} />
            </div>
            <div className="space-y-1.5">
              <Label>New role</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as YardRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YARD_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={setRole.isPending || selectedRole === member.role}
            >
              Review assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm role change?</AlertDialogTitle>
            <AlertDialogDescription>
              Assign <strong>{selectedRole}</strong> to @{member.handle} in this
              yard. They will see the updated badge on the Members tab
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runAssign} disabled={setRole.isPending}>
              {setRole.isPending ? "Saving..." : `Make ${selectedRole}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function YardMembersPanel({
  communityId,
  communityName,
  isMember,
}: {
  communityId: string;
  communityName: string;
  isMember: boolean;
}) {
  const currentHandle = getCurrentHandle();
  const { data: yardMemberHandles = [] } = useTauriListYardMembers(communityId);
  const { data: roleEntries = [] } = useTauriListCommunityRoles(communityId);
  const { data: allUsers = [] } = useTauriListUsers();
  const [assignTarget, setAssignTarget] = useState<MemberRow | null>(null);

  const roleMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of roleEntries) m[e.handle] = e.role;
    return m;
  }, [roleEntries]);

  const members: MemberRow[] = useMemo(() => {
    if (isTauri() && yardMemberHandles.length > 0) {
      const userByHandle = new Map(
        (allUsers as TauriUser[]).map((u) => [u.handle, u]),
      );
      return yardMemberHandles.map((handle) => {
        const u = userByHandle.get(handle);
        return {
          handle,
          displayName: u?.displayName || handle,
          weixBucks: u?.weixBucks ?? 0,
          role: roleMap[handle] || "Student",
        };
      });
    }
    return Array.from({ length: 6 }).map((_, i) => ({
      handle: `member${i + 1}`,
      displayName: `Member ${i + 1}`,
      weixBucks: 100 + i * 50,
      role: i === 0 ? "Yard Mod" : i === 1 ? "Alum" : "Student",
    }));
  }, [yardMemberHandles, allUsers, roleMap]);

  const myRole = currentHandle
    ? roleMap[currentHandle] || (isMember ? "Student" : "")
    : "";
  const modCount = members.filter(
    (m) => m.role === "Yard Mod" || m.role === "Admin",
  ).length;

  return (
    <div className="space-y-4">
      <Card className="border-primary/10 bg-primary/5">
        <CardContent className="p-4 text-sm space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <Shield className="w-4 h-4 text-primary" />
            Yard moderation (pilot)
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Joined members can assign roles on this device — use Device B bot
            accounts to test mod badges before a live pilot. Roles persist in
            local SQLite per install (not relay-synced yet).
          </p>
          {currentHandle && isMember && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Your role:</span>
              <RoleBadge role={myRole || "Student"} />
              <span className="text-xs text-muted-foreground">
                · {modCount} mod{modCount === 1 ? "" : "s"} in yard
              </span>
            </div>
          )}
          {!isMember && isTauri() && (
            <p className="text-xs text-amber-600">
              Join {communityName} to assign roles to members and bots.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="w-4 h-4" />
          {members.length} yard member{members.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((m) => (
          <Card key={m.handle} className="border-primary/10">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback>{m.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.displayName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{m.handle} · {m.weixBucks} WB
                  </div>
                  <div className="mt-1.5">
                    <RoleBadge role={m.role} />
                  </div>
                </div>
              </div>
              {m.handle !== currentHandle && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1"
                  onClick={() => setAssignTarget(m)}
                  disabled={!isMember && isTauri()}
                >
                  <UserCog className="w-3.5 h-3.5" />
                  Role
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {members.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No yard members yet. Join the yard or create bot accounts on this
            device for Device B testing.
          </CardContent>
        </Card>
      )}

      <AssignRoleDialog
        open={!!assignTarget}
        onOpenChange={(o) => !o && setAssignTarget(null)}
        member={assignTarget}
        communityId={communityId}
        isMember={isMember}
      />
    </div>
  );
}