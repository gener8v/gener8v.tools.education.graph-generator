import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { PICTOGRAPH_IMAGE_LIMIT, type Pictograph } from "../../src/core/definitions/pictograph";
import { validate } from "../../src/core/index";
import { createGraph } from "../../src/graph";
import { IMAGE_VIEW_BOX, images } from "../../src/images/index";
import { checkScene } from "../../src/layout/kit/check";
import { KEY_MAX_LINES, MIN_PARTIAL, keyText, pictographLayout } from "../../src/layout/pictograph";
import type { Scene, SceneNode } from "../../src/layout/scene";

/** The Scene the pictograph layout draws for a valid description; it must pass `checkScene`. */
function sceneOf(input: Record<string, unknown>): Scene {
  const result = validate({ type: "pictograph", categories: [{ name: "Cats" }], values: [4], unitImage: "apple", unitValue: 2, ...input });
  if (!result.valid) throw new Error(JSON.stringify(result.issues));
  const scene = pictographLayout(result.description as Pictograph, result.provenance);
  expect(checkScene(scene)).toEqual([]);
  return scene;
}

const attr = (node: SceneNode, name: string) => node.attrs.find(([key]) => key === name)?.[1];
const num = (node: SceneNode, name: string) => Number(attr(node, name));
const texts = (scene: Scene) => scene.nodes.flatMap((node) => (node.kind === "text" ? [node.text] : []));

/** The pictures of the plot: every nested `svg`, except the last, which is the key's. */
function pictures(scene: Scene): SceneNode[] {
  const all = scene.nodes.filter((node) => node.kind === "svg");
  return all.slice(0, -1);
}
const isWhole = (node: SceneNode) => attr(node, "viewBox") === IMAGE_VIEW_BOX;

/** Pictures grouped by row (horizontal: same vertical center), in order of position. */
function rows(scene: Scene): SceneNode[][] {
  const byRow = new Map<number, SceneNode[]>();
  for (const node of pictures(scene)) {
    // A whole picture and a partial one in the same row share their vertical center.
    const center = Math.round((num(node, "y") + num(node, "height") / 2) * 10) / 10;
    byRow.set(center, [...(byRow.get(center) ?? []), node]);
  }
  return [...byRow.entries()].sort(([a], [b]) => a - b).map(([, row]) => row.sort((a, b) => num(a, "x") - num(b, "x")));
}

const example = JSON.parse(readFileSync("examples/pictograph.json", "utf8")) as Record<string, unknown>;

