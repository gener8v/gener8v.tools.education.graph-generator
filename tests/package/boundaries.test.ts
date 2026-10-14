import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId ?? "parse-error");
}

describe("import boundaries for non-rendering code (CPSE-REQ-006, prd/TC-005)", () => {
  for (const dir of ["core", "tool", "export", "layout", "images"]) {
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

  for (const ext of ["tsx", "mts", "js"]) {
    it(`rejects importing react from a .${ext} file in src/core`, async () => {
      const ids = await ruleIds(`import * as React from "react";\nexport const x = React;\n`, `src/core/fixture.${ext}`);
      expect(ids).toContain("no-restricted-imports");
    });
  }

  it("rejects a dynamic import of react in src/core", async () => {
    const ids = await ruleIds(`export const load = () => import("react-dom/server");\n`, "src/core/fixture.ts");
    expect(ids).toContain("no-restricted-syntax");
  });

  it("rejects require of react in src/layout", async () => {
    const ids = await ruleIds(`export const r = require("react");\n`, "src/layout/fixture.cjs");
    expect(ids).toContain("no-restricted-syntax");
  });

  it("rejects browser globals reached through self or globalThis in src/tool", async () => {
    const ids = await ruleIds(
      `export const a = globalThis.document;\nexport const b = self.navigator;\nexport const c = globalThis.window;\n`,
      "src/tool/fixture.ts",
    );
    expect(ids.filter((id) => id === "no-restricted-syntax" || id === "no-restricted-globals").length).toBeGreaterThanOrEqual(3);
  });

  it("rejects browser globals in the React renderer, which must render the same on the server (QR-003)", async () => {
    const ids = await ruleIds(
      `export const w = window.innerWidth;\nexport const d = document.title;\nexport const g = globalThis.navigator;\n`,
      "src/react/fixture.tsx",
    );
    expect(ids.filter((id) => id === "no-restricted-globals")).toHaveLength(2);
    expect(ids).toContain("no-restricted-syntax");
  });

  it("still rejects network APIs in the React renderer", async () => {
    const ids = await ruleIds(`export const f = () => fetch("https://x");\n`, "src/react/fixture.tsx");
    expect(ids).toContain("no-restricted-globals");
  });

  it("allows react in the React renderer", async () => {
    const ids = await ruleIds(`import { createElement } from "react";\nexport const x = createElement;\n`, "src/react/fixture.ts");
    expect(ids).toEqual([]);
  });

  it("accepts a clean non-rendering module", async () => {
    const ids = await ruleIds(`export function add(a: number, b: number): number {\n  return a + b;\n}\n`, "src/core/fixture.ts");
    expect(ids).toEqual([]);
  });
});

describe("components are pure: no hooks, state, effects or client boundary (AD-014, prd/IC-002)", () => {
  const cases: Array<[string, string, string]> = [
    ["useState", `import { useState } from "react";\nexport const x = useState;\n`, "no-restricted-imports"],
    ["useEffect, renamed", `import { useEffect as run } from "react";\nexport const x = run;\n`, "no-restricted-imports"],
    ["use", `import { use } from "react";\nexport const x = use;\n`, "no-restricted-imports"],
    ["useFormStatus", `import { useFormStatus } from "react-dom";\nexport const x = useFormStatus;\n`, "no-restricted-imports"],
    ["React.useState", `import * as React from "react";\nexport const f = () => React.useState(0);\n`, "no-restricted-syntax"],
    ["\"use client\"", `"use client";\nexport const x = 1;\n`, "no-restricted-syntax"],
    ["Component", `import { Component } from "react";\nexport class C extends Component { state = { n: 0 }; render() { return null; } }\n`, "no-restricted-imports"],
    ["PureComponent", `import { PureComponent } from "react";\nexport const x = PureComponent;\n`, "no-restricted-imports"],
    ["React.Component", `import * as React from "react";\nexport class C extends React.Component { render() { return null; } }\n`, "no-restricted-syntax"],
    ["createContext", `import { createContext } from "react";\nexport const Ctx = createContext(0);\n`, "no-restricted-imports"],
    ["React.createContext", `import * as React from "react";\nexport const Ctx = React.createContext(0);\n`, "no-restricted-syntax"],
    ["an onClick attribute", `export const C = () => <svg onClick={() => 1} />;\n`, "no-restricted-syntax"],
    ["a quoted onClick prop to createElement", `import { createElement } from "react";\nexport const C = () => createElement("svg", { "onClick": () => 1 });\n`, "no-restricted-syntax"],
    ["an onClick prop to createElement", `import { createElement } from "react";\nexport const C = () => createElement("svg", { onClick: () => 1 });\n`, "no-restricted-syntax"],
  ];
  for (const [name, code, rule] of cases) {
    it(`rejects ${name} in src/react`, async () => {
      expect(await ruleIds(code, "src/react/fixture.tsx")).toContain(rule);
    });
  }

  it("does not mistake other names starting with use", async () => {
    expect(await ruleIds(`export const user = { useful: () => 1 };\nexport const u = user.useful();\n`, "src/react/fixture.tsx")).toEqual([]);
  });

  it("passes every shipped component, in src/react and every directory under it", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    // Recursive, so src/react/graphs/ is checked too (quality review QR-001).
    const files = readdirSync("src/react", { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => `${entry.parentPath}/${entry.name}`);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect([file, await ruleIds(readFileSync(file, "utf8"), file)]).toEqual([file, []]);
    }
  });
});

