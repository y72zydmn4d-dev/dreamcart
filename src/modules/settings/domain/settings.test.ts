import { describe, expect, it } from "vitest";
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  parseSettingsOrDefault,
  settingsSchema,
} from "./settings";

describe("settings", () => {
  it("applies valid patches and rejects invalid or unknown ones", () => {
    expect(
      applySettingsPatch(DEFAULT_SETTINGS, { defaultScenario: "relaxed" }).defaultScenario,
    ).toBe("relaxed");
    expect(() =>
      applySettingsPatch(DEFAULT_SETTINGS, { defaultScenario: "teleport" as never }),
    ).toThrow();
    expect(() => applySettingsPatch(DEFAULT_SETTINGS, { theme: "dark" } as never)).toThrow();
  });
  it("falls back to defaults for anything invalid and says so", () => {
    expect(parseSettingsOrDefault({ defaultScenario: 3 })).toEqual({
      settings: DEFAULT_SETTINGS,
      valid: false,
    });
    expect(parseSettingsOrDefault(DEFAULT_SETTINGS)).toEqual({
      settings: DEFAULT_SETTINGS,
      valid: true,
    });
  });
  it("holds no identifiers: only the documented keys exist", () => {
    expect(Object.keys(settingsSchema.shape).sort()).toEqual([
      "defaultScenario",
      "dismissedNotices",
    ]);
  });
});
