import { z } from "zod";

/**
 * Deterministic, time-derived order simulation (ADR-007, docs/PRD.md §6). The state is a pure function of
 * the stored record and an injected clock: no timers, no randomness, no hidden `Date.now()`. Everything is
 * virtual: there is no carrier, no tracking number and no real shipment.
 */

export const ORDER_PROGRESS = [
  "CONFIRMED",
  "PREPARING",
  "PACKED",
  "IN_TRANSIT",
  "OUT_FOR_VIRTUAL_DELIVERY",
  "VIRTUALLY_DELIVERED",
] as const;
export type ProgressState = (typeof ORDER_PROGRESS)[number];
export type OrderState = ProgressState | "CANCELLED";

export const SCENARIO_KEYS = ["fast", "quick", "relaxed"] as const;
export type ScenarioKey = (typeof SCENARIO_KEYS)[number];

/** Illustrative shares of the duration at which each state begins; they are not transit estimates. */
export const MILESTONE_SHARES = [0, 0.1, 0.25, 0.45, 0.75, 1] as const;
export const SCENARIO_VERSION = 1;

const SCENARIO_DURATION_SECONDS: Record<ScenarioKey, number | null> = {
  fast: null, // advanced manually, one step per press
  quick: 180,
  relaxed: 3600,
};

/** States from which a normal cancellation is allowed (decision P-2). After PACKED the lifecycle continues. */
export const CANCELLABLE_STATES: readonly ProgressState[] = ["CONFIRMED", "PREPARING", "PACKED"];

export const scenarioSnapshotSchema = z.strictObject({
  scenario: z.enum(SCENARIO_KEYS),
  scenarioVersion: z.number().int().min(1),
  startedAtMs: z.number().int().safe().min(0),
  /** `null` for the manual (Fast) scenario. */
  durationSeconds: z.number().int().min(1).nullable(),
  /** Milliseconds after `startedAtMs` at which each progress state begins; empty for the manual scenario. */
  milestoneOffsetsMs: z.array(z.number().int().min(0)).max(ORDER_PROGRESS.length),
});
export type ScenarioSnapshot = z.infer<typeof scenarioSnapshotSchema>;

export const simulationRecordSchema = z.strictObject({
  scenario: scenarioSnapshotSchema,
  /** The furthest state the user has been shown. Only ever raised. */
  highWater: z.enum(ORDER_PROGRESS),
  /** Index into `ORDER_PROGRESS` reached by manual steps. */
  manualStep: z
    .number()
    .int()
    .min(0)
    .max(ORDER_PROGRESS.length - 1),
  /** The cancellation record. When present it wins over everything and is terminal. */
  cancelledAtMs: z.number().int().safe().min(0).nullable(),
});
export type SimulationRecord = z.infer<typeof simulationRecordSchema>;

/** Capture a scenario at order time: later changes to the constants never alter an existing order. */
export function buildScenarioSnapshot(
  scenario: ScenarioKey,
  startedAtMs: number,
): ScenarioSnapshot {
  const durationSeconds = SCENARIO_DURATION_SECONDS[scenario];
  return {
    scenario,
    scenarioVersion: SCENARIO_VERSION,
    startedAtMs,
    durationSeconds,
    milestoneOffsetsMs:
      durationSeconds === null
        ? []
        : MILESTONE_SHARES.map((share) => Math.round(durationSeconds * 1000 * share)),
  };
}

export function newSimulationRecord(scenario: ScenarioKey, startedAtMs: number): SimulationRecord {
  return {
    scenario: buildScenarioSnapshot(scenario, startedAtMs),
    highWater: "CONFIRMED",
    manualStep: 0,
    cancelledAtMs: null,
  };
}

const indexOf = (state: ProgressState): number => ORDER_PROGRESS.indexOf(state);
const stateAt = (index: number): ProgressState =>
  ORDER_PROGRESS[Math.min(Math.max(index, 0), ORDER_PROGRESS.length - 1)]!;

/**
 * The state implied by elapsed time alone. Negative elapsed (a clock moved before the start) counts as
 * zero; reaching an offset exactly enters that state; any amount past the end stays delivered.
 */
