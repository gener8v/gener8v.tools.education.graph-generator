import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type ImageFile, checkImageLicenses, main, readImageFiles, runImageCheck } from "../../scripts/check-image-licenses";
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
    // Made in `beforeAll`, so a run that filters this test out leaves nothing behind (QR-009).
    let dir = "";
    beforeAll(() => {
      dir = mkdtempSync(join(tmpdir(), "image-check-"));
      const unlisted = 'export const cat = { name: "cat", license: "CC-BY-NC-4.0", nodes: [] };\n';
      writeFileSync(join(dir, "cat.tsx"), unlisted);
      writeFileSync(join(dir, "cat.mts"), unlisted);
      writeFileSync(join(dir, "cat.svg"), "<svg/>");
      writeFileSync(join(dir, "Cat.ts"), unlisted);
      mkdirSync(join(dir, "animals"));
      writeFileSync(join(dir, "animals", "cat.ts"), unlisted);
      writeFileSync(join(dir, "manifest.ts"), "export const imageManifest = [];\n");
    });
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it("is reported, whatever its extension, case or folder, without being loaded", async () => {
      const { files, others } = await readImageFiles(dir);
      expect(files).toEqual([]);
      expect(others).toEqual(["Cat.ts", "animals/", "cat.mts", "cat.svg", "cat.tsx"]);
      expect(checkImageLicenses(files, [], others)).toEqual(
        others.map((other) => `src/images/${other}: not an image module; an image is a <kebab-name>.ts file in src/images/ itself, listed in the manifest.`),
      );
    });
  });

  describe("the whole check, as `pnpm check:images` runs it", () => {
    it("names the directory it checked, and the unlisted image in it (QR-008)", async () => {
      const failed = await runImageCheck(FIXTURE_DIR);
      expect(failed.problems).toEqual(['tests/fixtures/images/stray.ts: the image "stray" has no entry in tests/fixtures/images/manifest.ts.']);
      expect(await runImageCheck(IMAGES_DIR)).toEqual({ problems: [], names: imageManifest.map((entry) => entry.name) });
    });

    describe("a missing or malformed register (QR-008)", () => {
      let dir = "";
      beforeAll(() => {
        dir = mkdtempSync(join(tmpdir(), "image-register-"));
        mkdirSync(join(dir, "none"));
        mkdirSync(join(dir, "wrong"));
        writeFileSync(join(dir, "wrong", "manifest.ts"), 'export const imageManifest = { apple: "MIT" };\n');
      });
      afterAll(() => rmSync(dir, { recursive: true, force: true }));

      it("is reported as a problem, not a crash", async () => {
        expect((await runImageCheck(join(dir, "none"), "none")).problems).toEqual([expect.stringMatching(/^none\/manifest\.ts: cannot be loaded \(/)]);
        expect((await runImageCheck(join(dir, "wrong"), "wrong")).problems).toEqual([
          "wrong/manifest.ts: must export imageManifest, a list of entries each with a name and a license.",
        ]);
      });
    });

    it("returns exit code 1 with each problem on stderr, and 0 with the register on stdout (QR-007)", async () => {
      // In-process: spawning the command here loaded the machine enough to slow other tests.
      const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const logs = vi.spyOn(console, "log").mockImplementation(() => undefined);
      try {
        expect(await main([FIXTURE_DIR])).toBe(1);
        expect(errors.mock.calls).toEqual([['tests/fixtures/images/stray.ts: the image "stray" has no entry in tests/fixtures/images/manifest.ts.']]);
        // With no argument it checks src/images, relative to the working directory (the repository root).
        expect(await main([])).toBe(0);
        expect(logs.mock.calls).toEqual([
          ["Images: 8 (apple, ball, book, fish, flower, person, star, tree), every license recorded and allowed (MIT, CC0-1.0)."],
        ]);
      } finally {
        errors.mockRestore();
        logs.mockRestore();
      }
    });
  });
});
