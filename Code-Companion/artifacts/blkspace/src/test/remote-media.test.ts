import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isRemoteMediaUrl,
  isStreamUrl,
  uploadHostedMedia,
} from "@/lib/remote-media";

vi.mock("@/lib/hosted-api", () => ({
  hostedPost: (url: string, body: unknown) =>
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
}));

describe("hosted media urls", () => {
  it("treats R2 and Stream links as phone-ready media", () => {
    expect(isRemoteMediaUrl("https://pub-abc.r2.dev/portfolio/a.jpg")).toBe(
      true,
    );
    expect(isRemoteMediaUrl("web_abc")).toBe(false);
    expect(isStreamUrl("https://iframe.videodelivery.net/uid")).toBe(true);
    expect(isStreamUrl("https://pub-abc.r2.dev/a.jpg")).toBe(false);
  });
});

describe("hosted video uploads", () => {
  const file = new File(["video bytes"], "clip.mp4", { type: "video/mp4" });
  afterEach(() => vi.unstubAllGlobals());

  it("surfaces Stream authorization errors instead of falling back to a local save", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          ok: false,
          error:
            "Cloudflare Stream authorization failed (403). Check the token's Stream Edit permission.",
        },
        { status: 502 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadHostedMedia(file)).rejects.toThrow(
      "authorization failed (403)",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces network failures instead of pretending the upload service is unconfigured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(uploadHostedMedia(file)).rejects.toThrow(
      "Could not reach the media upload service",
    );
  });

  it.each(["stream not configured", "r2 not configured"])(
    "allows local storage for %s",
    async (error) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json({ ok: false, error }, { status: 503 }),
          ),
      );
      await expect(uploadHostedMedia(file)).resolves.toBeNull();
    },
  );

  it("does not hide other service failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "Temporarily unavailable" }, { status: 503 }),
        ),
    );
    await expect(uploadHostedMedia(file)).rejects.toThrow(
      "Temporarily unavailable",
    );
  });

  it("rejects malformed successful responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ ok: true })),
    );
    await expect(uploadHostedMedia(file)).rejects.toThrow(
      "invalid upload target",
    );
  });

  it("returns the hosted video URL only after the direct upload succeeds", async () => {
    const publicUrl = "https://iframe.videodelivery.net/test-video";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          provider: "stream",
          method: "POST",
          uploadUrl: "https://upload.videodelivery.net/test-target",
          publicUrl,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadHostedMedia(file)).resolves.toBe(publicUrl);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://upload.videodelivery.net/test-target",
      {
        method: "POST",
        body: expect.any(FormData),
      },
    );
  });

  it("reports a failed direct upload", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            provider: "stream",
            method: "POST",
            uploadUrl: "https://upload.videodelivery.net/test-target",
            publicUrl: "https://iframe.videodelivery.net/test-video",
          }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 413 })),
    );

    await expect(uploadHostedMedia(file)).rejects.toThrow(
      "Stream upload failed (413)",
    );
  });
});
