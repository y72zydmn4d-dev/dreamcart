import { describe, expect, it } from "vitest";
import {
  advanceManually,
  buildScenarioSnapshot,
  cancelOrder,
  canCancel,
  computeOrderState,
  isTerminal,
  newSimulationRecord,
  observeOrderState,
  ORDER_PROGRESS,
  orderStateIndex,
  scheduledDeliveryMs,
  simulationRecordSchema,
  stateWhenCancelled,
  timeDerivedState,
  type OrderState,
  type SimulationRecord,
} from "./simulation";

const T0 = 1_800_000_000_000;

describe("scenario snapshots", () => {
  it("captures Quick (180 s) with the illustrative offsets", () => {
    const s = buildScenarioSnapshot("quick", T0);
    expect(s).toMatchObject({
      scenario: "quick",
      durationSeconds: 180,
      startedAtMs: T0,
      scenarioVersion: 1,
    });
    expect(s.milestoneOffsetsMs).toEqual([0, 18_000, 45_000, 81_000, 135_000, 180_000]);
  });
  it("captures Relaxed (1 h) and Fast (manual, no offsets)", () => {
    expect(buildScenarioSnapshot("relaxed", T0).milestoneOffsetsMs).toEqual([
      0, 360_000, 900_000, 1_620_000, 2_700_000, 3_600_000,
    ]);
    expect(buildScenarioSnapshot("fast", T0)).toMatchObject({
      durationSeconds: null,
      milestoneOffsetsMs: [],
    });
  });
});

describe("time-derived state (Quick)", () => {
  const rec = newSimulationRecord("quick", T0);
  const at = (offsetMs: number) => computeOrderState(rec, T0 + offsetMs);

  it.each([
    [0, "CONFIRMED"],
    [17_999, "CONFIRMED"],
    [18_000, "PREPARING"], // exactly at an offset enters the new state
    [44_999, "PREPARING"],
    [45_000, "PACKED"],
    [80_999, "PACKED"],
    [81_000, "IN_TRANSIT"],
    [135_000, "OUT_FOR_VIRTUAL_DELIVERY"],
    [179_999, "OUT_FOR_VIRTUAL_DELIVERY"],
    [180_000, "VIRTUALLY_DELIVERED"],
    [10_000_000_000, "VIRTUALLY_DELIVERED"], // large elapsed stays delivered
  ] as [number, OrderState][])("+%i ms → %s", (offset, expected) => {
    expect(at(offset)).toBe(expected);
  });

  it("treats negative elapsed (clock before the start) as the first state", () => {
    expect(at(-5_000)).toBe("CONFIRMED");
    expect(timeDerivedState(rec.scenario, T0 - 1)).toBe("CONFIRMED");
  });
});

describe("high-water mark", () => {
  it("is raised only, and a backward clock cannot regress what was shown", () => {
    let rec = newSimulationRecord("quick", T0);
    const first = observeOrderState(rec, T0 + 100_000);
    expect(first.state).toBe("IN_TRANSIT");
    rec = first.record;
    expect(rec.highWater).toBe("IN_TRANSIT");
    const back = observeOrderState(rec, T0 + 1_000);
    expect(back.state).toBe("IN_TRANSIT");
    expect(back.record).toBe(rec); // unchanged object: nothing to write
  });
});

describe("manual (Fast) scenario", () => {
  it("advances exactly one step per press up to delivery, then refuses", () => {
    let rec = newSimulationRecord("fast", T0);
    const seen: OrderState[] = [computeOrderState(rec, T0)];
    for (let i = 0; i < ORDER_PROGRESS.length - 1; i++) {
      const r = advanceManually(rec, T0 + i);
      if (!r.ok) throw new Error("expected advance");
      rec = r.record;
      seen.push(r.state);
    }
    expect(seen).toEqual([...ORDER_PROGRESS]);
    expect(advanceManually(rec, T0)).toMatchObject({ ok: false, error: "already_delivered" });
  });

  it("does not advance timed scenarios and ignores time for Fast", () => {
    expect(advanceManually(newSimulationRecord("quick", T0), T0)).toMatchObject({
      ok: false,
      error: "not_manual",
    });
    expect(computeOrderState(newSimulationRecord("fast", T0), T0 + 10 ** 12)).toBe("CONFIRMED");
  });
});

