import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadHostedMedia } from "@/lib/remote-media";
import { uploadImageFile } from "@/lib/upload-image";

vi.mock("@/lib/auth", () => ({
  createHttpAuthHeader: () => "Nostr test",
}));

vi.mock("@/lib/remote-media", () => ({
  uploadHostedMedia: vi.fn(),
}));

const file = new File(["abc"], "cover.jpg", { type: "image/jpeg" });
const yardUrl = "/api/yards/image/img_0123456789abcdef.jpg";

describe("image upload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(uploadHostedMedia).mockReset();
  });

  it("keeps an R2 url when the host returns one", async () => {
    vi.mocked(uploadHostedMedia).mockResolvedValue(
      "https://media.example.test/cover.jpg",
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadImageFile(file)).resolves.toBe(
      "https://media.example.test/cover.jpg",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the bytes to the yard when cloud files are not configured", async () => {
    vi.mocked(uploadHostedMedia).mockResolvedValue(null);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true, url: yardUrl }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadImageFile(file)).resolves.toBe(
      `${window.location.origin}${yardUrl}`,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/yards/image?name=cover.jpg",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
