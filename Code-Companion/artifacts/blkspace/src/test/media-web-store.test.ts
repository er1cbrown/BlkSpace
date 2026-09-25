import { describe, expect, it } from "vitest";
import {
  isWebBlobId,
  webDeleteBlob,
  webGetBlobAsync,
  webStoreFile,
} from "@/lib/media-web-store";
import {
  MAX_UPLOAD_BYTES,
  MEDIA_SIZE_LIMITS,
  WEB_LOCAL_MAX_BYTES,
  checkWebLocalLimit,
} from "@/lib/media-upload";

describe("browser portfolio files", () => {
  it("keeps an attached file after the write", async () => {
    const file = new File(["syllabus"], "syllabus.pdf", {
      type: "application/pdf",
    });
    const { id } = await webStoreFile(
      file,
      "data:application/pdf;base64,c3lsbGFidXM=",
    );
    expect(isWebBlobId(id)).toBe(true);
    const saved = await webGetBlobAsync(id);
    expect(saved?.filename).toBe("syllabus.pdf");
    expect(saved?.dataUrl).toContain("base64");
    webDeleteBlob(id);
    expect(await webGetBlobAsync(id)).toBeNull();
  });

  it("reports sync failure instead of silently claiming success", async () => {
    const file = new File(["clip"], "clip.mp4", { type: "video/mp4" });
    // No server in the test environment, so the portfolio POST cannot succeed.
    // The result must say so rather than reporting a clean save.
    const result = await webStoreFile(file, "data:video/mp4;base64,AAAA");
    expect(isWebBlobId(result.id)).toBe(true);
    expect(result.synced).toBe(false);
    // The file is still readable locally even though it never propagated.
    expect((await webGetBlobAsync(result.id))?.filename).toBe("clip.mp4");
    webDeleteBlob(result.id);
  });
});

describe("browser-local size ceiling", () => {
  it("is far below the transport ceiling it has to survive", () => {
    // The transport allows 50 MB, but base64-in-IndexedDB cannot carry it.
    // If these ever converge, the fallback is safe again and the guard is moot.
    expect(WEB_LOCAL_MAX_BYTES).toBeLessThan(MAX_UPLOAD_BYTES / 4);
    expect(WEB_LOCAL_MAX_BYTES).toBeLessThanOrEqual(
      MEDIA_SIZE_LIMITS.image,
    );
  });

  it("rejects a video the transport would accept", () => {
    const size = MEDIA_SIZE_LIMITS.video;
    const file = {
      name: "big.mp4",
      type: "video/mp4",
      size,
    } as File;
    const result = checkWebLocalLimit(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/browser-only storage/i);
      // The message must point somewhere useful rather than just refusing.
      expect(result.reason).toMatch(/desktop app/i);
    }
  });

  it("accepts a small file", () => {
    const file = {
      name: "small.mp4",
      type: "video/mp4",
      size: 1024,
    } as File;
    expect(checkWebLocalLimit(file).ok).toBe(true);
  });

  it("rejects an empty file", () => {
    const file = { name: "empty.mp4", type: "video/mp4", size: 0 } as File;
    expect(checkWebLocalLimit(file).ok).toBe(false);
  });
});
