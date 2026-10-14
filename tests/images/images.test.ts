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
        values: getImageNames() as [ImageName, ...ImageName[]],
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
