import { describe, expect, it } from "vitest";
import {
  isWebBlobId,
  webDeleteBlob,
  webGetBlobAsync,
  webStoreFile,
} from "@/lib/media-web-store";

describe("browser portfolio files", () => {
  it("keeps an attached file after the write", async () => {
    const file = new File(["syllabus"], "syllabus.pdf", {
      type: "application/pdf",
    });
    const id = await webStoreFile(file, "data:application/pdf;base64,c3lsbGFidXM=");
    expect(isWebBlobId(id)).toBe(true);
    const saved = await webGetBlobAsync(id);
    expect(saved?.filename).toBe("syllabus.pdf");
    expect(saved?.dataUrl).toContain("base64");
    webDeleteBlob(id);
    expect(await webGetBlobAsync(id)).toBeNull();
  });
});
