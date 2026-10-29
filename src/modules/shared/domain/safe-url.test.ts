import { describe, expect, it } from "vitest";
import { parseSafeUrl, toSafeHref } from "./safe-url";

describe("parseSafeUrl", () => {
  it("accepts a plain https URL unchanged", () => {
    const result = parseSafeUrl("https://example.com/a/b?x=1");
    expect(result).toEqual({ ok: true, url: "https://example.com/a/b?x=1", removedParams: [] });
  });

  it("normalizes case and whitespace and removes tracking parameters, keeping the rest in order", () => {
    const result = parseSafeUrl(
      "  HTTP://Example.COM/Path?utm_source=a&b=2&fbclid=zzz&a=1&gclid=q&UTM_Medium=m#top ",
    );
    expect(result).toEqual({
      ok: true,
      url: "http://example.com/Path?b=2&a=1#top",
      removedParams: ["utm_source", "fbclid", "gclid", "UTM_Medium"],
    });
  });

  it("drops the query entirely when only tracking parameters were present", () => {
    const result = parseSafeUrl("https://example.com/?utm_source=a");
    expect(result).toMatchObject({ ok: true, url: "https://example.com/" });
  });

  it.each([
    ["javascript:alert(1)"],
    ["JaVaScRiPt:alert(1)"],
    ["java\nscript:alert(1)"],
    ["data:text/html,<script>alert(1)</script>"],
    ["vbscript:msgbox(1)"],
    ["file:///etc/passwd"],
    ["ftp://example.com/x"],
    ["blob:https://example.com/id"],
  ])("rejects the unsupported scheme in %j", (input) => {
    expect(parseSafeUrl(input)).toEqual({ ok: false, reason: "unsupported_scheme" });
  });

  it.each([["https://user:pass@example.com/"], ["https://user@example.com/"]])(
    "rejects embedded credentials in %s",
    (input) => {
      expect(parseSafeUrl(input)).toEqual({ ok: false, reason: "has_credentials" });
    },
  );

  it.each([["example.com"], ["//example.com/x"], ["/relative/path"], ["http://"], ["not a url"]])(
    "rejects non-absolute or malformed input %j",
    (input) => {
      expect(parseSafeUrl(input)).toEqual({ ok: false, reason: "invalid" });
    },
  );

  it("rejects empty and over-long input", () => {
    expect(parseSafeUrl("")).toEqual({ ok: false, reason: "empty" });
    expect(parseSafeUrl("   \n ")).toEqual({ ok: false, reason: "empty" });
    expect(parseSafeUrl(`https://example.com/${"a".repeat(2100)}`)).toEqual({
      ok: false,
      reason: "too_long",
    });
  });
});

describe("toSafeHref", () => {
  it("returns the normalized URL for safe input and null otherwise", () => {
    expect(toSafeHref("https://example.com/p?utm_campaign=x")).toBe("https://example.com/p");
    expect(toSafeHref("javascript:alert(1)")).toBeNull();
    expect(toSafeHref("")).toBeNull();
  });
});
