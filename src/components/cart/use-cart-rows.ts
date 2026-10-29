"use client";

import { useMemo } from "react";
import { useCatalog } from "@/components/catalog/catalog-context";
import { useLocalData } from "@/components/local-data/local-data";
import { assessLine, lineKey, type LineStatus } from "@/modules/cart";
import { buildLineIndex, resolveLine, type ResolvedLine } from "./resolve-line";

export interface CartRow {
  readonly resolved: ResolvedLine;
  readonly status: LineStatus;
  readonly key: string;
}

/** The cart's lines resolved against the catalog and imported items, each with what checkout would say about it. */
export function useCartRows(): CartRow[] {
  const { view, nowMs } = useCatalog();
  const { cart, userProducts } = useLocalData();
  return useMemo<CartRow[]>(() => {
    if (!cart) return [];
    const index = buildLineIndex(view, userProducts, nowMs);
    return cart.lines.map((line) => {
      const resolved = resolveLine(line, index);
      return { resolved, status: assessLine(line, resolved.current), key: lineKey(line) };
    });
  }, [cart, view, userProducts, nowMs]);
}
