import { describe, expect, it, vi } from "vitest";
import { classifyStorageError, StorageError } from "./errors";
import { createBroadcastNotifier, dataMarker, type MarkerStorage } from "./environment";

const memoryStorage = (): MarkerStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

describe("classifyStorageError", () => {
  const named = (name: string) => Object.assign(new Error(name), { name });
  it.each([
    ["QuotaExceededError", "quota_exceeded"],
    ["VersionError", "schema_too_new"],
    ["AbortError", "aborted"],
    ["TransactionInactiveError", "aborted"],
    ["SecurityError", "unavailable"],
    ["InvalidStateError", "unavailable"],
    ["SomethingElse", "unknown"],
  ])("maps %s to %s", (name, kind) => {
    expect(classifyStorageError(named(name)).kind).toBe(kind);
  });
  it("passes classified errors through and wraps non-errors", () => {
    const e = new StorageError("blocked", "x");
    expect(classifyStorageError(e)).toBe(e);
    expect(classifyStorageError("boom").kind).toBe("unknown");
  });
});

describe("data marker (detects 'had data, now empty')", () => {
  it("remembers that data existed and can be cleared", () => {
    const m = dataMarker(memoryStorage());
    expect(m.hadData()).toBe(false);
    m.mark();
    expect(m.hadData()).toBe(true);
    m.clear();
    expect(m.hadData()).toBe(false);
  });
  it("never throws when storage is blocked or missing", () => {
    const blocked: MarkerStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const m = dataMarker(blocked);
    expect(() => {
      m.mark();
      m.clear();
    }).not.toThrow();
    expect(m.hadData()).toBe(false);
    expect(dataMarker(null).hadData()).toBe(false);
  });
});

describe("broadcast notifier", () => {
  it("posts events on the channel and closes it", () => {
    const channel = { postMessage: vi.fn(), close: vi.fn() };
    const n = createBroadcastNotifier("x", () => channel);
    n.notify({ store: "cart" });
    n.close();
    expect(channel.postMessage).toHaveBeenCalledWith({ store: "cart" });
    expect(channel.close).toHaveBeenCalled();
  });
  it("is a no-op where BroadcastChannel does not exist", () => {
    const n = createBroadcastNotifier("x", () => null);
    expect(() => {
      n.notify({});
      n.close();
    }).not.toThrow();
  });
});
