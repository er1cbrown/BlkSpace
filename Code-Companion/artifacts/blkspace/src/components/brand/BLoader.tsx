import { cn } from "@/lib/utils";

/**
 * Brand load animation: solid orange capital B dissolves into a clear outline B.
 * Used for route Suspense and any long in-app waits.
 */
export function BLoader({
  label = "Loading",
  className,
  size = "md",
  fullScreen = false,
}: {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}) {
  const dim =
    size === "sm"
      ? "w-14 h-14 text-4xl"
      : size === "lg"
        ? "w-28 h-28 text-7xl"
        : "w-20 h-20 text-6xl";

  const body = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 select-none",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={cn("relative flex items-center justify-center", dim)}>
        {/* Soft orange bloom */}
        <div
          className="absolute inset-[-30%] rounded-full bg-primary/25 blur-2xl b-loader-glow"
          aria-hidden
        />
        {/* Solid orange B (fades out) */}
        <span
          className="absolute inset-0 flex items-center justify-center font-sans font-black tracking-tighter text-primary b-loader-fill"
          aria-hidden
        >
          B
        </span>
        {/* Clear / outline B (fades in) */}
        <span
          className="absolute inset-0 flex items-center justify-center font-sans font-black tracking-tighter b-loader-outline"
          aria-hidden
        >
          B
        </span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground tracking-wide">
          {label}
          <span
            className="b-loader-dots inline-block w-6 text-left"
            aria-hidden
          >
            ...
          </span>
        </p>
        <div className="h-0.5 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 rounded-full bg-primary b-loader-bar" />
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        {body}
      </div>
    );
  }
  return body;
}
