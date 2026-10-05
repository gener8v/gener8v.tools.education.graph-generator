import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const NETWORK_MESSAGE =
  "The package makes no network requests and collects no data (CPSE-REQ-005, prd/CC-003).";
const BOUNDARY_MESSAGE =
  "Non-rendering code must not load React or browser globals (AD-001, prd/TC-005).";

const SCRIPT_EXTENSIONS = "{ts,tsx,mts,cts,js,jsx,mjs,cjs}";
const NON_RENDERING_DIRS = ["core", "tool", "export", "layout"];

// Network APIs, reached directly or through any object (`self.fetch`, `globalThis["WebSocket"]`).
const NETWORK_NAMES = "fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon";
// Node.js modules that open network connections.
const NETWORK_MODULES = ["http", "https", "http2", "net", "tls", "dgram"];
const NETWORK_MODULE_PATTERN = `^(node:)?(${NETWORK_MODULES.join("|")})$`;
// Written for esquery selectors, where a `/` inside a regex must be escaped.
const REACT_PATTERN = "^react(-dom)?($|\\/)";

const networkGlobals = NETWORK_NAMES.split("|")
  .filter((name) => name !== "sendBeacon")
  .map((name) => ({ name, message: NETWORK_MESSAGE }));

const networkSyntax = [
  { selector: `MemberExpression[property.name=/^(${NETWORK_NAMES})$/]`, message: NETWORK_MESSAGE },
  { selector: `MemberExpression[property.value=/^(${NETWORK_NAMES})$/]`, message: NETWORK_MESSAGE },
  { selector: `ImportExpression[source.value=/${NETWORK_MODULE_PATTERN}/]`, message: NETWORK_MESSAGE },
  {
    selector: `CallExpression[callee.name='require'][arguments.0.value=/${NETWORK_MODULE_PATTERN}/]`,
    message: NETWORK_MESSAGE,
  },
];

const networkImportPaths = NETWORK_MODULES.flatMap((name) => [
  { name, message: NETWORK_MESSAGE },
  { name: `node:${name}`, message: NETWORK_MESSAGE },
]);

const boundarySyntax = [
  { selector: `ImportExpression[source.value=/${REACT_PATTERN}/]`, message: BOUNDARY_MESSAGE },
  {
    selector: `CallExpression[callee.name='require'][arguments.0.value=/${REACT_PATTERN}/]`,
    message: BOUNDARY_MESSAGE,
  },
  {
    selector: "MemberExpression[object.name=/^(globalThis|self)$/][property.name=/^(window|document|navigator)$/]",
    message: BOUNDARY_MESSAGE,
  },
];

export default tseslint.config(
  { ignores: ["dist/", "coverage/", "storybook-static/", "node_modules/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // @spec CPSE-REQ-005
    files: [`src/**/*.${SCRIPT_EXTENSIONS}`],
    rules: {
      "no-restricted-globals": ["error", ...networkGlobals],
      "no-restricted-imports": ["error", { paths: networkImportPaths }],
      "no-restricted-syntax": ["error", ...networkSyntax],
    },
  },
  {
    // Flat config replaces a rule's options per block, so this block repeats the network
    // restrictions alongside the boundary ones.
    // @spec CPSE-REQ-005, CPSE-REQ-006
    files: NON_RENDERING_DIRS.map((dir) => `src/${dir}/**/*.${SCRIPT_EXTENSIONS}`),
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: BOUNDARY_MESSAGE },
            { name: "react-dom", message: BOUNDARY_MESSAGE },
            ...networkImportPaths,
          ],
          patterns: [{ group: ["react/*", "react-dom/*"], message: BOUNDARY_MESSAGE }],
        },
      ],
      "no-restricted-globals": [
        "error",
        ...networkGlobals,
        { name: "window", message: BOUNDARY_MESSAGE },
        { name: "document", message: BOUNDARY_MESSAGE },
        { name: "navigator", message: BOUNDARY_MESSAGE },
        { name: "self", message: BOUNDARY_MESSAGE },
      ],
      "no-restricted-syntax": ["error", ...networkSyntax, ...boundarySyntax],
    },
  },
);
