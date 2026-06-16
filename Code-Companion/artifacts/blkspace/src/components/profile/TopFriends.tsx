import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export interface TopFriend {
  handle: string;
  label: string;
}

interface TopFriendsProps {
  friends: TopFriend[];
  editable?: boolean;
  onEdit?: () => void;
}

const DEFAULT_FRIENDS: TopFriend[] = [
  { handle: "jane_doe", label: "Jane" },
  { handle: "campus_king", label: "King" },
  { handle: "demo_user", label: "Demo" },
  { handle: "hbcustudent", label: "HBCU" },
];

/** MySpace Top 8 friends strip */
export function TopFriends({ friends, editable, onEdit }: TopFriendsProps) {
  const list = friends.length > 0 ? friends.slice(0, 8) : DEFAULT_FRIENDS;

  return (
    <Card className="border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/5 to-transparent">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-fuchsia-500" />
          Top Friends
        </CardTitle>
        {editable && (
          <button type="button" onClick={onEdit} className="text-xs text-primary hover:underline">
            Edit
          </button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {list.map((f) => (
            <Link key={f.handle} href={`/profile/${f.handle}`}>
              <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <Avatar className="h-14 w-14 border-2 border-fuchsia-500/40 group-hover:border-fuchsia-500 transition-colors">
                  <AvatarFallback className="text-sm font-bold bg-fuchsia-500/10">
                    {f.label.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-medium truncate w-full text-center">
                  {f.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}