import { copyFileSync, mkdirSync } from "node:fs";
import { defineConfig } from "tsup";

// One entry per public entry point (AD-001). Per-type entries (`src/entries/<type>.ts`)
// are added here by each graph-type ticket.
// @spec CPSE-REQ-003, CPSE-REQ-004
export default defineConfig({
  entry: {
    index: "src/index.ts",
    "core/index": "src/core/index.ts",
    "tool/index": "src/tool/index.ts",
    "export/index": "src/export/index.ts",
    circle: "src/entries/circle.ts",
    pictograph: "src/entries/pictograph.ts",
    "line-graph": "src/entries/line-graph.ts",
    "bar-graph": "src/entries/bar-graph.ts",
    ruler: "src/entries/ruler.ts",
    "number-line": "src/entries/number-line.ts",
    "xy-graph": "src/entries/xy-graph.ts",
    "xyz-graph": "src/entries/xyz-graph.ts",
    square: "src/entries/square.ts",
    triangle: "src/entries/triangle.ts",
    cube: "src/entries/cube.ts",
  },
  format: ["esm"],
  // tsup sets the `baseUrl` option for declaration builds, which TypeScript 6 reports as deprecated.
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  splitting: true,
  treeshake: true,
  sourcemap: false,
  clean: true,
  target: ["node22", "es2022"],
  platform: "neutral",
  external: ["react", "react-dom", "react/jsx-runtime"],
  onSuccess: async () => {
    // Static files exported as ./schema.json and ./vocabulary.json (GSV-REQ-010).
    mkdirSync("dist", { recursive: true });
    copyFileSync("src/generated/schema.json", "dist/schema.json");
    copyFileSync("src/generated/vocabulary.json", "dist/vocabulary.json");
  },
});
