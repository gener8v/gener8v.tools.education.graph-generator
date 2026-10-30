import { expect } from "vitest";

/**
 * The global object's own keys and values. Reading the descriptors once first lets Node.js create
 * what its lazy globals create on a first read (undici's dispatcher symbol), so the snapshot
 * compared is a settled one.
 */
function snapshotGlobals(): Map<string | symbol, unknown> {
  return new Map(Reflect.ownKeys(globalThis).map((key) => [key, Reflect.getOwnPropertyDescriptor(globalThis, key)?.value]));
}

/**
 * Runs `render` (a server render, in a `node`-environment test) and fails if `window` or `document`
 * is defined before or after it, or if it added, removed or replaced any property of the global
 * object: a read of `navigator` or `localStorage` that sets something, say (NLC-NFR-002,
 * NLC-NFR-006; rulers NLC TICKET-004 security review SEC-001; shared by graph-library NLC
 * TICKET-005 quality review QR-006). Returns what `render` returns.
 */
export function expectNoBrowserGlobalsTouched<T>(render: () => T): T {
  expect(typeof window).toBe("undefined");
  expect(typeof document).toBe("undefined");
  snapshotGlobals();
  const before = snapshotGlobals();
  const result = render();
  const after = Reflect.ownKeys(globalThis);
  expect(after.map(String).sort()).toEqual([...before.keys()].map(String).sort());
  for (const key of after) expect(Object.is(Reflect.getOwnPropertyDescriptor(globalThis, key)?.value, before.get(key)), String(key)).toBe(true);
  expect(typeof window).toBe("undefined");
  expect(typeof document).toBe("undefined");
  return result;
}
