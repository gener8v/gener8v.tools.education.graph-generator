import { readdirSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ALLOWED_IMAGE_LICENSES } from "../src/images/types";

/** The files in `src/images/` that hold no image: the types, the drawing helpers, the register and the index. */
export const NON_IMAGE_FILES: ReadonlySet<string> = new Set(["types.ts", "draw.ts", "manifest.ts", "index.ts"]);

/** An image module's file name: a lower-case kebab-case name and `.ts`, as `apple.ts`. */
export const IMAGE_FILE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.ts$/;

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
 * - a register entry with no file;
 * - any other entry in the directory (`others`): another extension, a subfolder, a stray file.
 * Messages name files under `dir`, the directory checked as the reader knows it. Returns one
 * message per problem; an empty list means every image's license is recorded.
 */
// @spec DGP-REQ-034, DGP-NFR-005
export function checkImageLicenses(
  files: readonly ImageFile[],
  register: readonly RegisterEntry[],
  others: readonly string[] = [],
  dir = "src/images",
): string[] {
  const problems: string[] = [];
  // Anything else in the directory could hold an image the check never loads: another extension,
  // a subfolder, a stray drawing (code review CR-001).
  for (const other of others) {
    problems.push(`${dir}/${other}: not an image module; an image is a <kebab-name>.ts file in ${dir}/ itself, listed in the manifest.`);
  }
  const entries = new Map(register.map((entry) => [entry.name, entry]));
  const seen = new Set<string>();
  for (const { file, images } of files) {
    const expected = basename(file, ".ts");
    if (images.length === 0) problems.push(`${dir}/${file}: exports no image; add one, or list the file in NON_IMAGE_FILES if it holds none.`);
    for (const image of images) {
      const name = String(image.name);
      seen.add(name);
      if (name !== expected) problems.push(`${dir}/${file}: exports the image "${name}"; an image lives in the file named after it.`);
      if (!allowed(image.license)) {
        problems.push(`${dir}/${file}: license ${JSON.stringify(image.license)} is not one of ${ALLOWED_IMAGE_LICENSES.join(", ")}.`);
      }
      const entry = entries.get(name);
      if (entry === undefined) problems.push(`${dir}/${file}: the image "${name}" has no entry in ${dir}/manifest.ts.`);
      else if (entry.license !== image.license) {
        problems.push(`${dir}/${file}: its license (${String(image.license)}) differs from its manifest entry (${entry.license}).`);
      }
    }
  }
  for (const entry of register) {
    if (!allowed(entry.license)) problems.push(`${dir}/manifest.ts: "${entry.name}" has license ${JSON.stringify(entry.license)}, not one of ${ALLOWED_IMAGE_LICENSES.join(", ")}.`);
    if (!seen.has(entry.name)) problems.push(`${dir}/manifest.ts: "${entry.name}" has no image file in ${dir}/.`);
  }
  return problems;
}

/** Whether an export looks like an image: an object with a name, a license and nodes. */
const isImage = (value: unknown): value is ImageFile["images"][number] =>
  typeof value === "object" && value !== null && "name" in value && "license" in value && "nodes" in value;

/**
 * Every image file in `dir` with the images it exports, loading each module, and every other entry
 * (`others`): anything that is neither one of `NON_IMAGE_FILES` nor a `<kebab-name>.ts` file, such
 * as `cat.tsx`, a subfolder or a `.svg`, with a trailing `/` on folders.
 */
export async function readImageFiles(dir: string): Promise<{ files: ImageFile[]; others: string[] }> {
  // Code-unit order, the same on every machine (not the locale's).
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files: ImageFile[] = [];
  const others: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && NON_IMAGE_FILES.has(entry.name)) continue;
    if (!entry.isFile() || !IMAGE_FILE.test(entry.name)) {
      others.push(entry.isDirectory() ? `${entry.name}/` : entry.name);
      continue;
    }
    const exports = (await import(pathToFileURL(join(dir, entry.name)).href)) as Record<string, unknown>;
    files.push({ file: entry.name, images: Object.values(exports).filter(isImage) });
  }
  return { files, others };
}

/** Whether a value is a register: a list of entries, each with a text name and license. */
function isRegister(value: unknown): value is RegisterEntry[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "object" && entry !== null && typeof entry.name === "string" && typeof entry.license === "string")
  );
}

/**
 * The whole check on an image directory: its register (`manifest.ts`'s `imageManifest`), its image
 * modules and anything else in it. A register that is missing, or not a list of entries with a name
 * and a license, is reported as a problem, never a crash (quality review QR-008). `label` is the
 * directory as messages name it.
 */
export async function runImageCheck(dir: string, label = relative(process.cwd(), dir) || "."): Promise<{ problems: string[]; names: string[] }> {
  let register: unknown;
  try {
    register = ((await import(pathToFileURL(join(dir, "manifest.ts")).href)) as { imageManifest?: unknown }).imageManifest;
  } catch (error) {
    return { problems: [`${label}/manifest.ts: cannot be loaded (${(error as Error).message}).`], names: [] };
  }
  if (!isRegister(register)) {
    return { problems: [`${label}/manifest.ts: must export imageManifest, a list of entries each with a name and a license.`], names: [] };
  }
  const { files, others } = await readImageFiles(dir);
  return { problems: checkImageLicenses(files, register, others, label), names: register.map((entry) => entry.name) };
}

/**
 * The command line, `pnpm check:images [dir]`: prints each problem and returns 1, or prints the
 * register and returns 0. In-process, so tests run it without spawning (quality review QR-007).
 */
export async function main(args: readonly string[]): Promise<number> {
  const { problems, names } = await runImageCheck(resolve(args[0] ?? "src/images"));
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    return 1;
  }
  console.log(`Images: ${names.length} (${names.join(", ")}), every license recorded and allowed (${ALLOWED_IMAGE_LICENSES.join(", ")}).`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