describe("no network access anywhere in src (CPSE-REQ-005, prd/CC-003)", () => {
  const NETWORK_RULES = ["no-restricted-globals", "no-restricted-syntax", "no-restricted-imports"];
  const cases: Array<[string, string]> = [
    ["fetch", `export const r = fetch("https://example.com");\n`],
    ["globalThis.fetch", `export const r = globalThis.fetch("https://example.com");\n`],
    ["self.fetch", `export const r = self.fetch("https://example.com");\n`],
    ["computed globalThis[\"fetch\"]", `export const r = globalThis["fetch"]("https://example.com");\n`],
    ["XMLHttpRequest", `export const r = new XMLHttpRequest();\n`],
    ["globalThis.XMLHttpRequest", `export const r = new globalThis.XMLHttpRequest();\n`],
    ["WebSocket", `export const r = new WebSocket("wss://example.com");\n`],
    ["window.WebSocket", `export const r = new window.WebSocket("wss://example.com");\n`],
    ["EventSource", `export const r = new EventSource("https://example.com");\n`],
    ["navigator.sendBeacon", `export const r = navigator.sendBeacon("https://example.com", "x");\n`],
    ["window.navigator.sendBeacon", `export const r = window.navigator.sendBeacon("https://example.com", "x");\n`],
    ["import node:https", `import https from "node:https";\nexport const r = https;\n`],
    ["import net", `import net from "net";\nexport const r = net;\n`],
    ["dynamic import node:http", `export const r = () => import("node:http");\n`],
    ["require node:tls", `export const r = require("node:tls");\n`],
  ];
  for (const [name, code] of cases) {
    for (const file of ["src/react/fixture.tsx", "src/core/fixture.ts", "src/react/fixture.js", "src/core/fixture.mts"]) {
      it(`rejects ${name} in ${file}`, async () => {
        const ids = await ruleIds(code, file);
        expect(ids.some((id) => NETWORK_RULES.includes(id))).toBe(true);
      });
    }
  }
});

describe("graph-type definitions import helpers without a cycle (GSV TICKET-001 quality review QR-001)", () => {
  for (const source of ["../describe", "../describe.ts", "../describe.js", "../../core/describe"]) {
    it(`rejects importing ${source} from src/core/definitions`, async () => {
      const ids = await ruleIds(`import { describe } from "${source}";\nexport const x = describe;\n`, "src/core/definitions/circle.ts");
      expect(ids).toContain("no-restricted-imports");
    });
  }

  it("allows the format helpers, and keeps the React and network rules", async () => {
    expect(await ruleIds(`import { formatList } from "../format";\nexport const x = formatList;\n`, "src/core/definitions/circle.ts")).toEqual([]);
    expect(await ruleIds(`import { useState } from "react";\nexport const x = useState;\n`, "src/core/definitions/circle.ts")).toContain(
      "no-restricted-imports",
    );
    expect(await ruleIds(`import net from "node:net";\nexport const x = net;\n`, "src/core/definitions/circle.ts")).toContain(
      "no-restricted-imports",
    );
  });
});

describe("image modules import only their drawing helpers (DGP TICKET-004 security review SEC-002)", () => {
  it("allows ./draw and ./types", async () => {
    const source = `import { shape } from "./draw";\nimport { defineImage } from "./types";\nexport const x = [shape, defineImage];\n`;
    expect(await ruleIds(source, "src/images/kite.ts")).toEqual([]);
  });

  it.each(["../layout/kit/format", "./apple", "some-icon-pack", "../../tests/fixtures/images/stray"])("rejects importing %s into an image", async (from) => {
    const ids = await ruleIds(`import * as other from "${from}";\nexport const x = other;\n`, "src/images/kite.ts");
    expect(ids).toContain("no-restricted-imports");
  });

  it("still lets the helpers, the register and the index import what they need", async () => {
    expect(await ruleIds(`import { fmt } from "../layout/kit/format";\nexport const x = fmt;\n`, "src/images/draw.ts")).toEqual([]);
    expect(await ruleIds(`import { apple } from "./apple";\nexport const x = apple;\n`, "src/images/manifest.ts")).toEqual([]);
  });
});

