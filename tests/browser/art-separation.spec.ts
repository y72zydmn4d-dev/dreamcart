import { expect, test, type Page } from "@playwright/test";

/**
 * QA finding F04: dark product illustrations merged with the dark stage. A dark body now gets a light rim and a
 * neutral backlight in the dark scheme; the body color is never changed. These checks read computed styles of
 * the drawn SVG, not screenshots (pixel comparisons are not stable across engines).
 */
const gallery = (page: Page) => page.locator("section[aria-label='Thư viện ảnh minh hoạ']").first();
const stage = (page: Page) => gallery(page).getByRole("img").first();

const rimOf = (page: Page) =>
  stage(page).evaluate((svg) => {
    const edge = svg.querySelector("g > rect, g > ellipse") as SVGElement;
    return { stroke: getComputedStyle(edge).stroke, fill: getComputedStyle(edge).fill };
  });
/** The backlight token as resolved on the drawing, normalised by the browser to rgb()/rgba(): the stylesheet is
 * minified (`#fff3`) and engines drop a stop's alpha from computed stop-color, so neither can be read directly. */
const spotOf = (page: Page) =>
  stage(page).evaluate((svg) => {
    const probe = document.createElement("span");
    probe.style.color = getComputedStyle(svg).getPropertyValue("--art-spot").trim();
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  });
/** rgba() channels of a computed color, alpha defaulting to 1. */
const channels = (color: string) => {
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (!m) throw new Error(`not a color: ${color}`);
  const [r = 0, g = 0, b = 0, a = 1] = m[1]!
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number);
  return { r, g, b, a };
};

/**
 * Emulate the dark scheme explicitly and confirm the engine applied it. On the CI Firefox the context-level option
 * did not take effect (the page kept reading the light-scheme tokens), so the dark-only checks are skipped, and
 * reported as skipped, on an engine that cannot emulate it instead of failing on the wrong scheme.
 */
async function useDarkScheme(page: Page) {
  // Called after navigation: the check must hold for the loaded page, and the page's own stylesheet must agree.
  await page.emulateMedia({ colorScheme: "dark" });
  const applied = await page.evaluate(() => {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const stage = getComputedStyle(document.documentElement).getPropertyValue("--art-stage").trim();
    return dark && stage.toLowerCase() === "#1a1a22";
  });
  test.skip(!applied, "this engine did not apply the dark colour scheme to the loaded page");
}

for (const width of [325, 390, 768, 1440]) {
  test.describe(`dark scheme at ${width}px`, () => {
    test.use({
      viewport: { width, height: 900 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });

    test("a dark product (Buds Lite) gets a light rim and a backlight, without a new body color", async ({
      page,
    }) => {
      await page.goto("/product/fx-buds-lite");
      await useDarkScheme(page);
      await expect(stage(page)).toBeVisible();
      // The art is first drawn in the neutral default colour and re-tinted when the only colour is selected.
      await expect(stage(page)).toHaveAccessibleName(/màu/);
      const { stroke, fill } = await rimOf(page);
      const rim = channels(stroke);
      expect([rim.r, rim.g, rim.b]).toEqual([255, 255, 255]);
      expect(rim.a).toBeGreaterThanOrEqual(0.4);
      expect(channels(await spotOf(page)).a).toBeGreaterThan(0);
      // The body keeps the variant's own dark swatch (#26262b).
      expect(channels(fill)).toMatchObject({ r: 38, g: 38, b: 43 });
    });

    test("a white variant is not recolored and gets no extra backlight", async ({ page }) => {
      await page.goto("/product/fx-buds-pro");
      await useDarkScheme(page);
      await page
        .getByRole("main")
        .getByRole("button", { name: /^Trắng/ })
        .first()
        .click();
      await expect(stage(page)).toHaveAccessibleName(/Trắng/);
      const { fill } = await rimOf(page);
      expect(channels(fill)).toMatchObject({ r: 241, g: 241, b: 243 });
      expect(channels(await spotOf(page)).a).toBe(0);
    });
  });
}

test.describe("light scheme", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });

  test("a dark product keeps its ordinary edge on the pale stage (no backlight needed)", async ({
    page,
  }) => {
    await page.goto("/product/fx-buds-lite");
    await expect(stage(page)).toBeVisible();
    const rim = channels((await rimOf(page)).stroke);
    expect(rim.r).toBeLessThan(60); // a dark edge, not the light dark-scheme rim
    expect(channels(await spotOf(page)).a).toBe(0);
  });
});
