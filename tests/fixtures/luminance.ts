// The colour arithmetic of the contrast and greyscale checks (GSV-NFR-004, DGP-NFR-004), shared by
// tests/core/style.test.ts and tests/core/series-palette.test.ts (DGP TICKET-002 quality review QR-006).

/** WCAG 2.1 relative luminance of a `#rrggbb` color. */
export function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG 2.1 contrast ratio between two `#rrggbb` colors. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * DGP-NFR-004's measure: the difference in relative luminance as a share of the brighter color's,
 * |La − Lb| / max(La, Lb). The relative reading is the one compatible with 3:1 contrast on white
 * (GSV TICKET-001 code review CR-005).
 */
export function relativeLuminanceDifference(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return Math.abs(la - lb) / Math.max(la, lb);
}
