import { AppShell } from "@/components/layout/AppShell";
import { EyeExam } from "@/components/clinyard/EyeExam";

/** Own route so the exam is a page in the BlkSpace router, not only a card. */
export default function EyeExamPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <EyeExam />
      </div>
    </AppShell>
  );
}
