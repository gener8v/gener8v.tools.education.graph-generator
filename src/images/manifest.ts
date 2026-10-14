import { apple } from "./apple";
import { ball } from "./ball";
import { book } from "./book";
import { fish } from "./fish";
import { flower } from "./flower";
import { person } from "./person";
import { star } from "./star";
import { tree } from "./tree";
import type { ImageAsset, ImageManifestEntry } from "./types";

/**
 * Every image in the published set, in the order they are listed: one import per file in
 * `src/images/` that holds an image. `pnpm check:images` fails when a file there is not listed, so
 * no drawing ships without its license recorded (DGP-NFR-005). Images are drawn in-house under the
 * package license; the set needs Product Owner sign-off before release (EXT-001, DGP OQ-002). At
 * most 20 (AD-012), so the pictograph, which carries them all, stays within its budget.
 */
// @spec DGP-REQ-033, DGP-REQ-034
export const imageAssets = [apple, ball, book, fish, flower, person, star, tree] as const satisfies readonly ImageAsset[];

/** The license register: each image's name, description, license, author and provenance, read from the image itself. */
// @spec DGP-REQ-034, DGP-NFR-005
export const imageManifest: readonly ImageManifestEntry[] = imageAssets.map(({ name, description, license, author, provenance }) =>
  Object.freeze({ name, description, license, author, provenance }),
);