export function timeDerivedState(snapshot: ScenarioSnapshot, nowMs: number): ProgressState {
  if (snapshot.milestoneOffsetsMs.length === 0) return "CONFIRMED";
  const elapsed = Math.max(0, nowMs - snapshot.startedAtMs);
  let reached = 0;
  snapshot.milestoneOffsetsMs.forEach((offset, i) => {
    if (elapsed >= offset) reached = i;
  });
  return stateAt(reached);
}

/** `CANCELLED` if a cancellation record exists, otherwise `max(time-derived, high-water, manual)`. */
export function computeOrderState(record: SimulationRecord, nowMs: number): OrderState {
  if (record.cancelledAtMs !== null) return "CANCELLED";
  const index = Math.max(
    indexOf(timeDerivedState(record.scenario, nowMs)),
    indexOf(record.highWater),
    record.manualStep,
  );
  return stateAt(index);
}

/**
 * Evaluate the state and return the record with the high-water mark raised to it (max only). Call this
 * whenever an order is viewed or the collection is computed, so a backward clock cannot regress what
 * the user has already seen.
 */
export function observeOrderState(
  record: SimulationRecord,
  nowMs: number,
): { state: OrderState; record: SimulationRecord } {
  const state = computeOrderState(record, nowMs);
  if (state === "CANCELLED" || indexOf(state) <= indexOf(record.highWater))
    return { state, record };
  return { state, record: { ...record, highWater: state } };
}

export type TransitionError =
  "already_cancelled" | "not_cancellable" | "not_manual" | "already_delivered";

export type TransitionResult =
  | { readonly ok: true; readonly record: SimulationRecord; readonly state: OrderState }
  | { readonly ok: false; readonly error: TransitionError; readonly state: OrderState };

export const canCancel = (state: OrderState): boolean =>
  state !== "CANCELLED" && CANCELLABLE_STATES.includes(state);

/**
 * Cancel using the clock at this moment. The check and the record are one decision, so a cancel racing a
 * state change is decided exactly once: at an offset boundary the new state wins. Callers run this inside
 * the same storage transaction that writes the result (ARCHITECTURE §4).
 */
export function cancelOrder(record: SimulationRecord, nowMs: number): TransitionResult {
  const state = computeOrderState(record, nowMs);
  if (state === "CANCELLED") return { ok: false, error: "already_cancelled", state };
  if (!canCancel(state)) return { ok: false, error: "not_cancellable", state };
  return { ok: true, state: "CANCELLED", record: { ...record, cancelledAtMs: nowMs } };
}

/** Fast scenario only: each press advances exactly one step from the state currently shown. */
export function advanceManually(record: SimulationRecord, nowMs: number): TransitionResult {
  const state = computeOrderState(record, nowMs);
  if (record.scenario.scenario !== "fast") return { ok: false, error: "not_manual", state };
  if (state === "CANCELLED") return { ok: false, error: "already_cancelled", state };
  if (state === "VIRTUALLY_DELIVERED") return { ok: false, error: "already_delivered", state };
  const next = stateAt(indexOf(state) + 1);
  return {
    ok: true,
    state: next,
    record: {
      ...record,
      manualStep: indexOf(next),
      highWater: indexOf(next) > indexOf(record.highWater) ? next : record.highWater,
    },
  };
}

/**
 * When a timed scenario reaches `VIRTUALLY_DELIVERED`, or `null` for the manual scenario (it has no schedule).
 * Display only: the state itself comes from `computeOrderState`.
 */
export function scheduledDeliveryMs(snapshot: ScenarioSnapshot): number | null {
  const last = snapshot.milestoneOffsetsMs.at(-1);
  return last === undefined ? null : snapshot.startedAtMs + last;
}

/** The progress state an order was in when it was cancelled, or `null` if it is not cancelled. */
export function stateWhenCancelled(record: SimulationRecord): ProgressState | null {
  if (record.cancelledAtMs === null) return null;
  const state = computeOrderState({ ...record, cancelledAtMs: null }, record.cancelledAtMs);
  return state === "CANCELLED" ? null : state;
}

/** Terminal states are never left. */
export const isTerminal = (state: OrderState): boolean =>
  state === "CANCELLED" || state === "VIRTUALLY_DELIVERED";

export const orderStateIndex = (state: ProgressState): number => indexOf(state);
