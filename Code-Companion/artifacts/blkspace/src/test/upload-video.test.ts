import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadVideoFile } from "@/lib/upload-video";
import { uploadHostedMedia } from "@/lib/remote-media";

vi.mock("@/lib/auth", () => ({
  createHttpAuthHeader: () => "Nostr test",
}));

vi.mock("@/lib/remote-media", () => ({
  uploadHostedMedia: vi.fn(),
}));

const file = new File(["abc"], "clip.mp4", { type: "video/mp4" });
const yardUrl = "/api/yards/video/vid_0123456789abcdef.mp4";

describe("video upload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(uploadHostedMedia).mockReset();
  });

  it("keeps a Stream url when the host returns one", async () => {
    vi.mocked(uploadHostedMedia).mockResolvedValue(
      "https://iframe.videodelivery.net/clip",
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadVideoFile(file)).resolves.toBe(
      "https://iframe.videodelivery.net/clip",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the bytes to the yard when Stream is not configured", async () => {
    vi.mocked(uploadHostedMedia).mockResolvedValue(null);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true, url: yardUrl }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadVideoFile(file)).resolves.toBe(
      `${window.location.origin}${yardUrl}`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/yards/video?name=clip.mp4",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Nostr test",
          "content-type": "video/mp4",
        }),
      }),
    );
  });

  it("uses the yard when the server says video uploads are not configured", async () => {
    vi.mocked(uploadHostedMedia).mockRejectedValue(
      new Error("Cloud video uploads are not configured."),
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true, url: yardUrl }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadVideoFile(file)).resolves.toBe(
      `${window.location.origin}${yardUrl}`,
    );
  });

  it("uses the yard when Stream refuses the upload", async () => {
    vi.mocked(uploadHostedMedia).mockRejectedValue(
      new Error(
        "Cloudflare Stream authorization failed (401). Check CLOUDFLARE_API_TOKEN has Account > Stream > Edit for CLOUDFLARE_ACCOUNT_ID.",
      ),
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true, url: yardUrl }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadVideoFile(file)).resolves.toBe(
      `${window.location.origin}${yardUrl}`,
    );
    expect(fetchMock).toHaveBeenCalled();
  });

  it("asks the member to sign in and does not store a local copy", async () => {
    vi.mocked(uploadHostedMedia).mockRejectedValue(
      new Error("Sign in again to save posts or upload media."),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadVideoFile(file)).rejects.toThrow(/Sign in/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
