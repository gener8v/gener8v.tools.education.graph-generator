import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const NETWORK_MESSAGE =
  "The package makes no network requests and collects no data (CPSE-REQ-005, prd/CC-003).";
const BOUNDARY_MESSAGE =
  "Non-rendering code must not load React or browser globals (AD-001, prd/TC-005).";

export default tseslint.config(
  { ignores: ["dist/", "coverage/", "storybook-static/", "node_modules/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // @spec CPSE-REQ-005
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: NETWORK_MESSAGE },
        { name: "XMLHttpRequest", message: NETWORK_MESSAGE },
        { name: "WebSocket", message: NETWORK_MESSAGE },
        { name: "EventSource", message: NETWORK_MESSAGE },
      ],
      "no-restricted-properties": [
        "error",
        { object: "navigator", property: "sendBeacon", message: NETWORK_MESSAGE },
        { object: "globalThis", property: "fetch", message: NETWORK_MESSAGE },
        { object: "window", property: "fetch", message: NETWORK_MESSAGE },
      ],
    },
  },
  {
    // @spec CPSE-REQ-006
    files: ["src/core/**/*.ts", "src/tool/**/*.ts", "src/export/**/*.ts", "src/layout/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: BOUNDARY_MESSAGE },
            { name: "react-dom", message: BOUNDARY_MESSAGE },
          ],
          patterns: [{ group: ["react/*", "react-dom/*"], message: BOUNDARY_MESSAGE }],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: NETWORK_MESSAGE },
        { name: "XMLHttpRequest", message: NETWORK_MESSAGE },
        { name: "WebSocket", message: NETWORK_MESSAGE },
        { name: "EventSource", message: NETWORK_MESSAGE },
        { name: "window", message: BOUNDARY_MESSAGE },
        { name: "document", message: BOUNDARY_MESSAGE },
        { name: "navigator", message: BOUNDARY_MESSAGE },
      ],
    },
  },
);
