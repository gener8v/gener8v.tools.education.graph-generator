import type { Preview } from "@storybook/react-vite";

// The site's page order: how to use the components first, then the examples, then the reference pages.
const preview: Preview = {
  parameters: {
    layout: "padded",
    options: {
      storySort: { order: ["Components", "Graph types", "Vocabulary", "Issue codes", "Source export", "Model tool"] },
    },
  },
};

export default preview;
