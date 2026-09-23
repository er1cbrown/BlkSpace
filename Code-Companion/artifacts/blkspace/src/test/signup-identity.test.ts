import { describe, expect, it } from "vitest";
import {
  bkspcAddress,
  handleError,
  passwordError,
} from "@/lib/signup-identity";

describe("signup identity", () => {
  it("builds an in-app handle and a bkspc.app address", () => {
    expect(handleError("@Weix")).toBeNull();
    expect(bkspcAddress("@Weix")).toBe("weix@bkspc.app");
    expect(handleError("ab")).not.toBeNull();
    expect(handleError("weix blk")).not.toBeNull();
  });

  it("requires a mixed Latin password", () => {
    expect(passwordError("Abcdef1!")).toBeNull();
    expect(passwordError("abcdef1!")).not.toBeNull();
    expect(passwordError("Abcdefg!")).not.toBeNull();
    expect(passwordError("Abcdef12")).not.toBeNull();
    expect(passwordError("Abcdef1!й")).not.toBeNull();
    expect(passwordError("Abcdef1!٣")).not.toBeNull();
  });
});
