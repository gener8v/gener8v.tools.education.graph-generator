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
- **Documentation:** https://gener8v.github.io/gener8v.tools.education.graph-generator/

## Requirements

- React 18 or 19
- Node.js 22 or later for the non-rendering entry points (`./core`, `./tool`, `./export`)

The package makes no network requests and collects no data.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
