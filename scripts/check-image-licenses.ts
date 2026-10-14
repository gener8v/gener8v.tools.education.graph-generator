import { readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ALLOWED_IMAGE_LICENSES } from "../src/images/types";

/** The files in `src/images/` that hold no image: the types, the drawing helpers, the register and the index. */
export const NON_IMAGE_FILES: ReadonlySet<string> = new Set(["types.ts", "draw.ts", "manifest.ts", "index.ts"]);

/** An image file as the check sees it: its name, and the images (name and license) it exports. */
export interface ImageFile {
  readonly file: string;
  readonly images: ReadonlyArray<{ readonly name: unknown; readonly license: unknown }>;
}

/** What the check reads from the license register. */
export interface RegisterEntry {
  readonly name: string;
  readonly license: string;
}

const allowed = (license: unknown) => (ALLOWED_IMAGE_LICENSES as readonly unknown[]).includes(license);

/**
 * Every way the image files and the license register disagree (DGP-NFR-005, prd/CC-001):
 * - a file that exports no image, or an image not named after its file;
 * - an image with no register entry, or whose license differs from its entry;
 * - a license outside `ALLOWED_IMAGE_LICENSES` (MIT, CC0-1.0), in a file or in the register;
 * - a register entry with no file.
 * Returns one message per problem; an empty list means every image's license is recorded.
 */
// @spec DGP-REQ-034, DGP-NFR-005
export function checkImageLicenses(files: readonly ImageFile[], register: readonly RegisterEntry[]): string[] {
  const problems: string[] = [];
  const entries = new Map(register.map((entry) => [entry.name, entry]));
  const seen = new Set<string>();
  for (const { file, images } of files) {
    const expected = basename(file, ".ts");
    if (images.length === 0) problems.push(`src/images/${file}: exports no image; add one, or list the file in NON_IMAGE_FILES if it holds none.`);
    for (const image of images) {
      const name = String(image.name);
      seen.add(name);
      if (name !== expected) problems.push(`src/images/${file}: exports the image "${name}"; an image lives in the file named after it.`);
      if (!allowed(image.license)) {
        problems.push(`src/images/${file}: license ${JSON.stringify(image.license)} is not one of ${ALLOWED_IMAGE_LICENSES.join(", ")}.`);
      }
      const entry = entries.get(name);
      if (entry === undefined) problems.push(`src/images/${file}: the image "${name}" has no entry in src/images/manifest.ts.`);
      else if (entry.license !== image.license) {
        problems.push(`src/images/${file}: its license (${String(image.license)}) differs from its manifest entry (${entry.license}).`);
      }
    }
  }
  for (const entry of register) {
    if (!allowed(entry.license)) problems.push(`src/images/manifest.ts: "${entry.name}" has license ${JSON.stringify(entry.license)}, not one of ${ALLOWED_IMAGE_LICENSES.join(", ")}.`);
    if (!seen.has(entry.name)) problems.push(`src/images/manifest.ts: "${entry.name}" has no image file in src/images/.`);
  }
  return problems;
}

/** Whether an export looks like an image: an object with a name, a license and nodes. */
const isImage = (value: unknown): value is ImageFile["images"][number] =>
  typeof value === "object" && value !== null && "name" in value && "license" in value && "nodes" in value;

/** Every image file in `dir` with the images it exports, loading each module. */
export async function readImageFiles(dir: string): Promise<ImageFile[]> {
  const names = readdirSync(dir)
    .filter((file) => file.endsWith(".ts") && !NON_IMAGE_FILES.has(file))
    .sort();
  const files: ImageFile[] = [];
  for (const file of names) {
    const exports = (await import(pathToFileURL(join(dir, file)).href)) as Record<string, unknown>;
    files.push({ file, images: Object.values(exports).filter(isImage) });
  }
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = resolve(process.argv[2] ?? "src/images");
  const { imageManifest } = (await import(pathToFileURL(join(dir, "manifest.ts")).href)) as { imageManifest: RegisterEntry[] };
  const files = await readImageFiles(dir);
  const problems = checkImageLicenses(files, imageManifest);
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log(`Images: ${files.length}, every license recorded and allowed (${ALLOWED_IMAGE_LICENSES.join(", ")}).`);
}
