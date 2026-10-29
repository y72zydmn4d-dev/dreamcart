import type { Settings } from "../domain/settings";

export interface SettingsRepository {
  /** Defaults when nothing valid is stored. */
  get(): Promise<Settings>;
  update(patch: Partial<Settings>): Promise<Settings>;
}
