import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId ?? "parse-error");
}

describe("import boundaries for non-rendering code (CPSE-REQ-006, prd/TC-005)", () => {
  for (const dir of ["core", "tool", "export", "layout"]) {
    it(`rejects importing react in src/${dir}`, async () => {
      const ids = await ruleIds(`import { useState } from "react";\nexport const x = useState;\n`, `src/${dir}/fixture.ts`);
      expect(ids).toContain("no-restricted-imports");
    });

    it(`rejects importing react-dom/server in src/${dir}`, async () => {
      const ids = await ruleIds(`import { renderToString } from "react-dom/server";\nexport const x = renderToString;\n`, `src/${dir}/fixture.ts`);
      expect(ids).toContain("no-restricted-imports");
    });

    it(`rejects window and document in src/${dir}`, async () => {
      const ids = await ruleIds(`export const w = window.innerWidth;\nexport const d = document.title;\n`, `src/${dir}/fixture.ts`);
      expect(ids.filter((id) => id === "no-restricted-globals")).toHaveLength(2);
    });
  }

  it("allows react in the React renderer", async () => {
    const ids = await ruleIds(`import { useState } from "react";\nexport const x = useState;\n`, "src/react/fixture.ts");
    expect(ids).not.toContain("no-restricted-imports");
  });

  it("accepts a clean non-rendering module", async () => {
    const ids = await ruleIds(`export function add(a: number, b: number): number {\n  return a + b;\n}\n`, "src/core/fixture.ts");
    expect(ids).toEqual([]);
  });
});

describe("no network access anywhere in src (CPSE-REQ-005, prd/CC-003)", () => {
  const cases: Array<[string, string]> = [
    ["fetch", `export const r = fetch("https://example.com");\n`],
    ["globalThis.fetch", `export const r = globalThis.fetch("https://example.com");\n`],
    ["XMLHttpRequest", `export const r = new XMLHttpRequest();\n`],
    ["WebSocket", `export const r = new WebSocket("wss://example.com");\n`],
    ["navigator.sendBeacon", `export const r = navigator.sendBeacon("https://example.com", "x");\n`],
  ];
  for (const [name, code] of cases) {
    it(`rejects ${name} in the React renderer`, async () => {
      const ids = await ruleIds(code, "src/react/fixture.tsx");
      expect(ids.some((id) => id === "no-restricted-globals" || id === "no-restricted-properties")).toBe(true);
    });
  }
});
