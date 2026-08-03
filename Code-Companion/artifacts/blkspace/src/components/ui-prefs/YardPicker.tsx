import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HBCU_STATES, catalogStats, searchHbcus } from "@/lib/hbcu-catalog";
import { getYardTheme } from "@/lib/yard-themes";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface YardPickerProps {
  value: string;
  onChange: (yardId: string) => void;
  /** Limit initial grid height */
  maxVisible?: number;
  className?: string;
}

export function YardPicker({
  value,
  onChange,
  maxVisible = 12,
  className,
}: YardPickerProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<string>("all");
  const [control, setControl] = useState<"all" | "public" | "private">("all");
  const stats = catalogStats();

  const results = useMemo(
    () =>
      searchHbcus(query, {
        state: state === "all" ? undefined : state,
        control,
      }),
    [query, state, control],
  );

  const shown = results.slice(0, maxVisible);
  const selected = getYardTheme(value);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {stats.total} HBCUs · {stats.public} public · {stats.private} private
        </span>
        {selected && (
          <Badge variant="secondary" className="text-[10px]">
            Home: {selected.name}
          </Badge>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search school, city, state…"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="all">All states</SelectItem>
            {HBCU_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={control}
          onValueChange={(v) => setControl(v as "all" | "public" | "private")}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Public + private</SelectItem>
            <SelectItem value="public">Public only</SelectItem>
            <SelectItem value="private">Private only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
        {shown.map((h) => {
          const y = getYardTheme(h.id)!;
          const active = value === h.id;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => onChange(h.id)}
              className={cn(
                "rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",
                active
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/30",
              )}
            >
              <div className="font-medium truncate">{y.name}</div>
              <div className="text-muted-foreground truncate">{h.school}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-1">
                <span>
                  {h.city}, {h.state}
                </span>
                <span>·</span>
                <span className="capitalize">{h.control}</span>
              </div>
            </button>
          );
        })}
        {shown.length === 0 && (
          <p className="col-span-2 text-sm text-muted-foreground py-4 text-center">
            No yards match — try another search.
          </p>
        )}
      </div>
      {results.length > maxVisible && (
        <p className="text-[10px] text-muted-foreground text-center">
          Showing {maxVisible} of {results.length} — refine search to narrow.
        </p>
      )}
    </div>
  );
}