describe("cancellation (decision P-2)", () => {
  it.each([
    ["CONFIRMED", 0, true],
    ["PREPARING", 18_000, true],
    ["PACKED", 80_999, true],
    ["IN_TRANSIT", 81_000, false],
    ["OUT_FOR_VIRTUAL_DELIVERY", 135_000, false],
    ["VIRTUALLY_DELIVERED", 180_000, false],
  ] as [OrderState, number, boolean][])(
    "at %s (+%i ms) cancellation allowed: %s",
    (state, offset, allowed) => {
      const rec = newSimulationRecord("quick", T0);
      expect(computeOrderState(rec, T0 + offset)).toBe(state);
      expect(canCancel(state)).toBe(allowed);
      const result = cancelOrder(rec, T0 + offset);
      expect(result.ok).toBe(allowed);
      if (result.ok) expect(result.record.cancelledAtMs).toBe(T0 + offset);
      else expect(result.error).toBe("not_cancellable");
    },
  );

  it("decides a cancel racing a transition once, by the clock at that moment", () => {
    const rec = newSimulationRecord("quick", T0);
    // PACKED -> IN_TRANSIT happens at +81 000 ms: one millisecond earlier the cancel wins, at the boundary it loses.
    expect(cancelOrder(rec, T0 + 80_999).ok).toBe(true);
    expect(cancelOrder(rec, T0 + 81_000)).toMatchObject({
      ok: false,
      error: "not_cancellable",
      state: "IN_TRANSIT",
    });
  });

  it("cannot cancel once the user has been shown IN_TRANSIT, even if the clock moves back", () => {
    const seen = observeOrderState(newSimulationRecord("quick", T0), T0 + 100_000).record;
    expect(cancelOrder(seen, T0)).toMatchObject({ ok: false, error: "not_cancellable" });
  });

  it("cancelled is terminal: wins over time and manual steps, and cannot be cancelled again", () => {
    const rec = cancelOrder(newSimulationRecord("quick", T0), T0 + 1_000);
    if (!rec.ok) throw new Error("setup failed");
    expect(computeOrderState(rec.record, T0 + 10 ** 9)).toBe("CANCELLED");
    expect(cancelOrder(rec.record, T0 + 2_000)).toMatchObject({
      ok: false,
      error: "already_cancelled",
    });
    expect(advanceManually(rec.record, T0)).toMatchObject({ ok: false });
    expect(observeOrderState(rec.record, T0 + 10 ** 9).record).toBe(rec.record);
    expect(
      isTerminal("CANCELLED") && isTerminal("VIRTUALLY_DELIVERED") && !isTerminal("PACKED"),
    ).toBe(true);
  });
});

describe("simulationRecordSchema", () => {
  it("round-trips a valid record and rejects tampering", () => {
    const rec = newSimulationRecord("relaxed", T0);
    expect(simulationRecordSchema.parse(rec)).toEqual(rec);
    expect(simulationRecordSchema.safeParse({ ...rec, highWater: "TELEPORTED" }).success).toBe(
      false,
    );
    expect(simulationRecordSchema.safeParse({ ...rec, manualStep: 9 }).success).toBe(false);
    expect(simulationRecordSchema.safeParse({ ...rec, extra: 1 }).success).toBe(false);
  });
});

/**
 * Property test (deterministic PRNG, so a failure is reproducible): over random scenarios and random clock
 * sequences, including clocks that move backward, what the user has been shown never regresses, a cancelled
 * order stays cancelled, a cancel is only accepted in a cancellable state, and the state stays in range.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("property: random clock sequences never regress state", () => {
  it("holds for 400 random histories", () => {
    for (let seed = 1; seed <= 400; seed++) {
      const rand = mulberry32(seed);
      const scenario = (["fast", "quick", "relaxed"] as const)[Math.floor(rand() * 3)]!;
      let rec: SimulationRecord = newSimulationRecord(scenario, T0);
      let now = T0;
      let shownIndex = 0;
      let cancelled = false;
      for (let step = 0; step < 60; step++) {
        const jump = Math.floor((rand() - 0.35) * 200_000); // biased forward, often backward
        now = Math.max(0, now + jump);
        const roll = rand();
        if (roll < 0.15) {
          const result = cancelOrder(rec, now);
          if (result.ok) {
            expect(canCancel(computeOrderState(rec, now))).toBe(true);
            rec = result.record;
            cancelled = true;
          }
        } else if (roll < 0.3) {
          const result = advanceManually(rec, now);
          if (result.ok) rec = result.record;
        }
        const observed = observeOrderState(rec, now);
        rec = observed.record;
        if (cancelled) {
          expect(observed.state).toBe("CANCELLED");
          continue;
        }
        expect(observed.state).not.toBe("CANCELLED");
        const idx = orderStateIndex(observed.state as (typeof ORDER_PROGRESS)[number]);
        expect(idx).toBeGreaterThanOrEqual(shownIndex);
        expect(idx).toBeLessThan(ORDER_PROGRESS.length);
        shownIndex = idx;
      }
    }
  });
});

describe("display helpers", () => {
  it("knows when a timed scenario delivers, and that the manual one has no schedule", () => {
    expect(scheduledDeliveryMs(buildScenarioSnapshot("quick", T0))).toBe(T0 + 180_000);
    expect(scheduledDeliveryMs(buildScenarioSnapshot("relaxed", T0))).toBe(T0 + 3_600_000);
    expect(scheduledDeliveryMs(buildScenarioSnapshot("fast", T0))).toBeNull();
  });

  it("reports the state an order was in when it was cancelled", () => {
    const quick = newSimulationRecord("quick", T0);
    const at = (ms: number) => cancelOrder(quick, T0 + ms);
    const early = at(20_000);
    expect(early.ok && stateWhenCancelled(early.record)).toBe("PREPARING");
    const packed = at(50_000);
    expect(packed.ok && stateWhenCancelled(packed.record)).toBe("PACKED");
    expect(stateWhenCancelled(quick)).toBeNull();

    const fast = advanceManually(newSimulationRecord("fast", T0), T0);
    const cancelled = fast.ok ? cancelOrder(fast.record, T0 + 5) : null;
    expect(cancelled?.ok && stateWhenCancelled(cancelled.record)).toBe("PREPARING");
  });
});
