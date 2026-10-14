import { describe, expect, expectTypeOf, it } from "vitest";
import type { Registry } from "../../src/core/definitions/index";
import { type GraphTypeDefinition, defineProperties } from "../../src/core/definitions/types";
import { buildSchema, buildVocabulary } from "../../src/core/schema";
import {
  ALLOWED_IMAGE_LICENSES,
  IMAGE_VIEW_BOX,
  type ImageName,
  getImageNames,
  imageDescriptions,
  imageManifest,
  images,
} from "../../src/images/index";
import { ring } from "../../src/images/draw";
import { apple } from "../../src/images/apple";
import { imageAssets } from "../../src/images/manifest";
import { checkScene } from "../../src/layout/kit/check";
import { fmt } from "../../src/layout/kit/format";
import type { SceneNode } from "../../src/layout/scene";

const all = Object.values(images);
const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Every node in an image, nested ones included. */
function nodesOf(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.flatMap((node) => ("children" in node ? [node, ...nodesOf(node.children)] : [node]));
}

describe("the published image set (DGP-REQ-033)", () => {
  it("has between 5 and 20 images, listed in the manifest in one order", () => {
    expect(all.length).toBeGreaterThanOrEqual(5);
    expect(all.length).toBeLessThanOrEqual(20);
    expect(getImageNames()).toEqual(imageManifest.map((entry) => entry.name));
    expect(getImageNames()).toEqual(["apple", "ball", "book", "fish", "flower", "person", "star", "tree"]);
  });

  it("names each image once, in lower-case kebab case", () => {
    const names = getImageNames();
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name, name).toMatch(KEBAB_CASE);
  });

  it("types the names as a closed union", () => {
    expectTypeOf<ImageName>().toEqualTypeOf<"apple" | "ball" | "book" | "fish" | "flower" | "person" | "star" | "tree">();
  });

  it("describes each image in plain English, and the manifest repeats the image's own facts", () => {
    for (const image of all) {
      expect(image.description, image.name).toMatch(/^[A-Z].{10,}\.$/);
      expect(imageDescriptions()[image.name as ImageName]).toBe(image.description);
      const entry = imageManifest.find((e) => e.name === image.name);
      expect(entry, image.name).toEqual({
        name: image.name,
        description: image.description,
        license: image.license,
        author: image.author,
        provenance: image.provenance,
      });
    }
  });

  it("finds nothing for names that are not images, such as inherited object keys", () => {
    for (const key of ["constructor", "toString", "__proto__", "Apple"]) {
      expect((images as Record<string, unknown>)[key], key).toBeUndefined();
    }
    expect(Object.isFrozen(images)).toBe(true);
  });
});

describe("image licenses and provenance (DGP-REQ-034, prd/CC-001, prd/CC-004)", () => {
  it("are drawn in-house and released under the package license", () => {
    for (const image of all) {
      expect(ALLOWED_IMAGE_LICENSES, image.name).toContain(image.license);
      expect(image.license, image.name).toBe("MIT");
      expect(image.author, image.name).toBe("gener8v");
      expect(image.provenance, image.name).toMatch(/^Drawn in-house for this package/);
    }
  });
});

