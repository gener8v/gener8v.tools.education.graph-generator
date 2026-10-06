import Ajv2020 from "ajv/dist/2020";

/**
 * The JSON Schema 2020-12 validator the schema tests share. `strictRequired` is an Ajv lint, not a
 * JSON Schema rule: a derivation group's `anyOf: [{ required }]` names properties defined beside
 * it, which the specification allows. Union types are part of the tool profile.
 */
export function createAjv(): Ajv2020 {
  return new Ajv2020({ strict: true, strictTypes: false, strictRequired: false, allowUnionTypes: true });
}
