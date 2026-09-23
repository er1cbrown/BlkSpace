import { beforeEach, describe, expect, it } from "vitest";
import {
  EARN_CAP_MAX,
  EARN_CAP_MIN,
  banHandle,
  clampEarnCap,
  hidePost,
  isHandleBanned,
  isPostHidden,
  listOpenReports,
  reportPost,
} from "@/lib/yard-mod";

describe("yard mod", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("blkspace_handle", "er1cbrown");
  });

  it("keeps the earn cap inside the band", () => {
    expect(clampEarnCap(1)).toBe(EARN_CAP_MIN);
    expect(clampEarnCap(9999)).toBe(EARN_CAP_MAX);
    expect(clampEarnCap(250)).toBe(250);
  });

  it("hides a reported post and can ban the author", () => {
    const report = reportPost({
      postId: 9,
      authorHandle: "@spammer",
      reason: "spam",
    });
    expect(listOpenReports()).toHaveLength(1);
    hidePost(9, report.id);
    expect(isPostHidden(9)).toBe(true);
    expect(listOpenReports()).toHaveLength(0);
    banHandle("spammer");
    expect(isHandleBanned("@spammer")).toBe(true);
  });
});
