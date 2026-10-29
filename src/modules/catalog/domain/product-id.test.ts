import { describe, expect, it } from "vitest";
import { parseProductId } from "./product-id";

describe("parseProductId", () => {
  it.each(["a", "0abc", "macbook-air-13-m3", "x".repeat(64)])("accepts %s", (id) => {
    expect(parseProductId(id)).toBe(id);
  });

  it.each([
    ["empty", ""],
    ["leading hyphen", "-abc"],
    ["uppercase", "MacBook"],
    ["space", "has space"],
    ["slash", "a/b"],
    ["path traversal", "../secret"],
    ["encoded dot", "%2e%2e"],
    ["underscore", "a_b"],
    ["dot", "a.b"],
    ["non-ASCII", "tiếng-việt"],
    ["trailing newline", "abc\n"],
    ["too long", "x".repeat(65)],
  ])("rejects %s", (_label, id) => {
    expect(parseProductId(id)).toBeNull();
  });
});
