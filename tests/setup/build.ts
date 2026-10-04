import { execFileSync } from "node:child_process";

// Package tests import the built entry points, so build once before the run.
export default function setup(): void {
  execFileSync("pnpm", ["build"], { stdio: "inherit" });
}
