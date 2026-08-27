import { Button } from "@/components/ui/button";
import { LAZYVIM_KEYS } from "@/lib/myyard-lazyvim-lesson";

/**
 * Teach a campus user LazyVim in five keys — yard *look* only.
 * Profile song stays on the Music tab.
 */
export function MyYardLazyVimGuide({
  onPasteStarter,
  onOpenLazyVim,
  canOpenLazyVim,
}: {
  onPasteStarter: () => void;
  onOpenLazyVim?: () => void;
  canOpenLazyVim?: boolean;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 text-sm">
      <p className="font-medium">Learn LazyVim in 2 minutes (look only)</p>
      <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
        <li>
          <span className="text-foreground">Look</span> tab → pick a page
          template first (easiest).
        </li>
        <li>
          <span className="text-foreground">Music</span> tab → pick/upload your
          song. LazyVim does not play audio.
        </li>
        <li>Come back here. Paste starter CSS or Open in LazyVim.</li>
        <li>
          In LazyVim: <code className="text-xs">i</code> type,{" "}
          <code className="text-xs">Esc</code>,{" "}
          <code className="text-xs">:wq</code> Enter.
        </li>
        <li>Load CSS file → Save MyYard. Refresh your public page.</li>
      </ol>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 pr-3 font-medium">Key</th>
              <th className="py-1 font-medium">What it does</th>
            </tr>
          </thead>
          <tbody>
            {LAZYVIM_KEYS.map((row) => (
              <tr key={row.keys} className="border-t border-border/60">
                <td className="py-1 pr-3 font-mono text-foreground">
                  {row.keys}
                </td>
                <td className="py-1 text-muted-foreground">{row.does}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onPasteStarter}>
          Paste starter CSS
        </Button>
        {canOpenLazyVim && onOpenLazyVim && (
          <Button type="button" size="sm" onClick={onOpenLazyVim}>
            Open in LazyVim
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Stuck? Esc then <code className="text-xs">:q!</code> Enter leaves
        without saving. You will not break the app.
      </p>
    </div>
  );
}
