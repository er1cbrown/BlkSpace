import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Handshake, Package, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  useMyEscrows,
  useEscrowMarkDelivered,
  useEscrowConfirmRelease,
  useEscrowOpenDispute,
  useEscrowRefund,
} from "@/hooks/use-app-data";
import { getCurrentHandle } from "@/lib/auth";
import { statusLabel } from "@/lib/marketplace-escrow";
import { itemTypeLabel } from "@/lib/myyard-catalog";

export function EscrowTradesPanel() {
  const handle = getCurrentHandle() || "demo_user";
  const { data: trades = [] } = useMyEscrows();
  const markDelivered = useEscrowMarkDelivered();
  const confirmRelease = useEscrowConfirmRelease();
  const openDispute = useEscrowOpenDispute();
  const refund = useEscrowRefund();
  const [deliveryRefs, setDeliveryRefs] = useState<Record<number, string>>({});

  const open = trades.filter(
    (t) => t.status !== "released" && t.status !== "refunded",
  );
  const closed = trades.filter(
    (t) => t.status === "released" || t.status === "refunded",
  );

  if (trades.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Handshake className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-sm">Escrow trades</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Fashion / digital buys use 2-party escrow: pay → deliver → release.
            Your active trades will show here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Handshake className="w-5 h-5 text-primary" />
          <h4 className="font-bold">Escrow trades</h4>
          <Badge variant="secondary" className="text-[10px]">
            {open.length} open
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Multi-campus P2P settlement for mockups, art, tech packs, and merch.
          Platform fee burns; club split pays org treasury on release.
        </p>

        <div className="space-y-2">
          {open.map((t) => {
            const isBuyer = t.buyerHandle === handle;
            const isSeller = t.sellerHandle === handle;
            return (
              <div
                key={t.id}
                className="border rounded-lg p-3 text-sm space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t.listingTitle}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {itemTypeLabel(t.itemType)}
                  </Badge>
                  <Badge className="text-[10px]">{statusLabel(t.status)}</Badge>
                  {t.orgName && (
                    <Badge variant="secondary" className="text-[10px]">
                      {t.orgName}
                      {t.orgFee > 0 ? ` · ${t.orgFee} WB club` : ""}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  @{t.buyerHandle} → @{t.sellerHandle} · {t.amount} WB hold ·
                  seller net {t.sellerNet} WB · {t.townTag}
                </div>
                {t.deliveryRef && (
                  <div className="text-[10px] font-mono break-all">
                    Delivery: {t.deliveryRef}
                    {t.deliveryNote ? ` · ${t.deliveryNote}` : ""}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {isSeller &&
                    (t.status === "funded" || t.status === "disputed") && (
                      <>
                        <Input
                          className="h-8 text-xs max-w-xs"
                          placeholder="CID / link / tracking"
                          value={deliveryRefs[t.id] || ""}
                          onChange={(e) =>
                            setDeliveryRefs({
                              ...deliveryRefs,
                              [t.id]: e.target.value,
                            })
                          }
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={markDelivered.isPending}
                          onClick={async () => {
                            try {
                              await markDelivered.mutateAsync({
                                escrowId: t.id,
                                deliveryRef: deliveryRefs[t.id] || "",
                              });
                              toast.success("Marked delivered");
                            } catch (e) {
                              toast.error(String(e));
                            }
                          }}
                        >
                          <Package className="w-3 h-3 mr-1" />
                          Deliver
                        </Button>
                      </>
                    )}

                  {isBuyer &&
                    (t.status === "delivered" || t.status === "funded") && (
                      <Button
                        size="sm"
                        disabled={confirmRelease.isPending}
                        onClick={async () => {
                          try {
                            const r = await confirmRelease.mutateAsync(t.id);
                            toast.success(
                              `Released ${r.sellerNet ?? t.sellerNet} WB to seller`,
                            );
                          } catch (e) {
                            toast.error(String(e));
                          }
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Confirm & release
                      </Button>
                    )}

                  {(isBuyer || isSeller) &&
                    (t.status === "funded" || t.status === "delivered") && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={openDispute.isPending}
                        onClick={async () => {
                          try {
                            await openDispute.mutateAsync({
                              escrowId: t.id,
                              reason: "Needs review",
                            });
                            toast.message("Dispute opened");
                          } catch (e) {
                            toast.error(String(e));
                          }
                        }}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Dispute
                      </Button>
                    )}

                  {(isBuyer || isSeller) && t.status !== "released" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={refund.isPending}
                      onClick={async () => {
                        try {
                          await refund.mutateAsync(t.id);
                          toast.success("Refunded to buyer · listing reopened");
                        } catch (e) {
                          toast.error(String(e));
                        }
                      }}
                    >
                      Refund
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {closed.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Closed
            </p>
            {closed.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="text-xs text-muted-foreground flex justify-between py-1"
              >
                <span>
                  {t.listingTitle} · {statusLabel(t.status)}
                </span>
                <span>{t.amount} WB</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
