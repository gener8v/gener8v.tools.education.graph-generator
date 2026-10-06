import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

// Package tests import the built entry points, so build once before the run. CI builds in an
// earlier step and sets GRAPH_GENERATOR_PREBUILT=1 to skip the second build.
export default function setup(): void {
  if (process.env.GRAPH_GENERATOR_PREBUILT === "1" && existsSync("dist/index.js")) return;
  execFileSync("pnpm", ["build"], { stdio: "inherit" });
}
