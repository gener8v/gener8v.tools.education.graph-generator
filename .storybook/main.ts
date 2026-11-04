import { defineMain } from "@storybook/react-vite/node";

// The documentation site (AD-016; graph-library CPSE TICKET-008): the pages in docs/ and one story
// per example, generated from examples/ by scripts/generate.ts. `pnpm docs:build` writes it to
// storybook-static/, a static site that requests nothing outside its own files (prd/CC-003,
// tests/e2e/docs-network.spec.ts).
// @spec CPSE-REQ-044, CPSE-REQ-045
export default defineMain({
  framework: "@storybook/react-vite",
  stories: ["../docs/**/*.mdx", "../docs/stories/*.stories.tsx"],
  addons: ["@storybook/addon-docs"],
  // No telemetry, and no "what's new" check against storybook.js.org.
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
});
