import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Product wordmark: orange capital B + rest of BlkSpace.
 * Trademark-intent UI mark — never render whole name as BKSPC.
 */
export function BrandMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass =
    size === "sm"
      ? "text-lg"
      : size === "lg"
        ? "text-3xl"
        : size === "xl"
          ? "text-5xl md:text-7xl"
          : "text-2xl";

  return (
    <span
      className={cn(
        "font-sans font-bold tracking-tighter select-none",
        sizeClass,
        className,
      )}
      aria-label={BRAND.name}
    >
      <span className="text-primary">B</span>
      <span className="text-foreground">lkSpace</span>
    </span>
  );
}
