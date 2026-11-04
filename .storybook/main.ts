import { defineMain } from "@storybook/react-vite/node";

// The documentation site (AD-016; graph-library CPSE TICKET-008): the pages in docs/ and one story
// per example, generated from examples/ by scripts/generate.ts. `pnpm docs:build` writes it to
// storybook-static/, a static site that requests nothing outside its own files (prd/CC-003).
// @spec CPSE-REQ-044, CPSE-REQ-045
export default defineMain({
  framework: "@storybook/react-vite",
  stories: ["../docs/**/*.mdx", "../docs/stories/*.stories.tsx"],
  addons: ["@storybook/addon-docs"],
  // What is off here: telemetry (`disableTelemetry`; the `--disable-telemetry` flag of `pnpm docs` and
  // `pnpm docs:build` also stops the crash report sent when this file fails to load), the "what's
  // new" notification (`disableWhatsNewNotifications`) and the built site's `project.json`
  // (`disableProjectJson`, tool versions the site does not need). What is not: the dev server still
  // fetches the "what's new" data from storybook.js.org on each load, which Storybook 10.6.5 has no
  // setting to stop; `pnpm docs` passes `--no-version-updates`, which stops its daily version check.
  // The built site requests nothing outside its own files (tests/e2e/docs-network.spec.ts).
  core: { disableTelemetry: true, disableWhatsNewNotifications: true, disableProjectJson: true },
});
