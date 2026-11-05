# @gener8v/graph-generator

Turn one JSON description of a math graph or figure into a React component, for lessons,
worksheets and assessments.

> **Status: `0.x`.** The description format can change between minor versions until `1.0.0`.

Graph types: number lines, rulers, x,y and x,y,z coordinate graphs, line graphs, bar graphs,
pictographs, circles, squares, triangles, cubes and cylinders. Every type uses the same kind of
JSON description. You can render it as a React component, export it as a standalone component
file, or give it to a language model as a tool.

- **Source:** https://github.com/gener8v/gener8v.tools.education.graph-generator
- **Issues:** https://github.com/gener8v/gener8v.tools.education.graph-generator/issues
- **Documentation:** https://gener8v.github.io/gener8v.tools.education.graph-generator/

## Install

```sh
npm install @gener8v/graph-generator
```

You need React 18 or 19. The entry points that do not render (`./core`, `./tool`, `./export`)
need Node.js 22 or later and no React.

The package makes no network requests and collects no data.

## Command line

`graph-generator export` writes a saved description out as a component file. It needs Node.js 22
or later, not React, and makes no network requests.

Always run it with the full package name. The bare command name can run a different
package from the registry.

```sh
npm install --save-dev @gener8v/graph-generator
npx @gener8v/graph-generator export description.json                 # writes CircleGraph.tsx beside it
npx @gener8v/graph-generator export description.json --out src/Figure.tsx --name Figure
```

- `--out <file.tsx>` sets the output file. The default is `<Name>.tsx` next to the description.
  It cannot be the description file. Without `--out`, Windows device names such as `CON` or `NUL`
  are refused.
- `--name <Name>` sets the component name, a PascalCase identifier. The default comes from the
  graph type, such as `CircleGraph`.
- An existing output file is replaced. The command writes a temporary file and renames it, so a
  link at the output path is replaced, not followed.
- The description must be a regular file of at most 3 MiB (3,145,728 bytes). The largest valid
  description is about 1.6 MB. Larger files, directories and pipes are refused.
- For an invalid description it prints the first 20 issues and a count of the rest, and writes
  nothing.
- Exit status: 0 when the file is written. 1 when the description is invalid or a file cannot be
  read or written. 2 when the command line is invalid or the output is the description file.

The output is the same text that `exportSource` from `./export` returns.

## Styling

Graphs are inline SVG and take their look from the package, not from your page. One page rule can
still change what a graph shows. A pictograph draws a fraction of a picture with a nested `<svg>` that relies on the
browser default `overflow: hidden`. If you set `overflow: visible` on every `svg`, a value of 2.5
pictures shows as 3. Scope that rule away from the graphs, for example with
`svg:not(.your-icon-class)`.

Rulers need a minimum width. A ruler keeps 3:1 contrast for its finest marks (WCAG 1.4.11) when
shown at least about 130 px wide, whatever its length. A centimetre ruler longer than about 12 cm
needs at least about 11 px per centimetre: about 330 px for a 30 cm ruler and 164 px for a 15 cm
one. A 12 in ruler marked to sixteenths needs about 210 px. Below that, the finest marks are
lighter than 3:1 against white. This applies to `<Graph>`, the per-type components and
`createGraph` with your own printer. The figures come from arithmetic, not a browser measurement.
Treat them as a floor, not a guarantee.

On a phone or in a two-column worksheet, give a ruler the full width of the screen or page, or use
a shorter ruler.

## Model tool

`./tool` lets a language model draw graphs. `graphTool` is a provider-neutral tool definition: a
`name` (`generate_graph`), a plain-English `description` and an `inputSchema` (JSON Schema). The
model sends `{ "graph": <description> }`, with `null` for each value it leaves out.

`handleGraphToolCall(input)` takes the call's input as an object or as JSON text. It never throws,
and returns one of these:

- `{ ok: true, description, provenance, textAlternative, summary }`. Pass `description` to
  `<Graph>` or `exportSource`.
- `{ ok: false, issues, summary }`. `issues` lists every problem, with paths into the input such
  as `/graph/radius`.

Send `summary` back to the model as the tool result. It is plain text. On success it gives the
graph type and the text alternative. On failure it lists the first 20 issues, numbered, with path
and message, and a count of the rest. Do not send `issues` or the whole result. `issues` is
complete and can run to megabytes.

`summary`, `textAlternative` and the text values in `description` contain text the model wrote.
The only change is that control characters are removed. Escape this text for HTML or Markdown,
never insert it as markup, and treat it as data, not instructions.

An `internal_error` issue is a bug in the package. Please report it with the package version and
the input.

The package calls no model, makes no network requests and does not depend on any provider's
software. The snippets below use each provider's own SDK, which you install yourself.

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

`inputSchema` is frozen. Pass `structuredClone(graphTool.inputSchema)` to SDKs whose types expect
a mutable object.

**Supported modes.** The schema is tested against each provider's documented rules as of
2026-11-04:

- Anthropic `input_schema` without `strict`.
- OpenAI function calling with `strict: true`, in Chat Completions and Responses.
- Gemini API `parametersJsonSchema`.

**Not supported:**

- Anthropic `strict: true`. Its subset rejects `maxLength`, `minimum`, `maximum` and `maxItems`,
  and allows at most 16 parameters with a union type. This schema has about 140.
- Gemini `parameters`, and Vertex AI function declarations. They use an OpenAPI subset with
  `nullable` instead of type arrays and no `additionalProperties`.

Some keywords, such as `maxLength` in OpenAI strict mode, are not documented for a supported mode.
The handler validates every call either way.

**Limits.**

- JSON text longer than `TOOL_INPUT_LIMIT` (2,000,000 characters, counted as UTF-16 code units) is
  refused as `too_large` without being parsed. The largest valid description, with every optional
  value sent as `null`, is about 876,000 characters as compact JSON and about 1,019,000 with
  two-space indentation. Text that escapes every non-ASCII character as `\u` can be several times
  longer and go over the limit.
- An input object can hold at most 10,000 keys, the same limit as for values in a description.
- `textAlternative`, and the text alternative in `summary`, stop after `TEXT_ALTERNATIVE_LIMIT`
  (4,000) characters and end in "…". The largest graphs need more than 500,000 characters. For the
  full text, call `describe(description)` from `./core`.
- Text that is not JSON gets an `invalid_json` issue. The handler does not search it for JSON, so
  JSON inside prose or a code fence is rejected.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
