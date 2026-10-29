import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageZoom } from "@/components/ui/image-zoom";
import { PostExpand } from "@/components/social/PostExpand";
import { MediaDisplay } from "@/components/ui/media-display";

describe("post zoom", () => {
  it("lays a photo over the page and closes from the backdrop", () => {
    const onClose = vi.fn();
    render(
      <ImageZoom
        src="https://media.example.test/photo.jpg"
        alt="photo.jpg"
        onClose={onClose}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "photo.jpg" });
    expect(dialog.parentElement).toBe(document.body);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the photo open when the picture itself is clicked", () => {
    const onClose = vi.fn();
    render(
      <ImageZoom
        src="https://media.example.test/photo.jpg"
        alt="photo.jpg"
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("img", { name: "photo.jpg" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens a post over the yard", () => {
    const onClose = vi.fn();
    render(
      <PostExpand
        post={{
          id: 42,
          authorHandle: "ada",
          authorDisplayName: "Ada",
          content: "Band practice at seven",
          townTag: "tsu",
          mediaBlobs: [],
          likesCount: 3,
          repliesCount: 1,
          repostsCount: 0,
        }}
        onClose={onClose}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Post" });
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(screen.getByText("Band practice at seven")).toBeTruthy();
    expect(screen.getByText("@ada · tsu")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("expands a wall photo from the post", async () => {
    render(<MediaDisplay hashes={["https://media.example.test/photo.jpg"]} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Expand photo.jpg" }),
    );
    expect(screen.getByRole("dialog", { name: "photo.jpg" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "photo.jpg" })).toBeNull();
  });
});
