import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { YardBoardPanel } from "@/components/yard/YardBoardPanel";
import { uploadImageFile } from "@/lib/upload-image";

vi.mock("@/lib/upload-image", () => ({
  uploadImageFile: vi.fn(),
}));

vi.mock("@/lib/fit-image", () => ({
  fitImageForUpload: vi.fn(async (file: File) => file),
}));

const yardUrl =
  "http://127.0.0.1:24442/api/yards/image/img_0123456789abcdef.jpg";

describe("yard board photo upload", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(uploadImageFile).mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 404 })),
    );
  });

  it("pins the yard photo link instead of a browser-only id", async () => {
    vi.mocked(uploadImageFile).mockResolvedValue(yardUrl);
    render(<YardBoardPanel yardId="tsu" yardName="TSU" />);

    fireEvent.change(screen.getByLabelText("New board name"), {
      target: { value: "Fits" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add board" }));
    fireEvent.change(screen.getByLabelText("Pin title"), {
      target: { value: "Gold jacket" },
    });
    const file = new File(["jpeg"], "jacket.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Pin photo"), {
      target: { files: [file] },
    });

    await waitFor(() => expect(uploadImageFile).toHaveBeenCalledWith(file));
    fireEvent.click(screen.getByRole("button", { name: "Pin to this yard" }));

    const img = await screen.findByRole("img", { name: "Gold jacket" });
    expect(img.getAttribute("src")).toBe(yardUrl);
  });
});
