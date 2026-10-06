import { definitions } from "../src/core/definitions/index";
import { buildDescriptionTypes, buildSchema, buildToolSchema, buildVocabulary } from "../src/core/schema";
import { fixtureRegistry } from "../tests/fixtures/definitions/index";

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/**
 * Every generated file, by repository path, with its content: the one list the generator writes
 * and the freshness test checks (quality review QR-009 on TICKET-005).
 */
export function generatedFiles(): Record<string, string> {
  return {
    "src/generated/description.ts": buildDescriptionTypes(definitions),
    "src/generated/schema.json": json(buildSchema(definitions)),
    "src/generated/tool-schema.json": json(buildToolSchema(definitions)),
    "src/generated/vocabulary.json": json(buildVocabulary(definitions)),
    // Types from the test-only fixture definitions, for the type-level test (DEL-006).
    "tests/fixtures/generated/description.ts": buildDescriptionTypes(fixtureRegistry),
  };
}
