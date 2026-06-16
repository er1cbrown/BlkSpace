import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { getCurrentHandle } from "@/lib/auth";
import { townGradient } from "@/lib/towns";

const STORIES = [
  { handle: "jane_doe", label: "Jane" },
  { handle: "campus_king", label: "King" },
  { handle: "demo_user", label: "Demo" },
  { handle: "hbcustudent", label: "HBCU" },
];

export function StoryStrip() {
  const me = getCurrentHandle();

  return (
    <div className="mb-6 -mx-1 overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex gap-4 px-1 min-w-min">
        <Link href={`/profile/${me}`}>
          <div className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 cursor-pointer">
            <div className="relative">
              <div className="w-[68px] h-[68px] rounded-full bg-gradient-to-br from-primary to-accent p-[2px]">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground truncate w-full text-center">
              Your story
            </span>
          </div>
        </Link>
        {STORIES.filter((s) => s.handle !== me).map((s, i) => (
          <Link key={s.handle} href={`/profile/${s.handle}`}>
            <div className="flex flex-col items-center gap-1.5 w-[72px] shrink-0 cursor-pointer">
              <div
                className={`w-[68px] h-[68px] rounded-full bg-gradient-to-br ${townGradient(["tsu", "howard", "famu", "spelman"][i % 4])} p-[2px]`}
              >
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarFallback className="text-sm font-semibold">
                    {s.label.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {s.label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}