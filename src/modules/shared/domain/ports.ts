/**
 * Everything non-deterministic enters the domain through these two interfaces (ARCHITECTURE §2):
 * there is no `Date.now()` and no `Math.random()` in domain code. Adapters (browser, tests) provide them.
 */
export interface Clock {
  /** Epoch milliseconds. */
  nowMs(): number;
}

export interface IdGenerator {
  /** A new random UUID (v4 text form). */
  uuid(): string;
  /** `count` cryptographically random bytes. */
  randomBytes(count: number): Uint8Array;
}

/** A clock that always returns the same instant; used by tests and by pure callers that already hold a time. */
export const fixedClock = (nowMs: number): Clock => ({ nowMs: () => nowMs });

export const isoToMs = (iso: string): number => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new RangeError(`Invalid ISO timestamp: ${iso}`);
  return ms;
};
