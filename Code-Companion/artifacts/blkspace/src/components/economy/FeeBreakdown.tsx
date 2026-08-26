import { calcPlatformFee, formatFeePercent } from "@/lib/tokenomics";

export function FeeBreakdown({
  amount,
  feeBps,
  className,
}: {
  amount: number;
  feeBps: number;
  className?: string;
}) {
  if (!(amount > 0) || feeBps < 0) return null;
  const fee = calcPlatformFee(amount, feeBps);
  const net = Math.max(0, amount - fee);
  return (
    <div className={className ?? "text-[10px] text-muted-foreground space-y-0.5"}>
      <p>
        Amount {amount} WB · platform fee {formatFeePercent(feeBps)} = {fee} WB
      </p>
      <p>
        Recipient net {net} WB. Fee is{" "}
        <span className="font-medium text-foreground">
          removed from circulation
        </span>
        .
      </p>
    </div>
  );
}
