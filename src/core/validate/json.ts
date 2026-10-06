// Reading a caller's value as plain JSON data (GSV-REQ-005), without trusting it. Values built
// in JavaScript can hold what JSON never produces: getters, hidden (non-enumerable) properties,
// holes in lists, proxies that throw. Every read here goes through own data-property
// descriptors, so no getter ever runs and each value is read exactly once.

/**
 * Whether a value is a JSON object: not a list, and made by an object literal, `JSON.parse`
 * (in any realm, such as an iframe or a `vm` context) or `Object.create(null)`. Never throws.
 */
// @spec GSV-REQ-005
export function isPlainObject(value: unknown): value is object {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype: unknown = Object.getPrototypeOf(value);
    // Another realm's Object.prototype is also the end of its chain.
    return prototype === null || Object.getPrototypeOf(prototype) === null;
  } catch {
    // A revoked Proxy throws on Array.isArray.
    return false;
  }
}

/** The own properties of an object: plain values by key, and the keys that are not plain data. */
export interface ObjectContents {
  values: ReadonlyMap<string, unknown>;
  /** Keys whose property is a getter or setter, or is hidden (not enumerable). */
  opaque: readonly string[];
}

/** An object's own string-keyed properties, or `undefined` when they cannot be read. */
// @spec GSV-REQ-005
export function readObject(object: object): ObjectContents | undefined {
  try {
    const values = new Map<string, unknown>();
    const opaque: string[] = [];
    for (const key of Object.getOwnPropertyNames(object)) {
      const descriptor = Object.getOwnPropertyDescriptor(object, key);
      if (descriptor === undefined) continue;
      if (!descriptor.enumerable || !("value" in descriptor)) opaque.push(key);
      else values.set(key, descriptor.value);
    }
    return { values, opaque };
  } catch {
    return undefined;
  }
}

/**
 * The elements of a plain list: every position holds a plain data value, and nothing else is
 * attached. `undefined` for anything else, including holes, extra keys and getters. A huge
 * sparse list fails on its key count before any position is visited.
 */
// @spec GSV-REQ-005
export function readList(list: readonly unknown[]): unknown[] | undefined {
  try {
    const length = list.length;
    // Own names are the indices plus "length".
    if (Object.getOwnPropertyNames(list).length !== length + 1) return undefined;
    const elements: unknown[] = [];
    for (let index = 0; index < length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(list, index);
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) return undefined;
      elements.push(descriptor.value);
    }
    return elements;
  } catch {
    return undefined;
  }
}
