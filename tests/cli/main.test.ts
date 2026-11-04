import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createIssue, formatIssue } from "../../src/core/issues";

// `main` run in this process, with `exportSource` made to throw, so the catch-all is seen on its
// own: the built command's other tests cannot make a package defect happen (GSV CPSE TICKET-006
// code review CR-002, quality review QR-001).
vi.mock("../../src/export/exportSource", () => ({
  exportSource: () => {
    throw Object.assign(new Error("failed at file:///secret/key.json"), { stack: "Error: failed at file:///secret/key.json\n    at run (/node_modules/x/index.js:1:1)" });
  },
}));

const { main } = await import("../../src/cli");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("main (CPSE-REQ-026)", () => {
  it("prints internal_error's fixed message for an unexpected exception, never the exception's", () => {
    const dir = mkdtempSync(join(tmpdir(), "graph-generator-main-"));
    try {
      const file = join(dir, "description.json");
      writeFileSync(file, JSON.stringify({ type: "circle", radius: 5 }));
      const written: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
        written.push(String(chunk));
        return true;
      });
      expect(main(["export", file])).toBe(1);
      const stderr = written.join("");
      expect(stderr).toBe(`${formatIssue(createIssue("internal_error", "", {}))}\n`);
      expect(stderr).not.toMatch(/file:\/\/\/secret|\/node_modules\/x| {4}at /);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not run the command when imported: the exit status stays unset", () => {
    expect(process.exitCode).toBeUndefined();
  });
});
