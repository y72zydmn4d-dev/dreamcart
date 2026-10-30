import { describe, expect, it } from "vitest";
import { activationSchema, resolveActivation, type Activation } from "./activation";

const demo: Activation = { mode: "SYNTHETIC_DEMO", ownerAuthorization: null };
const staging: Activation = { mode: "REAL_CATALOG_STAGING", ownerAuthorization: null };
const verified: Activation = {
  mode: "VERIFIED_REAL_CATALOG",
  ownerAuthorization: { reference: "owner message 2026-10-30", authorizedAt: "2026-10-30" },
};

describe("activation settings", () => {
  it("accepts the three modes", () => {
    for (const a of [demo, staging, verified])
      expect(activationSchema.safeParse(a).success).toBe(true);
  });

  it("refuses to publish the verified catalog without a recorded owner authorization", () => {
    const result = activationSchema.safeParse({
      mode: "VERIFIED_REAL_CATALOG",
      ownerAuthorization: null,
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("owner authorization");
  });

  it("rejects unknown modes and stray fields", () => {
    expect(activationSchema.safeParse({ mode: "LIVE", ownerAuthorization: null }).success).toBe(
      false,
    );
    expect(activationSchema.safeParse({ ...demo, extra: 1 }).success).toBe(false);
  });
});

describe("resolveActivation", () => {
  const preview = { release: false, vercelEnv: "preview" };
  const production = { release: false, vercelEnv: "production" };

  it("serves staging in previews and locally", () => {
    expect(resolveActivation(staging, preview)).toEqual({
      effective: "REAL_CATALOG_STAGING",
      note: null,
    });
    expect(resolveActivation(staging, { release: false, vercelEnv: undefined }).effective).toBe(
      "REAL_CATALOG_STAGING",
    );
  });

  it("never serves staging in production, and says it fell back", () => {
    const decision = resolveActivation(staging, production);
    expect(decision.effective).toBe("SYNTHETIC_DEMO");
    expect(decision.note).toContain("production");
  });

  it("leaves the other modes alone in every environment", () => {
    for (const env of [preview, production]) {
      expect(resolveActivation(demo, env).effective).toBe("SYNTHETIC_DEMO");
      expect(resolveActivation(verified, env).effective).toBe("VERIFIED_REAL_CATALOG");
    }
  });
});
