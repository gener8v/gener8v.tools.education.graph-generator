import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { PICTOGRAPH_IMAGE_LIMIT, type Pictograph } from "../../src/core/definitions/pictograph";
import { validate } from "../../src/core/index";
import { createGraph } from "../../src/graph";
import { IMAGE_VIEW_BOX, images } from "../../src/images/index";
import { checkScene } from "../../src/layout/kit/check";
import { LINE_HEIGHT, SCENE_MARGIN } from "../../src/layout/kit/title";
import { KEY_MAX_LINES, MIN_PARTIAL, keyText, pictographLayout } from "../../src/layout/pictograph";
import { SCENE_WIDTH, type Scene, type SceneNode } from "../../src/layout/scene";
import { type Bounds, boundsOf, overlap } from "../fixtures/scene-geometry";

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

describe("names under columns (DGP Scale and Layout; quality review QR-002)", () => {
  it("turns the week's names to read upward when a word would not fit under its column, never splitting a word", () => {
    const week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const scene = sceneOf({ orientation: "vertical", categories: week.map((name) => ({ name })), values: week.map(() => 3) });
    const names = scene.nodes.filter((node) => node.kind === "text" && attr(node, "transform") !== undefined);
    expect(names.map((node) => (node.kind === "text" ? node.text : ""))).toEqual(week);
    expect(geometryProblems(scene)).toEqual([]);
  });

  it("keeps short names level", () => {
    const scene = sceneOf({ orientation: "vertical", categories: [{ name: "Cats" }, { name: "Dogs" }], values: [4, 2] });
    expect(scene.nodes.some((node) => attr(node, "transform") !== undefined)).toBe(false);
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

/** The Scene split into its parts: the title's lines, the plot (pictures and names) and the key. */
function partsOf(scene: Scene) {
  const keyAt = scene.nodes.findLastIndex((node) => node.kind === "svg");
  const titleCount = scene.nodes.findIndex((node) => attr(node, "font-weight") !== "bold");
  return {
    title: scene.nodes.slice(0, titleCount).map(boundsOf),
    plot: scene.nodes.slice(titleCount, keyAt).map(boundsOf),
    key: scene.nodes.slice(keyAt).map(boundsOf),
  };
}

/** Every way the drawing's geometry can be wrong, as messages; an empty list means it is sound. */
function geometryProblems(scene: Scene): string[] {
  const problems: string[] = [];
  const { title, plot, key } = partsOf(scene);
  const all = [...title, ...plot, ...key];
  const label = (b: Bounds) => (b.node.kind === "text" ? `text "${b.node.text.slice(0, 20)}"` : `picture at ${b.x0},${b.y0}`);
  for (const b of all) {
    if (b.x0 < SCENE_MARGIN - 0.02 || b.x1 > SCENE_WIDTH - SCENE_MARGIN + 0.02 || b.y0 < -0.02 || b.y1 > scene.height + 0.02) {
      problems.push(`${label(b)} outside the drawing`);
    }
  }
  // The key's own picture and text sit side by side; everything else must stay apart.
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) if (overlap(all[i]!, all[j]!)) problems.push(`${label(all[i]!)} overlaps ${label(all[j]!)}`);
  }
  const keyTop = Math.min(...key.map((b) => b.y0));
  for (const b of [...title, ...plot]) if (b.y1 > keyTop + 0.02) problems.push(`${label(b)} reaches into the key`);
  return problems;
}

describe("the drawing's geometry (quality review QR-001)", () => {
  const WORDS = ["Monday", "Wednesday", "Apples", "September", "Average", "number", "of", "hours", "Cats", "A", "Pneumonoultramicroscopicsilicovolcanoconiosis"];
  const pictograph = (maxCategories: number, orientation: "horizontal" | "vertical") =>
    fc.integer({ min: 1, max: maxCategories }).chain((n) =>
      fc.record({
        names: fc.array(fc.array(fc.constantFrom(...WORDS), { minLength: 1, maxLength: 5 }), { minLength: n, maxLength: n }),
        counts: fc.array(fc.integer({ min: 0, max: Math.floor(PICTOGRAPH_IMAGE_LIMIT / n) - 1 }), { minLength: n, maxLength: n }),
        fraction: fc.constantFrom(0, 0.25, 0.5, 0.999),
        unitValue: fc.constantFrom(1, 2, 0.5),
        title: fc.option(fc.constantFrom("Pets", "How we get to school each morning, by class and by day of the week")),
        label: fc.option(fc.constantFrom("students", "pupils who walk to school on a dry day")),
      }).map(({ names, counts, fraction, unitValue, title, label }) => ({
        orientation,
        // Names are made distinct, as validation requires.
        categories: names.map((words, i) => ({ name: `${words.join(" ")} ${i + 1}` })),
        values: counts.map((count, i) => (count + (i % 2 === 0 ? fraction : 0)) * unitValue),
        unitValue,
        ...(title === null ? {} : { title }),
        ...(label === null ? {} : { valueUnitLabel: label }),
      })),
    );

  it("keeps every picture and line inside the drawing, apart from each other and above the key, in rows up to the category limit", () => {
    fc.assert(
      fc.property(pictograph(100, "horizontal"), (input) => {
        expect(geometryProblems(sceneOf(input))).toEqual([]);
      }),
      { numRuns: 150 },
    );
  });

  it("does the same in columns while one line of a name fits under a column, up to 25 categories (QR-002)", () => {
    fc.assert(
      fc.property(pictograph(25, "vertical"), (input) => {
        expect(geometryProblems(sceneOf(input))).toEqual([]);
      }),
      { numRuns: 150 },
    );
  });

  it("draws a row's partial picture one step after its last whole picture, every picture centered on the name", () => {
    const scene = sceneOf({ categories: [{ name: "Cats" }, { name: "Average number of hours of sleep each night" }], values: [5, 3], unitValue: 2 });
    const lineHeight = 12 * LINE_HEIGHT;
    const names = partsOf(scene).plot.flatMap((b) => (b.node.kind === "text" ? [b.node] : []));
    const lines = [names.slice(0, 1), names.slice(1)];
    expect(lines[1]!.map((node) => (node.kind === "text" ? node.text : "")).join(" ")).toBe("Average number of hours of sleep each night");
    rows(scene).forEach((row, r) => {
      const step = num(row[1]!, "x") - num(row[0]!, "x");
      row.forEach((node, i) => expect(num(node, "x")).toBeCloseTo(num(row[0]!, "x") + i * step, 2));
      expect(isWhole(row.at(-1)!)).toBe(false);
      // The name's lines, `textLines`' bands, centered on the same height as the pictures.
      const top = num(lines[r]![0]!, "y") - (lineHeight - 12) / 2 - 12 * 0.8;
      const center = top + (lines[r]!.length * lineHeight) / 2;
      for (const node of row) expect(num(node, "y") + num(node, "height") / 2).toBeCloseTo(center, 1);
    });
  });

  it("rests a column's partial picture on the picture below, one gap above it, every column centered on its name", () => {
    const scene = sceneOf({ orientation: "vertical", categories: [{ name: "Cats" }, { name: "Dogs" }], values: [5, 3], unitValue: 2 });
    const all = pictures(scene);
    const columnOf = (name: string) => {
      const text = scene.nodes.find((node) => node.kind === "text" && node.text === name)!;
      return all.filter((node) => Math.abs(num(node, "x") + num(node, "width") / 2 - num(text, "x")) < 0.02);
    };
    const [cats, dogs] = [columnOf("Cats"), columnOf("Dogs")];
    expect([cats.length, dogs.length]).toEqual([3, 2]);
    // The gap between two whole pictures, from the Cats column.
    const gap = num(cats[0]!, "y") - (num(cats[1]!, "y") + num(cats[1]!, "height"));
    expect(gap).toBeGreaterThan(0);
    for (const column of [cats, dogs]) {
      const part = column.at(-1)!;
      expect(isWhole(part)).toBe(false);
      expect(num(part, "y") + num(part, "height")).toBeCloseTo(num(column.at(-2)!, "y") - gap, 2);
    }
  });

  it("keeps 25 columns of pictures apart, each centered over its rotated name", () => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const categories = Array.from({ length: 25 }, (_, i) => ({ name: `${months[i % 12]} ${i + 1}` }));
    const scene = sceneOf({ orientation: "vertical", categories, values: categories.map(() => 7), unitValue: 2 });
    expect(geometryProblems(scene)).toEqual([]);
    const lineHeight = 12 * LINE_HEIGHT;
    const names = scene.nodes.filter((node) => node.kind === "text" && attr(node, "transform") !== undefined);
    expect(names).toHaveLength(25);
    const columns = new Map<number, number>();
    for (const node of pictures(scene)) columns.set(Math.round((num(node, "x") + num(node, "width") / 2) * 100) / 100, 1);
    // One line per name: its glyphs run from its baseline back up the line height's share.
    const centers = names.map((node) => num(node, "x") - (lineHeight - 12) / 2 - 12 * 0.8 + lineHeight / 2);
    expect([...columns.keys()].map((x, i) => Math.abs(x - centers[i]!) < 0.02)).toEqual(names.map(() => true));
  });

  it("sizes the longest row and column by its remainder, so the partial picture stays inside the plot (QR-005)", () => {
    const row = sceneOf({ values: [40.5], unitValue: 1 });
    expect(Math.max(...pictures(row).map((node) => num(node, "x") + num(node, "width")))).toBeLessThanOrEqual(SCENE_WIDTH - SCENE_MARGIN);
    const column = sceneOf({ values: [40.5], unitValue: 1, orientation: "vertical" });
    // No title: the plot starts 8 below the top.
    expect(Math.min(...pictures(column).map((node) => num(node, "y")))).toBeGreaterThanOrEqual(8);
  });
});

describe("the drawing's height with one long name (security review SEC-002)", () => {
  const longOne = Array.from({ length: 100 }, (_, i) => ({ name: i === 0 ? "@".repeat(200) : `C${i}` }));

  it("gives one long name one tall row, not a hundred", () => {
    const scene = sceneOf({ categories: longOne, values: longOne.map(() => 1), unitValue: 1 });
    // Before: every row took the tallest name's height, and a 10,000-character name drew 2,058,210 units.
    expect(scene.height).toBeLessThan(4_000);
    const tall = sceneOf({ categories: [longOne[0]!], values: [1], unitValue: 1 }).height;
    const short = sceneOf({ categories: longOne.slice(1, 2), values: [1], unitValue: 1 }).height;
    expect(scene.height).toBeLessThan(tall + 99 * short);
    expect(geometryProblems(scene)).toEqual([]);
  });

  it("bounds a rotated name's drop below the columns", () => {
    const scene = sceneOf({ orientation: "vertical", categories: longOne, values: longOne.map(() => 1), unitValue: 1 });
    expect(scene.height).toBeLessThan(3_000);
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
