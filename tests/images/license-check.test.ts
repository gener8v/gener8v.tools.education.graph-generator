import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { type ImageFile, checkImageLicenses, readImageFiles, runImageCheck } from "../../scripts/check-image-licenses";
import { imageManifest } from "../../src/images/index";

const IMAGES_DIR = fileURLToPath(new URL("../../src/images", import.meta.url));
const FIXTURE_DIR = fileURLToPath(new URL("../fixtures/images", import.meta.url));

const file = (name: string, license: unknown = "MIT", imageName: unknown = name): ImageFile => ({
  file: `${name}.ts`,
  images: [{ name: imageName, license }],
});

describe("the image license check (DGP-NFR-005, DGP-REQ-034)", () => {
  it("passes on the published set", async () => {
    const { files, others } = await readImageFiles(IMAGES_DIR);
    expect(files.map((f) => f.file)).toHaveLength(imageManifest.length);
    expect(others).toEqual([]);
    expect(checkImageLicenses(files, imageManifest, others)).toEqual([]);
  });

  it("fails on an image without a register entry, and on an entry without an image", async () => {
    const { files } = await readImageFiles(FIXTURE_DIR);
    expect(checkImageLicenses(files, [{ name: "listed", license: "MIT" }, { name: "gone", license: "MIT" }])).toEqual([
      'src/images/stray.ts: the image "stray" has no entry in src/images/manifest.ts.',
      'src/images/manifest.ts: "gone" has no image file in src/images/.',
    ]);
  });

  it("fails on a license outside MIT and CC0-1.0, in a file or in the register", () => {
    expect(checkImageLicenses([file("apple", "CC-BY-NC-4.0")], [{ name: "apple", license: "CC-BY-NC-4.0" }])).toEqual([
      'src/images/apple.ts: license "CC-BY-NC-4.0" is not one of MIT, CC0-1.0.',
      'src/images/manifest.ts: "apple" has license "CC-BY-NC-4.0", not one of MIT, CC0-1.0.',
    ]);
    expect(checkImageLicenses([file("apple", "CC0-1.0")], [{ name: "apple", license: "CC0-1.0" }])).toEqual([]);
  });

  it("fails on a license that differs from the register, a misnamed image, and a file with no image", () => {
    expect(checkImageLicenses([file("apple", "CC0-1.0")], [{ name: "apple", license: "MIT" }])).toEqual([
      "src/images/apple.ts: its license (CC0-1.0) differs from its manifest entry (MIT).",
    ]);
    expect(checkImageLicenses([file("apple", "MIT", "pear")], [{ name: "pear", license: "MIT" }])).toEqual([
      'src/images/apple.ts: exports the image "pear"; an image lives in the file named after it.',
    ]);
    expect(checkImageLicenses([{ file: "notes.ts", images: [] }], [])).toEqual([
      "src/images/notes.ts: exports no image; add one, or list the file in NON_IMAGE_FILES if it holds none.",
    ]);
  });

  describe("anything in the directory that is not a listed image module (code review CR-001)", () => {
    const dir = mkdtempSync(join(tmpdir(), "image-check-"));
    afterAll(() => rmSync(dir, { recursive: true, force: true }));
    const unlisted = 'export const cat = { name: "cat", license: "CC-BY-NC-4.0", nodes: [] };\n';
    writeFileSync(join(dir, "cat.tsx"), unlisted);
    writeFileSync(join(dir, "cat.mts"), unlisted);
    writeFileSync(join(dir, "cat.svg"), "<svg/>");
    writeFileSync(join(dir, "Cat.ts"), unlisted);
    mkdirSync(join(dir, "animals"));
    writeFileSync(join(dir, "animals", "cat.ts"), unlisted);
    writeFileSync(join(dir, "manifest.ts"), "export const imageManifest = [];\n");

    it("is reported, whatever its extension, case or folder, without being loaded", async () => {
      const { files, others } = await readImageFiles(dir);
      expect(files).toEqual([]);
      expect(others).toEqual(["Cat.ts", "animals/", "cat.mts", "cat.svg", "cat.tsx"]);
      expect(checkImageLicenses(files, [], others)).toEqual(
        others.map((other) => `src/images/${other}: not an image module; an image is a <kebab-name>.ts file in src/images/ itself, listed in the manifest.`),
      );
    });
  });

  it("fails as a whole, naming the unlisted image, and passes on the published set", async () => {
    // What `pnpm check:images` runs, in-process: spawning it here loaded the machine enough to slow
    // other timing-bound tests. The command line exits 1 exactly when `problems` is not empty.
    const failed = await runImageCheck(FIXTURE_DIR);
    expect(failed.problems).toEqual(['src/images/stray.ts: the image "stray" has no entry in src/images/manifest.ts.']);
    expect(await runImageCheck(IMAGES_DIR)).toEqual({ problems: [], imageCount: imageManifest.length });
  });
});
