// Bundled for the browser by idb-persistence.spec.ts: the REAL persistence adapter, running in a real engine.
export * from "@/platform/persistence";
export { MIGRATIONS } from "@/platform/persistence/schema";
export { cartLine, placeCommand, saveCartWith } from "@/platform/persistence/test-support";
export { parseBackup, serializeBackup } from "@/modules/data-portability";
