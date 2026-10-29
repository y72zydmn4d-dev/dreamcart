import type { Clock, IdGenerator } from "@/modules/shared/domain/ports";

/** Real time and real randomness for the browser. Domain code never reads either directly. */
export const systemClock: Clock = { nowMs: () => Date.now() };

export const browserIds: IdGenerator = {
  uuid: () => crypto.randomUUID(),
  randomBytes: (count) => crypto.getRandomValues(new Uint8Array(count)),
};

/**
 * A tiny localStorage marker that lets the app notice "this browser had DreamCart data and now has none"
 * (cleared site data or storage eviction) and offer an import instead of silently starting blank.
 * It holds no personal data: only the fact that data once existed.
 */
const MARKER_KEY = "dreamcart:had-data";

export interface MarkerStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const dataMarker = (storage: MarkerStorage | null) => ({
  mark() {
    try {
      storage?.setItem(MARKER_KEY, "1");
    } catch {
      // storage can be blocked; the marker is a convenience, not a guarantee
    }
  },
  clear() {
    try {
      storage?.removeItem(MARKER_KEY);
    } catch {
      // see above
    }
  },
  hadData(): boolean {
    try {
      return storage?.getItem(MARKER_KEY) === "1";
    } catch {
      return false;
    }
  },
});

/** Cross-tab "something changed" notifications. A convenience: correctness never depends on delivery. */
export function createBroadcastNotifier(
  name = "dreamcart-changes",
  factory: (name: string) => { postMessage(m: unknown): void; close(): void } | null = (n) =>
    typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(n),
) {
  const channel = factory(name);
  return {
    notify: (event: unknown) => channel?.postMessage(event),
    close: () => channel?.close(),
  };
}
