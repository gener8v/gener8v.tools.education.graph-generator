import type { Vocabulary } from "../../src/core/schema";
import generated from "../../src/generated/vocabulary.json";

/**
 * The generated vocabulary, the file `./vocabulary.json` publishes, typed. The site's tables are
 * built from it (GSV TICKET-005 code review CR-005: no documentation tables are generated). The
 * JSON import's inferred type widens tuples to arrays, hence the cast through `unknown`; the
 * freshness test keeps the file equal to `buildVocabulary`'s output, which has this type.
 */
export const vocabulary = generated as unknown as Vocabulary;
