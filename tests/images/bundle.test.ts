import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

// Importing a type or a constant from the images must not bundle the drawings (quality review
// QR-006): the tables and every drawing helper are marked free of side effects, so a bundler can
// drop what nothing reads. Using the names still brings them all, as the pictograph needs.

const root = fileURLToPath(new URL("../..", import.meta.url));

async function bundle(entry: string): Promise<string> {
  const result = await build({
    stdin: { contents: entry, resolveDir: root, loader: "ts", sourcefile: "entry.ts" },
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    treeShaking: true,
    minify: true,
    logLevel: "silent",
  });
  return result.outputFiles[0]!.text;
}

describe("the image set in a bundle (prd/TC-007)", () => {
  it("leaves every drawing out when only a constant is imported", async () => {
    const code = await bundle(`import { IMAGE_VIEW_BOX } from "./src/images/index"; console.log(IMAGE_VIEW_BOX);`);
    expect(code).not.toMatch(/apple|#c62828|circle/);
    expect(code.length).toBeLessThan(200);
  });

  it("keeps every drawing when the names are used", async () => {
    const code = await bundle(`import { images } from "./src/images/index"; console.log(images);`);
    for (const name of ["apple", "ball", "book", "fish", "flower", "person", "star", "tree"]) expect(code).toContain(`"${name}"`);
  });
});
