import { describe, expect, it, vi } from "vitest";
import { exportSource } from "../../src/export/index";
import { loadExample } from "../fixtures/examples";

// A printer that fails on demand, so a test can show `exportSource` turns a printer defect into
// `internal_error` (quality review QR-001). In a file of its own, because a mock is file-wide.
const printer = vi.hoisted(() => ({ fails: false }));
vi.mock("../../src/export/print", async (importOriginal) => {
  const print = await importOriginal<typeof import("../../src/export/print")>();
  return {
    ...print,
    printScene: (...args: Parameters<typeof print.printScene>) => {
      if (printer.fails) throw new Error("secret");
      return print.printScene(...args);
    },
  };
});

describe("exportSource when the printer fails (CPSE-REQ-018; quality review QR-001)", () => {
  const circle = loadExample("circle");

  it("exports through the printer while it works", () => {
    expect(exportSource(circle)).toEqual({ ok: true, source: expect.stringContaining("export function CircleGraph()"), componentName: "CircleGraph" });
  });

  it("returns internal_error, not an exception, and leaks nothing of the failure", () => {
    printer.fails = true;
    try {
      const result = exportSource(circle);
      expect(result).toEqual({ ok: false, issues: [expect.objectContaining({ code: "internal_error", path: "" })] });
      expect(JSON.stringify(result)).not.toContain("secret");
    } finally {
      printer.fails = false;
    }
  });
});
