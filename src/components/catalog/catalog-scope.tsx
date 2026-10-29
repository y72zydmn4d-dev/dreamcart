import type { ReactNode } from "react";
import { getStorefront } from "@/platform/catalog/server";
import { CatalogProvider } from "./catalog-context";

/** Server wrapper: loads the validated catalog and hands it to the client components below it. */
export async function CatalogScope({ children }: { readonly children: ReactNode }) {
  const { active, builtAtMs } = await getStorefront();
  return (
    <CatalogProvider catalog={active.catalog} mode={active.mode} builtAtMs={builtAtMs}>
      {children}
    </CatalogProvider>
  );
}
