import { z } from "zod";
import { SCENARIO_KEYS } from "@/modules/orders";

/**
 * Local preferences. Small, versioned with the backup format, and never anything that identifies the person
 * or the browser.
 */
export const settingsSchema = z.strictObject({
  defaultScenario: z.enum(SCENARIO_KEYS),
  /** Ids of one-time notices the user dismissed (for example the export hint). */
  dismissedNotices: z.array(z.string().min(1).max(64)).max(50),
});
export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = { defaultScenario: "quick", dismissedNotices: [] };

/** Merge a partial update into settings, validating the result; unknown keys are rejected. */
export function applySettingsPatch(current: Settings, patch: Partial<Settings>): Settings {
  return settingsSchema.parse({ ...current, ...patch });
}

/** Parse stored settings; anything invalid falls back to the defaults (preferences never block the app). */
export function parseSettingsOrDefault(value: unknown): { settings: Settings; valid: boolean } {
  const parsed = settingsSchema.safeParse(value);
  return parsed.success
    ? { settings: parsed.data, valid: true }
    : { settings: DEFAULT_SETTINGS, valid: false };
}
