"use client";

import { useSyncExternalStore } from "react";

const subscribers = new Map<number, Set<() => void>>();
const timers = new Map<number, ReturnType<typeof setInterval>>();
const snapshots = new Map<number, number>();

function subscribeEvery(intervalMs: number) {
  return (notify: () => void) => {
    let set = subscribers.get(intervalMs);
    if (!set) {
      set = new Set();
      subscribers.set(intervalMs, set);
    }
    set.add(notify);
    if (!timers.has(intervalMs)) {
      timers.set(
        intervalMs,
        setInterval(() => {
          snapshots.set(intervalMs, Date.now());
          subscribers.get(intervalMs)?.forEach((fn) => fn());
        }, intervalMs),
      );
    }
    return () => {
      set.delete(notify);
      if (set.size === 0) {
        clearInterval(timers.get(intervalMs));
        timers.delete(intervalMs);
        snapshots.delete(intervalMs);
      }
    };
  };
}

/**
 * The browser clock, refreshed every `intervalMs` (display only: stored order state never depends on this timer).
 * The server render and the first client render use `serverNowMs` so hydration matches.
 */
export function useNow(intervalMs: number, serverNowMs = 0): number {
  return useSyncExternalStore(
    (notify) => subscribeEvery(intervalMs)(notify),
    () => {
      const cached = snapshots.get(intervalMs);
      if (cached !== undefined) return cached;
      const now = Date.now();
      snapshots.set(intervalMs, now);
      return now;
    },
    () => serverNowMs,
  );
}
