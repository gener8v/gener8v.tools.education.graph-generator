import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { type ImageFile, checkImageLicenses, readImageFiles } from "../../scripts/check-image-licenses";
import { imageManifest } from "../../src/images/index";

const IMAGES_DIR = fileURLToPath(new URL("../../src/images", import.meta.url));
const FIXTURE_DIR = fileURLToPath(new URL("../fixtures/images", import.meta.url));

const file = (name: string, license: unknown = "MIT", imageName: unknown = name): ImageFile => ({
  file: `${name}.ts`,
  images: [{ name: imageName, license }],
});

describe("the image license check (DGP-NFR-005, DGP-REQ-034)", () => {
  it("passes on the published set", async () => {
    const files = await readImageFiles(IMAGES_DIR);
    expect(files.map((f) => f.file)).toHaveLength(imageManifest.length);
    expect(checkImageLicenses(files, imageManifest)).toEqual([]);
  });

  it("fails on an image without a register entry, and on an entry without an image", async () => {
    const files = await readImageFiles(FIXTURE_DIR);
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

  it("exits 1 from the command line on an unlisted image, and 0 on the published set", () => {
    const run = (dir?: string) => {
      try {
        execFileSync("pnpm", ["exec", "tsx", "scripts/check-image-licenses.ts", ...(dir === undefined ? [] : [dir])], { stdio: "pipe" });
        return 0;
      } catch (error) {
        return (error as { status: number }).status;
      }
    };
    expect(run(FIXTURE_DIR)).toBe(1);
    expect(run()).toBe(0);
  }, 30_000);
});
