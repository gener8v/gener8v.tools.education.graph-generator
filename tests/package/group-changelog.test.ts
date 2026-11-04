import { describe, expect, it } from "vitest";
import { groupNewestSection } from "../../scripts/group-changelog";

const older = `## 0.1.0

### Minor Changes

- **Fixed:** an older fix
- **Added:** an older addition

### Patch Changes

- **Added:** another older addition
`;

const newest = `## 0.2.0

### Minor Changes

- **Fixed:** first fix
- **Changed:** first change
  with a second line

  and a second paragraph
- **Added:** first addition

### Patch Changes

- **Removed:** the only removal
- **Added:** second addition
- **Deprecated:** the only deprecation
- **Fixed:** second fix
`;

const changelog = `# @gener8v/graph-generator

${newest}
${older}`;

// @spec CPSE-REQ-041
describe("groupNewestSection (CPSE-REQ-041, CPSE TICKET-001 CR-003)", () => {
  it("groups the newest release by category in the fixed order, entries in their original order", () => {
    const grouped = groupNewestSection(changelog);
    expect(grouped).toBe(`# @gener8v/graph-generator

## 0.2.0

### Added

- **Added:** first addition
- **Added:** second addition

### Changed

- **Changed:** first change
  with a second line

  and a second paragraph

### Deprecated

- **Deprecated:** the only deprecation

### Removed

- **Removed:** the only removal

### Fixed

- **Fixed:** first fix
- **Fixed:** second fix

${older}`);
    expect([...grouped.matchAll(/^### (\w+)$/gm)].map((m) => m[1])).toEqual(["Added", "Changed", "Deprecated", "Removed", "Fixed"]);
  });

  it("leaves older releases byte-identical, including their bump headings", () => {
    expect(groupNewestSection(changelog).endsWith(`\n${older}`)).toBe(true);
  });

  it("omits empty groups", () => {
    const grouped = groupNewestSection("# Name\n\n## 1.0.0\n\n### Patch Changes\n\n- **Fixed:** one\n");
    expect(grouped).toBe("# Name\n\n## 1.0.0\n\n### Fixed\n\n- **Fixed:** one\n");
  });

  it("is idempotent", () => {
    const once = groupNewestSection(changelog);
    expect(groupNewestSection(once)).toBe(once);
  });

  it("changes nothing when there is no release yet", () => {
    expect(groupNewestSection("# Name\n")).toBe("# Name\n");
  });

  it("refuses an entry without a category rather than losing or misfiling it", () => {
    expect(() => groupNewestSection("## 1.0.0\n\n- no category\n")).toThrow(/no category/);
  });
});