describe("pictograph rows (DGP-REQ-023, DGP-REQ-026, DGP-REQ-028)", () => {
  it("draws ⌊value ÷ unitValue⌋ whole pictures and one cropped picture for a remainder", () => {
    // Values 8, 5, 0, 3 at 2 each: 4 whole; 2 whole and a half; none; 1 whole and a half.
    const scene = sceneOf(example);
    const drawn = rows(scene).map((row) => row.map((node) => (isWhole(node) ? "whole" : `part ${attr(node, "viewBox")}`)));
    expect(drawn).toEqual([
      ["whole", "whole", "whole", "whole"],
      ["whole", "whole", "part 0 0 50 100"],
      ["whole", "part 0 0 50 100"],
    ]);
  });

  it("keeps a zero value's row and name, with no pictures", () => {
    const scene = sceneOf(example);
    expect(texts(scene)).toContain("Cherries");
    expect(rows(scene)).toHaveLength(3); // four categories, one of them empty
  });

  it("draws a remainder below 1% of a picture, at least 1% wide, so no value is understated", () => {
    const scene = sceneOf({ values: [2.0002], unitValue: 2 });
    const [row] = rows(scene);
    expect(row).toHaveLength(2);
    const [whole, part] = row!;
    expect(isWhole(part!)).toBe(false);
    expect(num(part!, "width") / num(whole!, "width")).toBeCloseTo(MIN_PARTIAL, 2);
  });

  it("draws exactly whole pictures for a value that is a whole multiple despite decimal noise (0.3 ÷ 0.1)", () => {
    const [row] = rows(sceneOf({ values: [0.3], unitValue: 0.1 }));
    expect(row!.map(isWhole)).toEqual([true, true, true]);
  });

  it("crops by nesting a viewport, with no ids, clip paths or references (AD-008)", () => {
    const scene = sceneOf(example);
    const markup = JSON.stringify(scene);
    expect(markup).not.toMatch(/url\(|"id"|clip-path|clipPath|href/);
    for (const node of pictures(scene)) expect(node.kind).toBe("svg");
  });

  it("draws the named image's own drawing in every picture", () => {
    const scene = sceneOf({ unitImage: "fish", values: [3] });
    for (const node of pictures(scene)) expect((node as { children: unknown }).children).toBe(images.fish.nodes);
  });
});

describe("equal size and spacing (DGP-REQ-037)", () => {
  it("draws every picture at one size and one step, so equal values make equal rows", () => {
    const scene = sceneOf({ categories: [{ name: "A" }, { name: "B" }, { name: "C" }], values: [9, 9, 4], unitValue: 1 });
    const all = pictures(scene).filter(isWhole);
    const size = num(all[0]!, "width");
    for (const node of all) {
      expect(num(node, "width")).toBe(size);
      expect(num(node, "height")).toBe(size);
    }
    const [a, b, c] = rows(scene);
    const end = (row: SceneNode[]) => num(row.at(-1)!, "x") + num(row.at(-1)!, "width");
    expect(end(a!)).toBe(end(b!));
    const steps = a!.slice(1).map((node, i) => Math.round((num(node, "x") - num(a![i]!, "x")) * 100) / 100);
    expect(new Set(steps).size).toBe(1);
    expect(num(c![0]!, "x")).toBe(num(a![0]!, "x"));
  });

  it("shrinks every picture together so the longest row stays inside the drawing", () => {
    const scene = sceneOf({ categories: [{ name: "A" }, { name: "B" }], values: [396, 3], unitValue: 1 });
    const all = pictures(scene);
    for (const node of all) expect(num(node, "x") + num(node, "width")).toBeLessThanOrEqual(400);
    expect(new Set(all.filter(isWhole).map((node) => num(node, "width"))).size).toBe(1);
  });
});

describe("orientation (DGP-REQ-032)", () => {
  it("runs rows by default and columns when vertical, growing upward with the remainder on top", () => {
    const scene = sceneOf({ orientation: "vertical", categories: [{ name: "A" }, { name: "B" }], values: [5, 2], unitValue: 2 });
    const all = pictures(scene);
    const columnA = all.filter((node) => num(node, "x") === num(all[0]!, "x"));
    // A: 2 whole and a half, stacked upward from one baseline: y decreases.
    const ys = columnA.map((node) => num(node, "y"));
    expect(ys).toEqual([...ys].sort((a, b) => b - a));
    const part = columnA.find((node) => !isWhole(node))!;
    expect(attr(part, "viewBox")).toBe("0 50 100 50");
    expect(num(part, "height") / num(columnA[0]!, "height")).toBeCloseTo(0.5, 2);
    expect(num(part, "width")).toBe(num(columnA[0]!, "width"));
  });

  it("puts the names to the left of rows and below columns", () => {
    const rowsScene = sceneOf({ categories: [{ name: "Cats" }], values: [4] });
    const name = rowsScene.nodes.find((node) => node.kind === "text" && node.text === "Cats")!;
    expect(num(name, "x")).toBeLessThan(num(pictures(rowsScene)[0]!, "x"));

    const columnScene = sceneOf({ categories: [{ name: "Cats" }], values: [4], orientation: "vertical" });
    const below = columnScene.nodes.find((node) => node.kind === "text" && node.text === "Cats")!;
    const lowest = Math.max(...pictures(columnScene).map((node) => num(node, "y") + num(node, "height")));
    expect(num(below, "y")).toBeGreaterThan(lowest);
  });
});

describe("the key (DGP-REQ-027)", () => {
  it('reads "each <image name> = <unitValue> <valueUnitLabel>", with "units" when no label is given', () => {
    expect(texts(sceneOf({ valueUnitLabel: "students" }))).toContain("each apple = 2 students");
    expect(texts(sceneOf({}))).toContain("each apple = 2 units");
    expect(texts(sceneOf({ valueUnitLabel: " \u00a0 " }))).toContain("each apple = 2 units");
    expect(texts(sceneOf({ unitImage: "star", unitValue: 0.5, valueUnitLabel: "points" }))).toContain("each star = 0.5 points");
  });

  it("shows the unit value as written and caps a long label's lines", () => {
    expect(keyText({ unitImage: "book", unitValue: 1e-7, valueUnitLabel: "pages" } as Pictograph)).toBe("each book = 0.0000001 pages");
    const scene = sceneOf({ valueUnitLabel: "word ".repeat(2_000) });
    const keyLines = texts(scene).filter((line) => line.startsWith("each") || line.includes("word"));
    expect(keyLines.length).toBeLessThanOrEqual(KEY_MAX_LINES);
    expect(keyLines.at(-1)!.endsWith("…")).toBe(true);
  });

  it("draws one picture of the image beside the text", () => {
    const scene = sceneOf({ unitImage: "tree" });
    const key = scene.nodes.filter((node) => node.kind === "svg").at(-1)!;
    expect(attr(key, "viewBox")).toBe(IMAGE_VIEW_BOX);
    expect((key as { children: unknown }).children).toBe(images.tree.nodes);
  });
});

describe("DGP-NFR-002: a partial picture's visible share is within 2% of the exact remainder", () => {
  it("holds for generated non-whole multiples, in rows and in columns, up to the picture limit (code review CR-001)", () => {
    fc.assert(
      fc.property(
        // Up to the limit in one row or column, where pictures are smallest.
        fc.oneof(fc.integer({ min: 0, max: 40 }), fc.integer({ min: PICTOGRAPH_IMAGE_LIMIT - 40, max: PICTOGRAPH_IMAGE_LIMIT - 1 })),
        fc.double({ min: 0.001, max: 0.999, noNaN: true }),
        fc.constantFrom(1, 2, 2.5, 5, 0.25),
        fc.constantFrom("horizontal", "vertical"),
        (whole, fraction, unitValue, orientation) => {
          const value = (whole + fraction) * unitValue;
          const exact = value / unitValue - Math.floor(value / unitValue);
          fc.pre(exact > 1e-6 && exact < 1 - 1e-6);
          const scene = sceneOf({ values: [value], unitValue, orientation });
          // The partial picture is drawn last, after the whole ones. Close to a whole picture it may be
          // drawn at full width, so it is found by position, not by its viewBox.
          const all = pictures(scene);
          expect(all).toHaveLength(Math.floor(value / unitValue + 1e-9) + 1);
          const part = all.at(-1);
          const size = orientation === "horizontal" ? num(part!, "height") : num(part!, "width");
          const shown = (orientation === "horizontal" ? num(part!, "width") : num(part!, "height")) / size;
          expect(Math.abs(shown - Math.max(exact, MIN_PARTIAL))).toBeLessThanOrEqual(0.02);
          expect(Math.abs(shown - exact)).toBeLessThanOrEqual(0.02);
          // The viewBox shows exactly the share the viewport is drawn at.
          const box = String(attr(part!, "viewBox")).split(" ").map(Number);
          expect(Math.abs((orientation === "horizontal" ? box[2]! : box[3]!) / 100 - shown)).toBeLessThanOrEqual(0.0002);
        },
      ),
      { numRuns: 600 },
    );
  });
});

describe("the whole pictograph through createGraph", () => {
  it("is the Scene createGraph returns for the example, with the text alternative", () => {
    const result = createGraph(example);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(checkScene(result.scene)).toEqual([]);
    expect(result.scene.textAlternative).toBe(
      "A pictograph titled “Favourite fruit in our class”. Each apple stands for 2 students. “Apples”: 8 students, “Bananas”: 5 students, “Cherries”: 0 students and “Grapes”: 3 students.",
    );
  });

  it("keeps title and key lines bounded for half a megabyte of caller text (GSS TICKET-002 SEC-001)", () => {
    const scene = sceneOf({ title: "word ".repeat(200_000), valueUnitLabel: "@".repeat(500_000) });
    // Title at most 3 lines, key at most 2, plus the one category name.
    expect(texts(scene).length).toBeLessThanOrEqual(3 + KEY_MAX_LINES + 1);
  });
});
