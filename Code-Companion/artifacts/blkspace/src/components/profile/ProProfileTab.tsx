import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, GraduationCap, Sparkles } from "lucide-react";
import { toast } from "sonner";

export interface ProProfileData {
  headline: string;
  openToWork: boolean;
  major: string;
  graduationYear: string;
  skills: string[];
  experience: string;
  portfolioUrl: string;
}

const EMPTY: ProProfileData = {
  headline: "",
  openToWork: false,
  major: "",
  graduationYear: "",
  skills: [],
  experience: "",
  portfolioUrl: "",
};

interface ProProfileTabProps {
  initialJson?: string;
  isOwn: boolean;
  onSave?: (json: string) => void;
}

/** LinkedIn / Handshake professional layer */
export function ProProfileTab({ initialJson, isOwn, onSave }: ProProfileTabProps) {
  const [data, setData] = useState<ProProfileData>(EMPTY);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    if (!initialJson) return;
    try {
      const parsed = JSON.parse(initialJson) as Partial<ProProfileData>;
      setData({ ...EMPTY, ...parsed });
    } catch {
      setData(EMPTY);
    }
  }, [initialJson]);

  const save = () => {
    onSave?.(JSON.stringify(data));
    toast.success("Pro profile saved");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Briefcase className="h-4 w-4" />
        Handshake + LinkedIn style — internships, skills, open to work
      </div>

      {data.openToWork && (
        <Badge className="bg-green-600">Open to internships & collabs</Badge>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Professional headline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isOwn ? (
            <>
              <Input
                placeholder="e.g. CS junior · TSU · seeking summer SWE internship"
                value={data.headline}
                onChange={(e) => setData({ ...data, headline: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.openToWork}
                  onChange={(e) => setData({ ...data, openToWork: e.target.checked })}
                />
                Open to work / internships
              </label>
            </>
          ) : (
            <p className="font-medium">{data.headline || "No headline yet"}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Education
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {isOwn ? (
            <>
              <Input
                placeholder="Major"
                value={data.major}
                onChange={(e) => setData({ ...data, major: e.target.value })}
              />
              <Input
                placeholder="Grad year"
                value={data.graduationYear}
                onChange={(e) => setData({ ...data, graduationYear: e.target.value })}
              />
            </>
          ) : (
            <p className="text-sm">
              {data.major || "—"} · Class of {data.graduationYear || "—"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {data.skills.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
          {isOwn && (
            <div className="flex gap-2">
              <Input
                placeholder="Add skill"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && skillInput.trim()) {
                    setData({
                      ...data,
                      skills: [...data.skills, skillInput.trim()],
                    });
                    setSkillInput("");
                  }
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Experience & portfolio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isOwn ? (
            <>
              <Textarea
                placeholder="Research, orgs, internships..."
                value={data.experience}
                onChange={(e) => setData({ ...data, experience: e.target.value })}
                rows={4}
              />
              <Input
                placeholder="Portfolio URL"
                value={data.portfolioUrl}
                onChange={(e) => setData({ ...data, portfolioUrl: e.target.value })}
              />
              <Button onClick={save}>Save pro profile</Button>
            </>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap">{data.experience || "—"}</p>
              {data.portfolioUrl && (
                <a href={data.portfolioUrl} className="text-sm text-primary hover:underline" target="_blank" rel="noreferrer">
                  View portfolio
                </a>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}