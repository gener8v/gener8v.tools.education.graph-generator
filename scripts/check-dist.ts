import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Network and loader APIs the built package must never reference (CPSE-REQ-005, prd/CC-003). */
export const NETWORK_APIS = [
  "fetch",
  "fetchLater",
  "XMLHttpRequest",
  "WebSocket",
  "WebTransport",
  "EventSource",
  "sendBeacon",
  "RTCPeerConnection",
  "importScripts",
];

/** Node.js modules that open network connections. */
export const NETWORK_MODULES = ["http", "https", "http2", "net", "tls", "dgram"];

const API_PATTERN = new RegExp(`\\b(${NETWORK_APIS.join("|")})\\b`, "g");
const MODULE_PATTERN = new RegExp(`["'\`](node:)?(${NETWORK_MODULES.join("|")})["'\`]`, "g");

/**
 * Every network API name or network module specifier found in one built file. Scanning the
 * output covers code that lint never sees, such as dependencies bundled in at build time.
 */
// @spec CPSE-REQ-005
export function scanSource(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(API_PATTERN)) found.add(match[1] ?? match[0]);
  for (const match of text.matchAll(MODULE_PATTERN)) found.add(`${match[1] ?? ""}${match[2] ?? ""}`);
  return [...found].sort();
}

function builtFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return builtFiles(path);
    return /\.(m?js|cjs)$/.test(entry.name) ? [path] : [];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = builtFiles("dist");
  if (files.length === 0) {
    console.error("dist/ has no built files; run `pnpm build` first.");
    process.exit(1);
  }
  let failed = false;
  for (const file of files) {
    const found = scanSource(readFileSync(file, "utf8"));
    if (found.length > 0) {
      console.error(`${file}: references ${found.join(", ")} (CPSE-REQ-005, prd/CC-003)`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log(`Built files scanned: ${files.length}, no network APIs or network modules.`);
}
