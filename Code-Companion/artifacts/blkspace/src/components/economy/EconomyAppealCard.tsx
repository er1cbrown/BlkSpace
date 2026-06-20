import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAppSubmitEconomyAppeal,
  useTauriListEconomyAppeals,
} from "@/hooks/use-app-data";
import { MessageSquareWarning } from "lucide-react";

export function EconomyAppealCard() {
  const [appealType, setAppealType] = useState("earn_throttle");
  const [reason, setReason] = useState("");
  const submit = useAppSubmitEconomyAppeal();
  const { data: appeals = [] } = useTauriListEconomyAppeals();

  const handleSubmit = () => {
    if (!reason.trim()) return;
    submit.mutate(
      { appealType, reason: reason.trim() },
      { onSuccess: () => setReason("") },
    );
  };

  return (
    <Card className="border-primary/10 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquareWarning className="w-4 h-4 text-primary" />
          Dispute economy decision
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">
          If WB earn paused (MIDF), withdraw denied, or scores look wrong — file
          an appeal. Logged for human review before mainnet.
        </p>
        <div className="space-y-2">
          <Label htmlFor="appeal-type">Type</Label>
          <Select value={appealType} onValueChange={setAppealType}>
            <SelectTrigger id="appeal-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="earn_throttle">Earn throttle / MIDF</SelectItem>
              <SelectItem value="withdraw_denied">Withdraw denied</SelectItem>
              <SelectItem value="midf_score">MIDF score dispute</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="appeal-reason">What happened?</Label>
          <Textarea
            id="appeal-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe what you expected vs what the wallet showed..."
            rows={3}
            className="text-sm"
          />
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={submit.isPending || !reason.trim()}
        >
          {submit.isPending ? "Submitting..." : "Submit appeal"}
        </Button>
        {submit.isError && (
          <p className="text-destructive text-xs">
            {submit.error instanceof Error
              ? submit.error.message
              : "Appeal failed"}
          </p>
        )}
        {appeals.length > 0 && (
          <div className="pt-2 border-t border-border/40 space-y-1">
            <p className="font-medium text-foreground">Your appeals</p>
            {appeals.slice(0, 3).map((a) => (
              <p key={a.id} className="text-muted-foreground">
                {a.appealType} · {a.status} ·{" "}
                {new Date(a.createdAt).toLocaleDateString()}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}