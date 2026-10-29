import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadAudioFile } from "@/lib/upload-audio";
import { uploadHostedMedia } from "@/lib/remote-media";

vi.mock("@/lib/auth", () => ({
  createHttpAuthHeader: () => "Nostr test",
}));

vi.mock("@/lib/remote-media", () => ({
  uploadHostedMedia: vi.fn(),
}));

const file = new File(["abc"], "lawn.mp3", { type: "audio/mpeg" });
const yardUrl = "/api/yards/audio/aud_0123456789abcdef.mp3";

describe("audio upload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(uploadHostedMedia).mockReset();
  });

  it("keeps an R2 url when the host returns one", async () => {
    vi.mocked(uploadHostedMedia).mockResolvedValue(
      "https://media.example.test/lawn.mp3",
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadAudioFile(file)).resolves.toBe(
      "https://media.example.test/lawn.mp3",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the bytes to the yard when cloud files are not configured", async () => {
    vi.mocked(uploadHostedMedia).mockResolvedValue(null);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true, url: yardUrl }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadAudioFile(file)).resolves.toBe(
      `${window.location.origin}${yardUrl}`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/yards/audio?name=lawn.mp3",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Nostr test",
          "content-type": "audio/mpeg",
        }),
      }),
    );
  });

  it("asks the member to sign in and does not store a local copy", async () => {
    vi.mocked(uploadHostedMedia).mockRejectedValue(
      new Error("Sign in again to save posts or upload media."),
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadAudioFile(file)).rejects.toThrow(/Sign in/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
