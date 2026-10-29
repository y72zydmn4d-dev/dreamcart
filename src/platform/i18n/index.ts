import { vi } from "./vi";

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** Every dictionary leaf as a dot path, for example `"nav.search"`. */
export type DictionaryKey = Paths<typeof vi>;

export type TParams = Readonly<Record<string, string | number>>;

/**
 * Resolve a dictionary key and fill `{placeholders}`.
 * Throws on a missing placeholder value so a broken string fails in tests, not in production silently.
 */
export function t(key: DictionaryKey, params?: TParams): string {
  let node: unknown = vi;
  for (const part of key.split(".")) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  if (typeof node !== "string") {
    throw new Error(`Missing dictionary key: ${key}`);
  }
  return node.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw new Error(`Missing parameter "${name}" for dictionary key: ${key}`);
    }
    return String(value);
  });
}
