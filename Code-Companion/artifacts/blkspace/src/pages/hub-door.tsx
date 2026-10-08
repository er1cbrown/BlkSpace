import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HubPage = {
  slug: string;
  title: string;
  body: string;
  linkUrl: string;
  kind: string;
};

type Door = {
  handle: string;
  headline: string;
  kind: string;
  pages: HubPage[];
};

export default function HubDoorPage() {
  const [, doorParams] = useRoute("/hub/:handle");
  const [, pageParams] = useRoute("/hub/:handle/:slug");
  const handle = pageParams?.handle || doorParams?.handle || "";
  const slug = pageParams?.slug || "";
  const [door, setDoor] = useState<Door | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!handle) return;
    let stop = false;
    setMissing(false);
    fetch(`/api/portfolio/hub/${encodeURIComponent(handle)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("missing");
        return res.json();
      })
      .then((body) => {
        if (!stop) setDoor(body);
      })
      .catch(() => {
        if (!stop) setMissing(true);
      });
    return () => {
      stop = true;
    };
  }, [handle]);

  const page = slug ? door?.pages.find((item) => item.slug === slug) : null;

  return (
    <AppShell>
      <div className="max-w-2xl space-y-4">
        <Link href="/hub" className="text-sm text-muted-foreground">
          All hubs
        </Link>
        {missing && <p>This hub is not published yet.</p>}
        {door && (
          <>
            <h1 className="text-2xl font-bold">@{door.handle}</h1>
            <p className="text-muted-foreground">{door.headline}</p>
            <div className="flex flex-wrap gap-2">
              {door.pages.map((item) => (
                <Link key={item.slug} href={`/hub/${door.handle}/${item.slug}`}>
                  <span className="rounded-full border px-3 py-1 text-sm">{item.title}</span>
                </Link>
              ))}
            </div>
            {slug && page && (
              <Card>
                <CardHeader>
                  <CardTitle>{page.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>{page.body}</p>
                  {page.linkUrl && (
                    <a className="text-primary" href={page.linkUrl}>
                      {page.linkUrl}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
