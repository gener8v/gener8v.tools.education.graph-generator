# TICKET-008: Publish the documentation site with a working example of every graph type

**Change:** graph-library
**Capability Area:** Component Packaging & Source Export (component-packaging-and-source-export)
**Specification:** specifications/component-packaging-and-source-export.md

**Summary:** Build a Storybook static site generated from `examples/*.json`, with pages for the vocabulary, issue codes, source export and the model tool, published to GitHub Pages, and validate every documented example in CI.
**Priority:** Must
**Value:** A curriculum developer or integrator can see every graph type, its inputs and a working example, and copy a description that is guaranteed to be valid.

**Requirements Covered:**
- CPSE-REQ-044: Documentation for every graph type with its inputs, a working example description and its rendered graph
- CPSE-REQ-045: Documentation of the vocabulary, issue codes, source export and model tool, each with a working example
- CPSE-REQ-046: Every documented example is validated as part of the checks

**Prior Art:**
- Read: TICKET-003 output — `src/react/Graph.tsx`, `src/graph.ts`
- Read: `graph-library/graph-specification-and-vocabulary/TICKET-005` output — `src/generated/vocabulary.json`, generated documentation tables; `src/core/issues.ts` (`issueDocs`)
- Read: `.gener8v/technical-design/system-design.md` — AD-016 (Storybook on GitHub Pages), Component "Examples and documentation"
- Read: `.gener8v/constraints/prd.md` — prd/OC-005 (static, free hosting)

**Acceptance Criteria:**
- [ ] One Storybook story per `examples/<type>.json` is generated automatically, showing the description JSON, the rendered graph and the type's input table from the generated vocabulary
- [ ] `docs/` pages cover the vocabulary (generated), issue codes (from `issueDocs`), source export (function and command, with an example) and the model tool (with short examples for Anthropic, OpenAI and Google APIs that use no provider SDK in the package)
- [ ] A CI test validates every `examples/*.json` and every JSON example embedded in `docs/` with `validate`; any invalid example fails CI (CPSE-REQ-046)
- [ ] `.github/workflows/docs.yml` builds the static site and publishes it to GitHub Pages from main; the README links it
- [ ] The site makes no runtime network requests beyond its own static files

**Output:**
- `.storybook/main.ts`, `.storybook/preview.ts`, `docs/stories/examples.stories.tsx` (generated from `examples/`)
- `docs/vocabulary.mdx`, `docs/issue-codes.mdx`, `docs/export.mdx`, `docs/model-tool.mdx`
- `.github/workflows/docs.yml`
- `tests/docs/examples-valid.test.ts` — CPSE-REQ-046

**Constraints:** prd/OC-005, prd/CC-003

**Known Hazards:**
- Model-tool examples in the docs must not add a provider SDK to `package.json` (CPSE-REQ-029); keep them as code snippets or dev-only story code.
- The site is complete only when all eleven types have examples (DEP-008, soft). Build it now and let stories appear as type tickets add examples; dependency-map OQ-004 leaves open whether completeness blocks the first release — note coverage in the delivery record.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-003-security-review/SEC-001 and SEC-002: document the input limits (per-list `maxItems`, 10,000 values per description) and the plain-text character policy (control, line-break, direction, invisible and tag characters rejected; zero-width joiners and emoji variation selectors allowed) on the vocabulary and issue-code pages.
- Carried from graph-library/graph-specification-and-vocabulary-ticket-004-security-review/SEC-005: document that `describe(input)` validates its input, and throws for an invalid one (call `validate` to learn why), and that `normalize` does the same.

**Depends On:** TICKET-003
**Blocks:** None

**Size:** Medium
