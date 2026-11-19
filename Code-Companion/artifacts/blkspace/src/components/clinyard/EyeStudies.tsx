import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { DESK_NOTE } from "@/lib/clinyard/reading-notes";
import {
  EYE_STUDIES,
  eyeStudyHref,
  type EyeStudy,
} from "@/lib/clinyard/eye-studies";

function StudyRow({ study, index }: { study: EyeStudy; index: number }) {
  return (
    <li className="space-y-1 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{index + 1}</span>
        <span className="text-sm font-medium">{study.title}</span>
        <Badge variant="secondary">
          {study.where === "browser" ? "This browser" : "GPU host"}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{study.science}</p>
      <p className="text-xs text-muted-foreground">
        {study.dataset}. {study.model}. {study.metric}.
      </p>
      {study.file ? (
        <a
          className="text-xs underline"
          href={eyeStudyHref(study.file)}
          target="_blank"
          rel="noreferrer"
        >
          {study.file}
        </a>
      ) : (
        <p className="text-xs text-muted-foreground">
          The vision lab card under this list runs these five drawings.
        </p>
      )}
    </li>
  );
}

/** The five BiostatsPython eye notebooks and the schematic eye, as one desk. */
export function EyeStudies() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4 text-teal-500" />
          Eye studies
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          The eye notebooks from the biostats repo, then the schematic eye that
          runs on this page. Training stays on a GPU host. The grade column is
          shared. Class 0 in the PyTorch notebook means DR, and class 0 on the
          APTOS scale means no DR. None of this is a diagnosis.
        </p>
        <p className="text-sm text-muted-foreground">{DESK_NOTE}</p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {EYE_STUDIES.map((study, index) => (
            <StudyRow key={study.id} study={study} index={index} />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
