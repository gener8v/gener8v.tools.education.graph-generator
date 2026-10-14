import type { SceneNode } from "../layout/scene";

/**
 * The licenses an image in the published set may carry: the package's own (MIT), or a public-domain
 * dedication. Both allow redistribution, including inside a consumer's exported source (prd/CC-001,
 * prd/TC-009).
 */
// @spec DGP-REQ-034
export const ALLOWED_IMAGE_LICENSES = Object.freeze(["MIT", "CC0-1.0"] as const);

export type ImageLicense = (typeof ALLOWED_IMAGE_LICENSES)[number];

/**
 * The notice each license requires a copy of a drawing to carry. Source export (CPSE TICKET-005)
 * copies drawings into a consumer's file, so it prints the notice for each embedded image's license
 * there (prd/CC-001, prd/TC-009; DGP TICKET-004 security review SEC-004). The MIT notice is the
 * package's own `LICENSE`, which a test keeps identical.
 */
// @spec DGP-REQ-034
export const IMAGE_LICENSE_NOTICES: Readonly<Record<ImageLicense, string>> = /* @__PURE__ */ Object.freeze({
  // One string literal joined with `+`, which a bundler folds, so an unused notice is dropped.
  MIT:
    "MIT License\n" +
    "\n" +
    "Copyright (c) 2026 gener8v\n" +
    "\n" +
    "Permission is hereby granted, free of charge, to any person obtaining a copy\n" +
    "of this software and associated documentation files (the \"Software\"), to deal\n" +
    "in the Software without restriction, including without limitation the rights\n" +
    "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n" +
    "copies of the Software, and to permit persons to whom the Software is\n" +
    "furnished to do so, subject to the following conditions:\n" +
    "\n" +
    "The above copyright notice and this permission notice shall be included in all\n" +
    "copies or substantial portions of the Software.\n" +
    "\n" +
    "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n" +
    "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n" +
    "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n" +
    "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n" +
    "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n" +
    "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\n" +
    "SOFTWARE.",
  "CC0-1.0":
    "Dedicated to the public domain under CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/); no notice is required.",
});

/** The space every image is drawn in: 100 × 100 units, origin top left (AD-012). */
export const IMAGE_VIEW_BOX = "0 0 100 100";

/**
 * One pictograph image (AD-012): a small vector drawing as Scene nodes in its own 100 × 100 space,
 * with what a caller and an auditor need to know about it.
 */
// @spec DGP-REQ-033, DGP-REQ-034
export interface ImageAsset<Name extends string = string> {
  /** The name a description gives as `unitImage`: lower-case kebab case, part of the public contract (RES-009). */
  readonly name: Name;
  /** A plain-English description, published in the vocabulary with the name. */
  readonly description: string;
  readonly license: ImageLicense;
  readonly author: string;
  /** Where the drawing came from, for the license register. */
  readonly provenance: string;
  /** The image's own coordinate space, `IMAGE_VIEW_BOX`. */
  readonly viewBox: string;
  /** Scene primitives with presentation attributes only: no text, ids, references or raster data (AD-008, AD-011). */
  readonly nodes: readonly SceneNode[];
}

/** An image's entry in the license register (`manifest.ts`). */
export type ImageManifestEntry = Pick<ImageAsset, "name" | "description" | "license" | "author" | "provenance">;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
}

/**
 * An image as the set publishes it: frozen all the way down (its nodes, their attributes, each
 * attribute pair), so no module can change a drawing or its license at runtime, as
 * `defineProperties` does for definitions (quality review QR-002).
 */
/* @__NO_SIDE_EFFECTS__ */
export function defineImage<Name extends string>(image: ImageAsset<Name>): ImageAsset<Name> {
  return deepFreeze(image);
}

