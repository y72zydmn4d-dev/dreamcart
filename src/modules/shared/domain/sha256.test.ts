import { describe, expect, it } from "vitest";
import { canonicalJson, sha256Hex } from "./sha256";

describe("sha256Hex", () => {
  it.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
  ])("matches the published vector for %j", (input, expected) => {
    expect(sha256Hex(input)).toBe(expected);
  });
  it("handles multi-block and non-ASCII input like Node's implementation", async () => {
    const { createHash } = await import("node:crypto");
    for (const text of [
      "a".repeat(1000),
      "Điện thoại — tai nghe 🎧".repeat(40),
      "x".repeat(55),
      "x".repeat(56),
      "x".repeat(64),
    ]) {
      expect(sha256Hex(text)).toBe(createHash("sha256").update(text).digest("hex"));
    }
  });
});

describe("canonicalJson", () => {
  it("is independent of key order and drops undefined", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: undefined }], c: "x" } })).toBe(
      canonicalJson({ a: { c: "x", d: [2, { z: 1 }] }, b: 1 }),
    );
  });
  it("keeps array order", () => {
    expect(canonicalJson([2, 1])).not.toBe(canonicalJson([1, 2]));
  });
});
