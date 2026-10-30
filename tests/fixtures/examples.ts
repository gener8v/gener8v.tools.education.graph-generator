import { readFileSync } from "node:fs";

/** The shipped example description of a graph type, `examples/<type>.json`, read fresh and parsed. */
export const loadExample = (type: string): unknown => JSON.parse(readFileSync(new URL(`../../examples/${type}.json`, import.meta.url), "utf8"));
