import ts from "typescript";
import { describe, expect, it } from "vitest";
import { storiesFile, storyIdentifiers } from "../../scripts/generated-files";

// Quality review QR-005 on graph-library CPSE TICKET-008: the stories file is generated from the
// names of examples/*.json, so a name that is a reserved word, starts with a digit or is a name the
// file uses itself must still give a file that compiles, and two names must not give one story.

// @spec CPSE-REQ-044
describe("the names in the generated stories file", () => {
  it("keeps the story named after the example", () => {
    expect(storyIdentifiers("circle")).toEqual({ description: "exampleCircle", story: "Circle" });
    expect(storyIdentifiers("bar-graph")).toEqual({ description: "exampleBarGraph", story: "BarGraph" });
    expect(storyIdentifiers("triangle-asa")).toEqual({ description: "exampleTriangleAsa", story: "TriangleAsa" });
  });

  it("makes a reserved word, a leading digit and the file's own names safe", () => {
    expect(storyIdentifiers("class")).toEqual({ description: "exampleClass", story: "Class" });
    expect(storyIdentifiers("default")).toEqual({ description: "exampleDefault", story: "Default" });
    expect(storyIdentifiers("3d-cube")).toEqual({ description: "example3dCube", story: "Example3dCube" });
    expect(storyIdentifiers("meta")).toEqual({ description: "exampleMeta", story: "ExampleMeta" });
    expect(storyIdentifiers("story-obj")).toEqual({ description: "exampleStoryObj", story: "ExampleStoryObj" });
    expect(storyIdentifiers("example-page")).toEqual({ description: "exampleExamplePage", story: "ExampleExamplePage" });
  });

  it("refuses a name that is not lower-case words joined by hyphens", () => {
    for (const name of ["", "Circle", "a_b", "a--b", "-a", "a-", "a b", "a.b", "../x"]) {
      expect(() => storyIdentifiers(name), name).toThrow("lower-case words joined by hyphens");
    }
  });

  it("refuses two names that give one story", () => {
    expect(() => storiesFile(["a-1", "a1"])).toThrow("both become the story A1");
  });

  it("gives a file that compiles for such names, with the file name bound in render and not an arg", () => {
    const names = ["class", "default", "3d-cube", "meta", "story", "example-page", "a-1", "circle"];
    const source = storiesFile(names);
    const output = ts.transpileModule(source, {
      reportDiagnostics: true,
      fileName: "examples.stories.tsx",
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: true, isolatedModules: true },
    });
    expect((output.diagnostics ?? []).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))).toEqual([]);
    for (const name of names) {
      const { description, story } = storyIdentifiers(name);
      expect(source).toContain(`import ${description} from "../../examples/${name}.json";`);
      expect(source).toContain(`export const ${story}: Story = {`);
      expect(source).toContain(`render: (args) => <ExamplePage {...args} file="${name}.json" />,`);
    }
    expect(source).not.toMatch(/args: \{[^}]*file/);
  });
});
