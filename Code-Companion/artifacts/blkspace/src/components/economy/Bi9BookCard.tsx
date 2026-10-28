import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BLKCORE_BOOKS } from "@/lib/blkcore-finance";

/**
 * BI9 as a BlkCore finance book. Read-only. No address field, no mint, no
 * WeixBucks control.
 */
export function Bi9BookCard({ className }: { className?: string }) {
  const book = BLKCORE_BOOKS.bi9;
  return (
    <Card id="bi9" className={className ?? "mb-8 border-primary/15"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {book.symbol} on the BlkCore desk
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-3">
        <p>
          {book.name} ({book.symbol}) is the {book.chain} treasury book. It is
          recorded here so the desk can name it. It is not deployed. The mint
          cap is {book.cap}, the minter is unset, and supply is {book.totalSupply}.
        </p>
        <ul className="space-y-1">
          <li>
            Chain {book.chainId}, {book.chain}. Standard {book.standard}.
          </li>
          <li>Yard Sale prices stay in WeixBucks.</li>
          <li>
            Earned WeixBucks settle only as BKSPC, by an explicit withdrawal
            after a funded mint.
          </li>
          <li>
            WeixBucks do not convert into {book.symbol}, and {book.symbol} does
            not convert into WeixBucks.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
