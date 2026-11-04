# @gener8v/graph-generator

Turn one JSON description of a mathematical graph or figure into a React component, for
lessons, worksheets and assessments.

> **Status: early development (`0.x`).** The description format may change between minor
> versions until `1.0.0`. Nothing is published to npm yet.

Planned graph types: number lines, x,y and x,y,z coordinate graphs, line graphs, bar graphs,
pictographs, circles, squares, triangles, cubes and cylinders. Every graph is described by the
same kind of JSON object, can be rendered as a React component or exported as a standalone
component file, and can be offered to a language model as a tool.

- **Source:** https://github.com/gener8v/gener8v.tools.education.graph-generator
- **Issues:** https://github.com/gener8v/gener8v.tools.education.graph-generator/issues
- **Documentation:** https://gener8v.github.io/gener8v.tools.education.graph-generator/ (the site goes live once GitHub Pages is enabled for the repository; until then this link shows a 404 page)

## Requirements

- React 18 or 19
- Node.js 22 or later for the non-rendering entry points (`./core`, `./tool`, `./export`)

The package makes no network requests and collects no data.

## Command line

`graph-generator export` turns a saved description into a component file, from a terminal or a
build script. It needs Node.js 22 or later, not React, and makes no network requests.

Install the package, then run its `graph-generator` command with `npx`. Write the package name
in every command: it runs the installed package's `graph-generator` bin, while the bare short name
can run a different package from the registry.

```sh
npm install --save-dev @gener8v/graph-generator
npx @gener8v/graph-generator export description.json                 # writes CircleGraph.tsx beside it
npx @gener8v/graph-generator export description.json --out src/Figure.tsx --name Figure
```

- `--out <file.tsx>` sets the output file. By default it is `<Name>.tsx` next to the description.
  It cannot be the description file itself. Without `--out`, a name that Windows reserves for a
  device (such as `CON` or `NUL`) is refused.
- `--name <Name>` sets the component's name, a PascalCase identifier. By default it is the graph
  type's, such as `CircleGraph`.
- An existing output file is replaced. The file is written to a temporary file beside it and
  renamed, so a link at the output path is replaced, not followed.
- The description must be a regular file of at most 3 MiB (3,145,728 bytes); the largest valid
  description is about 1.6 MB. A larger file, a directory or a pipe is refused.
- It prints at most the first 20 issues of an invalid description, then how many more there are,
  and writes no file.
- Exit status: 0 the file is written; 1 the description is not valid, or a file cannot be read or
  written; 2 the command line is not valid, or the output is the description file.

The file is the same text `exportSource` from `./export` returns.

## Styling

Graphs are inline SVG and take their look from the package, not from your page. One page style
can change what a graph shows: a pictograph draws a value that is not a whole number of pictures
as a cut-off picture, a nested `<svg>` that relies on the browser's default `overflow: hidden`.
Do not apply `overflow: visible` to every `svg` on the page. Scope such a rule away from the graphs
(for example `svg:not(.your-icon-class)`), or a value of 2.5 pictures is drawn as 3.

A ruler also needs a minimum shown width. It keeps 3:1 contrast for its finest marks (WCAG 1.4.11)
when shown at least about 130 px wide, whatever its length, and a centimetre ruler longer than
about 12 cm at least about 11 px wide per centimetre: about 330 px for a 30 cm ruler and 164 px
for a 15 cm one. A 12 in ruler marked to sixteenths keeps it down to about 210 px.
Narrower than that, the finest marks render lighter than 3:1 against white. This applies to
`<Graph>`, the per-type components and `createGraph` with your own printer. The figures are
arithmetic, not a browser measurement, so treat them as a floor to stay above, not a guarantee.
Show the ruler at least that wide: on a phone or in a two-column worksheet, give it the full width
of the screen or page rather than a column, or use a shorter ruler.

## Model tool

`./tool` lets a language model draw graphs. `graphTool` is a tool definition in no provider's
format: a `name` (`generate_graph`), a plain-English `description` and an `inputSchema` (JSON
Schema). The model sends `{ "graph": <description> }`, with `null` for each value it does not set.
`handleGraphToolCall(input)` takes the call's input as an object or as JSON text, and never throws.
It returns one of these:

- `{ ok: true, description, provenance, textAlternative, summary }`: pass `description` to
  `<Graph>` or `exportSource`.