describe("image drawings (AD-008, AD-011, AD-012, prd/CC-003)", () => {
  it("use only Scene primitives and presentation attributes, every number through fmt()", () => {
    for (const image of all) {
      expect(image.viewBox, image.name).toBe(IMAGE_VIEW_BOX);
      const scene = { width: 400 as const, height: fmt(100), textAlternative: image.description, nodes: image.nodes };
      expect(checkScene(scene), image.name).toEqual([]);
    }
  });

  it("hold no text, element id, external URL or raster data", () => {
    for (const image of all) {
      for (const node of nodesOf(image.nodes)) {
        expect(node.kind, image.name).not.toBe("text");
        for (const [name, value] of node.attrs) {
          expect(name, image.name).not.toMatch(/^(id|href|xlink:href|class|style)$/);
          expect(String(value), image.name).not.toMatch(/url\(|data:|https?:|\/\//i);
        }
      }
    }
  });

  it("stay small: a handful of shapes each, so the pictograph that carries them all keeps its budget (TR-004)", () => {
    for (const image of all) expect(nodesOf(image.nodes).length, image.name).toBeLessThanOrEqual(8);
    expect(JSON.stringify(images).length).toBeLessThan(8_000);
  });
});

/** Every coordinate a shape's attributes place, as numbers: centers with radii, rect corners, path and point lists. */
function extentOf(node: SceneNode): number[] {
  const num = (name: string) => Number(node.attrs.find(([key]) => key === name)?.[1]);
  switch (node.kind) {
    case "circle":
      return [num("cx") - num("r"), num("cx") + num("r"), num("cy") - num("r"), num("cy") + num("r")];
    case "ellipse":
      return [num("cx") - num("rx"), num("cx") + num("rx"), num("cy") - num("ry"), num("cy") + num("ry")];
    case "rect":
      return [num("x"), num("x") + num("width"), num("y"), num("y") + num("height")];
    default: {
      // `d` and `points` hold coordinates only (no arcs), so every number is one.
      const text = String(node.attrs.find(([key]) => key === "d" || key === "points")?.[1] ?? "");
      return (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    }
  }
}

describe("what each image draws (quality review QR-001)", () => {
  it("stays inside its 100 × 100 space", () => {
    for (const image of all) {
      for (const node of nodesOf(image.nodes)) {
        for (const value of extentOf(node)) {
          expect(value, `${image.name} ${node.kind}`).toBeGreaterThanOrEqual(0);
          expect(value, `${image.name} ${node.kind}`).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("draws exactly what was reviewed: any change to a drawing changes this snapshot", () => {
    const drawings = Object.fromEntries(
      all.map((image) => [image.name, image.nodes.map((node) => `${node.kind} ${node.attrs.map(([k, v]) => `${k}=${v}`).join(" ")}`)]),
    );
    expect(drawings).toMatchSnapshot();
  });

  it("ring() places points evenly around a center, starting straight up", () => {
    const square = ring(50, 50, 4, 10);
    expect(square.map(([x, y]) => [Math.round(x * 1e9) / 1e9, Math.round(y * 1e9) / 1e9])).toEqual([
      [50, 40],
      [60, 50],
      [50, 60],
      [40, 50],
    ]);
  });

  it("ring() alternates the outer and inner radii when given both, so a five-pointed star has ten points", () => {
    const star = ring(0, 0, 5, 10, 4);
    expect(star).toHaveLength(10);
    star.forEach(([x, y], i) => expect(Math.hypot(x, y)).toBeCloseTo(i % 2 === 0 ? 10 : 4, 9));
    expect(star[0]![1]).toBeCloseTo(-10, 9); // the first point is straight up (y grows downward)
  });
});

describe("image data cannot be changed at runtime (quality review QR-002)", () => {
  it("freezes every image, its nodes and attributes, the list and the register", () => {
    const locked = (value: unknown, path: string, problems: string[] = []): string[] => {
      if (value !== null && typeof value === "object") {
        if (!Object.isFrozen(value)) problems.push(path);
        for (const [key, inner] of Object.entries(value)) locked(inner, `${path}.${key}`, problems);
      }
      return problems;
    };
    expect(locked(imageAssets, "imageAssets")).toEqual([]);
    expect(locked(imageManifest, "imageManifest")).toEqual([]);
    expect(() => {
      (apple as { license: string }).license = "CC-BY-NC-4.0";
    }).toThrow(TypeError);
    expect(apple.license).toBe("MIT");
  });
});

describe("image names in the schema and the vocabulary (DGP-REQ-035)", () => {
  // The schema generator reads definitions only (GSV TICKET-005 DEL-008): DGP TICKET-005's
  // pictograph builds its `unitImage` enum from `getImageNames()` and `imageDescriptions()`.
  const pictograph: GraphTypeDefinition = {
    type: "pictograph",
    title: "Pictograph",
    description: "A test-only pictograph.",
    properties: defineProperties({
      unitImage: {
        term: "unitImage",
        kind: "enum",
        required: true,
        values: getImageNames(),
        valueDescriptions: imageDescriptions(),
        description: "The image each unit is drawn with.",
      },
    }),
    derivations: [],
    checks: [],
    describe: () => "A pictograph.",
  };
  const registry: Registry = { pictograph };

  it("publishes every name as an allowed unitImage value in the schema", () => {
    const schema = JSON.stringify(buildSchema(registry));
    expect(schema).toContain(JSON.stringify(getImageNames()));
  });

  it("lists every name with its description in the vocabulary", () => {
    const unitImage = buildVocabulary(registry).graphTypes.pictograph?.properties["unitImage"];
    expect(unitImage?.values).toEqual(getImageNames());
    expect(unitImage?.valueDescriptions).toEqual(imageDescriptions());
  });
});
