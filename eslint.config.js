import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const NETWORK_MESSAGE =
  "The package makes no network requests and collects no data (CPSE-REQ-005, prd/CC-003).";
const BOUNDARY_MESSAGE =
  "Non-rendering code must not load React or browser globals (AD-001, prd/TC-005).";
const CYCLE_MESSAGE =
  "Graph-type definitions import helpers from src/core/format.ts, never src/core/describe.ts, which imports the registry (import cycle; GSV TICKET-001 quality review QR-001).";

const RENDER_MESSAGE =
  "Rendering code must give the same output on the server and in the browser, so it may not read browser globals (CPSE-REQ-011, prd/TC-001).";

const PURE_MESSAGE =
  "Components are pure: no hooks, state, context, event handlers or client boundary, so they work as React Server Components (AD-014, prd/IC-002).";

const SCRIPT_EXTENSIONS = "{ts,tsx,mts,cts,js,jsx,mjs,cjs}";
const NON_RENDERING_DIRS = ["core", "tool", "export", "layout", "images"];

// Network APIs, reached directly or through any object (`self.fetch`, `globalThis["WebSocket"]`).
const NETWORK_NAMES =
  "fetch|fetchLater|XMLHttpRequest|WebSocket|WebTransport|EventSource|sendBeacon|RTCPeerConnection|importScripts";
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

const boundaryImportOptions = {
  paths: [
    { name: "react", message: BOUNDARY_MESSAGE },
    { name: "react-dom", message: BOUNDARY_MESSAGE },
    ...networkImportPaths,
  ],
  patterns: [{ group: ["react/*", "react-dom/*"], message: BOUNDARY_MESSAGE }],
};

const browserGlobals = (message) =>
  ["window", "document", "navigator", "self"].map((name) => ({ name, message }));
const browserGlobalSyntax = (message) => ({
  selector: "MemberExpression[object.name=/^(globalThis|self)$/][property.name=/^(window|document|navigator)$/]",
  message,
});

// What a Server Component cannot hold (prd/IC-002): hooks, reached by name (`useState`) or through
// an object (`React.useState`); class components, which carry state; context; event handlers; and
// the "use client" directive (code review CR-004 on CPSE TICKET-003).
const HOOK = "use(?:[A-Z].*)?";
const HOOK_PATTERN = `^${HOOK}$`;
const STATEFUL_REACT_PATTERN = `^(${HOOK}|Component|PureComponent|createContext)$`;
const pureImportOptions = {
  paths: networkImportPaths,
  patterns: [{ group: ["react", "react-dom", "react-dom/*"], importNamePattern: STATEFUL_REACT_PATTERN, message: PURE_MESSAGE }],
};
const pureSyntax = [
  { selector: `CallExpression[callee.property.name=/${HOOK_PATTERN}/]`, message: PURE_MESSAGE },
  { selector: "CallExpression[callee.property.name='createContext']", message: PURE_MESSAGE },
  { selector: ":matches(ClassDeclaration, ClassExpression)[superClass.property.name=/^(Pure)?Component$/]", message: PURE_MESSAGE },
  { selector: "JSXAttribute[name.name=/^on[A-Z]/]", message: PURE_MESSAGE },
  // Handler keys written as names (`onClick`) or strings (`"onClick"`), as the network rules do.
  { selector: "CallExpression[callee.name='createElement'] > ObjectExpression > Property[key.name=/^on[A-Z]/]", message: PURE_MESSAGE },
  { selector: "CallExpression[callee.name='createElement'] > ObjectExpression > Property[key.value=/^on[A-Z]/]", message: PURE_MESSAGE },
  { selector: "ExpressionStatement[directive='use client']", message: PURE_MESSAGE },
];

const boundarySyntax = [
  { selector: `ImportExpression[source.value=/${REACT_PATTERN}/]`, message: BOUNDARY_MESSAGE },
  {
    selector: `CallExpression[callee.name='require'][arguments.0.value=/${REACT_PATTERN}/]`,
    message: BOUNDARY_MESSAGE,
  },
  browserGlobalSyntax(BOUNDARY_MESSAGE),
];

export default defineConfig(
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
      "no-restricted-imports": ["error", boundaryImportOptions],
      "no-restricted-globals": [
        "error",
        ...networkGlobals,
        ...browserGlobals(BOUNDARY_MESSAGE),
      ],
      "no-restricted-syntax": ["error", ...networkSyntax, ...boundarySyntax],
    },
  },
  {
    // React is allowed here, browser globals are not: the type checker no longer catches them,
    // because @types/jsdom brings the DOM library into the program (quality review QR-003).
    // Hooks, class components, context, event handlers and "use client" are rejected too, so the
    // components stay usable as Server Components (AD-014, prd/IC-002).
    // Repeats the network restrictions, which this block's rule options replace.
    // @spec CPSE-REQ-011
    files: [`src/react/**/*.${SCRIPT_EXTENSIONS}`],
    rules: {
      "no-restricted-globals": ["error", ...networkGlobals, ...browserGlobals(RENDER_MESSAGE)],
      "no-restricted-imports": ["error", pureImportOptions],
      "no-restricted-syntax": ["error", ...networkSyntax, browserGlobalSyntax(RENDER_MESSAGE), ...pureSyntax],
    },
  },
  {
    // Repeats the boundary import options, which this block's rule options replace.
    files: [`src/core/definitions/**/*.${SCRIPT_EXTENSIONS}`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          ...boundaryImportOptions,
          patterns: [
            ...boundaryImportOptions.patterns,
            { group: ["**/describe", "**/describe.*"], message: CYCLE_MESSAGE },
          ],
        },
      ],
    },
  },
);
