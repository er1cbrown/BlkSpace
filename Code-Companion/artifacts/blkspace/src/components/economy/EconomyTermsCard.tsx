import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";

export function EconomyTermsCard() {
  return (
    <Card className="border-primary/10 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Economy terms (read once)
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2">
        <p>
          <strong className="text-foreground">WeixBucks (WB)</strong> — earn
          from creating and participating on the yard. Not sold for cash. Daily
          cap 250 WB. Karma is separate and never spendable.
        </p>
        <p>
          <strong className="text-foreground">BKSPC</strong> — optional Solana
          settlement when you withdraw earned WB (eligibility applies). Devnet
          today. Trading on DEX or perps requires future legal approval — not
          guaranteed, not investment advice.
        </p>
        <p>
          Fees on tips and marketplace are listed in the policy panel above.
          Dispute earn pauses or withdraw denials with the appeal form below.
        </p>
      </CardContent>
    </Card>
  );
}