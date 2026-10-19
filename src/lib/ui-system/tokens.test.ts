import { describe, expect, it } from "vitest";
import { uiCssVariables, uiPalette } from "./tokens";

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => parseInt(channel, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe.each(["light", "dark"] as const)("%s operational palette", (mode) => {
  const colors = uiPalette[mode];
  it("keeps primary and secondary text readable on all operational surfaces", () => {
    for (const foreground of [colors.text, colors.muted]) {
      for (const background of [
        colors.bg,
        colors.surface,
        colors.surfaceMuted,
        colors.surfaceRaised,
        colors.pressed,
      ]) {
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it("keeps action labels and semantic state labels at AA contrast", () => {
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
    for (const role of ["accent", "danger", "warning", "success"] as const) {
      expect(contrast(colors[role], colors[`${role}Soft`])).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("exposes the same semantic roles to CSS without hardcoded mode checks in consumers", () => {
    const variables = uiCssVariables(mode);
    expect(variables["--ip-surface-muted"]).toBe(colors.surfaceMuted);
    expect(variables["--ip-on-accent"]).toBe(colors.onAccent);
    expect(contrast(variables["--ip-focus"], colors.bg)).toBeGreaterThanOrEqual(3);
  });
});
