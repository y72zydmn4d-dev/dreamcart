import { describe, expect, it } from "vitest";
import { artTone, relativeLuminance } from "./art-tone";

describe("artTone", () => {
  it("treats the dark fixture swatches (including space grey) as dark", () => {
    for (const hex of ["#26262b", "#2c3550", "#17171d", "#3f4148", "#000", "#111"])
      expect(artTone(hex), hex).toBe("dark");
  });

  it("treats the pale swatches as light", () => {
    for (const hex of ["#f1f1f3", "#ffffff", "#fff"]) expect(artTone(hex), hex).toBe("light");
  });

  it("leaves mid tones alone, including the neutral default and the lighter greys", () => {
    for (const hex of ["#c9cbd1", "#d9c7a7", "#a9dcc9", "#b9bdd1"])
      expect(artTone(hex), hex).toBe("mid");
  });

  it("falls back to mid for anything that is not a hex color", () => {
    for (const value of ["", "red", "rgb(0 0 0)", "#12", "#gggggg", "url(#x)"])
      expect(artTone(value), value).toBe("mid");
  });

  it("computes the WCAG relative luminance", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#fff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("not a color")).toBeNull();
  });
});
