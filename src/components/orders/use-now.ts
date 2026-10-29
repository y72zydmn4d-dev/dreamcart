"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The browser clock, rounded down to `intervalMs` and re-read every `intervalMs` (display only: stored order state
 * never depends on this timer). The snapshot is a pure function of the clock, so it is stable between reads and
 * changes only when a boundary is crossed; the subscription is stable per component, so React never resubscribes
 * (an unstable subscribe function, or a snapshot that differs between two reads, makes React render in a loop).
 * The server render and the first client render use `serverNowMs` so hydration matches.
 */
export function useNow(intervalMs: number, serverNowMs = 0): number {
  const subscribe = useCallback(
    (notify: () => void) => {
      const timer = setInterval(notify, intervalMs);
      return () => clearInterval(timer);
    },
    [intervalMs],
  );
  const getSnapshot = useCallback(
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    [intervalMs],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => serverNowMs);
}
