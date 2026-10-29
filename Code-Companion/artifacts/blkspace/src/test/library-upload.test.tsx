import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LibraryPage from "@/pages/library";
import { uploadImageFile } from "@/lib/upload-image";

const mutate = vi.hoisted(() => vi.fn());

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/hooks/use-app-data", () => ({
  useAppCreatePost: () => ({ mutate }),
}));

vi.mock("@/lib/upload-image", () => ({
  uploadImageFile: vi.fn(),
}));

vi.mock("@/lib/fit-image", () => ({
  fitImageForUpload: vi.fn(async (file: File) => file),
}));

const yardUrl =
  "http://127.0.0.1:24442/api/yards/image/img_0123456789abcdef.jpg";

const item = {
  id: 7,
  name: "jacket.jpg",
  album: "Homecoming",
  rating: 5,
  tags: ["Accepted"],
  source: "jacket.jpg",
  status: "ready",
  detail: "",
  file: "jacket.jpg",
  bytes: 1200,
  mime: "image/jpeg",
  width: 1600,
  height: 1200,
  caption: "Gold jacket",
};

describe("library photo upload", () => {
  beforeEach(() => {
    localStorage.clear();
    mutate.mockReset();
    vi.mocked(uploadImageFile).mockReset();
    mutate.mockImplementation((_input, opts) => opts.onSuccess());
    vi.mocked(uploadImageFile).mockResolvedValue(yardUrl);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("manifest")) {
          return Response.json({ ok: true, items: [item] });
        }
        return new Response(new Blob(["jpeg"]), {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        });
      }),
    );
  });

  it("posts the yard photo link", async () => {
    render(<LibraryPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Post to the yard" }),
    );
    await waitFor(() => expect(uploadImageFile).toHaveBeenCalled());
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Gold jacket",
        media_hashes: [yardUrl],
      }),
      expect.any(Object),
    );
  });
});