- `{ ok: false, issues, summary }`: `issues` holds every problem, with paths into the input such as
  `/graph/radius`.

Return `summary` to the model as the tool's result. It is plain text. On success, it gives the graph
type and the text alternative. On failure, it lists the first 20 issues, numbered, with path and
message, then how many more there are. `issues` is complete and can be megabytes: return `summary`,
not `issues` or the whole result, to the model.

`summary`, `textAlternative` and the text values of `description` hold text the model wrote,
unchanged apart from removed control characters. Escape them for HTML or Markdown and never insert
them as markup. A model can be steered into writing instructions there, so treat them as data, not
instructions.

An `internal_error` issue means a defect in the package. Report it with the package version and the
input that caused it.

The package calls no model, makes no network request and
depends on no provider's software. The snippets below use each provider's own SDK, which you
install.

Anthropic, Messages API (`@anthropic-ai/sdk`):

```ts
const response = await client.messages.create({
  model, // your model
  max_tokens: 16000,
  tools: [{ name: graphTool.name, description: graphTool.description, input_schema: structuredClone(graphTool.inputSchema) }],
  messages,
});
for (const block of response.content) {
  if (block.type !== "tool_use" || block.name !== graphTool.name) continue;
  const result = handleGraphToolCall(block.input);
  // Send back: { type: "tool_result", tool_use_id: block.id, content: result.summary, is_error: !result.ok }
}
```

OpenAI, Responses API, strict mode (`openai`):

```ts
const response = await client.responses.create({
  model, // your model
  input,
  tools: [{ type: "function", name: graphTool.name, description: graphTool.description, parameters: structuredClone(graphTool.inputSchema), strict: true }],
});
for (const item of response.output) {
  if (item.type !== "function_call" || item.name !== graphTool.name) continue;
  const result = handleGraphToolCall(item.arguments); // JSON text
  // Send back: { type: "function_call_output", call_id: item.call_id, output: result.summary }
}
```

Google Gemini API (`@google/genai`), with `parametersJsonSchema`:

```ts
const response = await ai.models.generateContent({
  model, // your model
  contents,
  config: {
    tools: [{ functionDeclarations: [{ name: graphTool.name, description: graphTool.description, parametersJsonSchema: structuredClone(graphTool.inputSchema) }] }],
  },
});
for (const call of response.functionCalls ?? []) {
  if (call.name !== graphTool.name) continue;
  const result = handleGraphToolCall(call.args);
  // Send back a functionResponse part: { name: call.name, response: { result: result.summary } }
}
```

`inputSchema` is frozen. `structuredClone` gives an SDK whose types expect a mutable object its own
copy.

**Supported modes.** The schema is checked against each provider's documented rules, as they stood
on 2026-11-04:

- Anthropic `input_schema` without `strict`.
- OpenAI function calling with `strict: true`, in Chat Completions and Responses.
- Gemini API `parametersJsonSchema`.

**Not supported:**

- Anthropic `strict: true`. Its subset rejects `maxLength`, `minimum`, `maximum` and `maxItems`,
  and allows at most 16 parameters with a union type. This schema has about 140.
- Gemini `parameters`, and Vertex AI function declarations. They take an OpenAPI subset that has
  `nullable` in place of type arrays and has no `additionalProperties`.

Some keywords are not documented for a supported mode, such as `maxLength` for OpenAI strict mode.
Whatever the provider enforces, the handler validates every call.

**Limits.**

- JSON text longer than `TOOL_INPUT_LIMIT` (2,000,000 characters, counted as UTF-16 code units) is
  refused as `too_large` and is not parsed. The largest valid description, sent with every optional
  value as `null`, is about 876,000 characters as compact JSON and about 1,019,000 when indented by
  two spaces. Text that writes every non-ASCII character as a `\u` escape can be several times
  longer, so it can go past the limit.
- An input object can hold at most 10,000 keys, the same as the values one description can hold.
- `textAlternative`, and the text alternative in `summary`, stop after `TEXT_ALTERNATIVE_LIMIT`
  (4,000) characters and end in "…". The largest graphs state more than 500,000 characters. To get
  the full text, call `describe(description)` from `./core`.
- Text that is not JSON gets an `invalid_json` issue, and the handler does not look for JSON in it.
  This includes JSON inside prose or a code fence.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
