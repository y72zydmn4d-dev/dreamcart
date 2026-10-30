import { z } from "zod";

/**
 * Which catalog the application serves. Activation is an explicit, reviewed setting (`data/catalog/activation.json`),
 * never a side effect of data being present: merging verified records must not publish them by itself, because the
 * production deployment follows `main`.
 *
 *   SYNTHETIC_DEMO         the labeled Fixturia fixtures (the default).
 *   REAL_CATALOG_STAGING   the staged real catalog (`data/catalog-staging/`), for Preview deployments and local work.
 *                          It is never served in production, even if this value is merged to `main`.
 *   VERIFIED_REAL_CATALOG  the verified catalog (`data/catalog/`). Needs a recorded owner authorization.
 */
export const ACTIVATION_MODES = [
  "SYNTHETIC_DEMO",
  "REAL_CATALOG_STAGING",
  "VERIFIED_REAL_CATALOG",
] as const;
export type ActivationMode = (typeof ACTIVATION_MODES)[number];

export const activationSchema = z
  .strictObject({
    mode: z.enum(ACTIVATION_MODES),
    ownerAuthorization: z
      .strictObject({
        reference: z.string().min(1).max(300),
        authorizedAt: z.iso.date(),
      })
      .nullable(),
  })
  .superRefine((a, ctx) => {
    if (a.mode === "VERIFIED_REAL_CATALOG" && a.ownerAuthorization === null) {
      ctx.addIssue({
        code: "custom",
        path: ["ownerAuthorization"],
        message:
          "VERIFIED_REAL_CATALOG publishes the real catalog and needs a recorded owner authorization",
      });
    }
  });
export type Activation = z.infer<typeof activationSchema>;

export interface ActivationEnvironment {
  /** `NEXT_PUBLIC_DREAMCART_RELEASE=1`: a release build, which serves only the verified catalog. */
  readonly release: boolean;
  /** Vercel's own `VERCEL_ENV` (production | preview | development); undefined off Vercel. */
  readonly vercelEnv: string | undefined;
}

export interface ActivationDecision {
  readonly effective: ActivationMode;
  /** Set when the configured mode was not honored, so the fallback is never silent. */
  readonly note: string | null;
}

/** The mode actually served in this environment. Staging can never reach a production deployment. */
export function resolveActivation(
  activation: Activation,
  env: ActivationEnvironment,
): ActivationDecision {
  if (activation.mode === "REAL_CATALOG_STAGING" && env.vercelEnv === "production") {
    return {
      effective: "SYNTHETIC_DEMO",
      note: "REAL_CATALOG_STAGING is configured but a production deployment never serves the staged catalog",
    };
  }
  return { effective: activation.mode, note: null };
}
