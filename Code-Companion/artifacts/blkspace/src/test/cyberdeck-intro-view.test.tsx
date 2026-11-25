import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import { CyberdeckIntro } from "@/components/cyberdeck/CyberdeckIntro";

describe("offline deck intro view", () => {
  it("shows the bench as next and keeps the route off Reticulum", () => {
    render(
      <Router>
        <CyberdeckIntro />
      </Router>,
    );

    expect(screen.getByRole("heading", { name: "Offline deck" })).toBeTruthy();
    expect(screen.getByText("Receiver not connected")).toBeTruthy();
    expect(screen.getByText(/does not request a route/i)).toBeTruthy();
    expect(screen.getByText("Next · 8–16 h")).toBeTruthy();
    expect(screen.getByText(/gpsd prints a live latitude/i)).toBeTruthy();
    expect(screen.getByText(/route stays on the local link/i)).toBeTruthy();
    expect(screen.getByText(/does not carry the route/i)).toBeTruthy();

    const sync = screen.getByRole("link", { name: "Open the sync test" });
    expect(sync.getAttribute("href")).toBe("/mesh-test");
    const map = screen.getByRole("link", { name: "Open the map" });
    expect(map.getAttribute("href")).toBe("/maps");

    const offline = screen.getByText("1. Offline core");
    const mesh = screen.getByText("3. Mesh");
    expect(
      offline.compareDocumentPosition(mesh) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
