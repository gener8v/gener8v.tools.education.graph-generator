import type { ReactElement, ReactNode } from "react";
import type { GraphType } from "../../src/core/definitions/types";
import { describeRange } from "../../src/core/issues";
import type { TermUse } from "../../src/core/schema";
import { vocabulary } from "./vocabulary";
import { cell, headCell, table } from "./styles";

// Each graph type's inputs, built from the generated vocabulary, so the table cannot drift from
// what the validator accepts (CPSE-REQ-044; GSV TICKET-005 code review CR-005).

interface Row {
  term: string;
  use: TermUse;
  /** Whether the term is required where it appears: in the description, an object or a list item. */
  required: boolean;
}

/** The terms of a type, nested object and list-item terms after their parent: `valueScale.minimum`, `categories[].name`. */
function rows(properties: Record<string, TermUse>, prefix = ""): Row[] {
  return Object.entries(properties).flatMap(([term, use]) => {
    const path = `${prefix}${term}`;
    const nested = use.properties === undefined ? [] : rows(use.properties, `${path}.`);
    const items = use.items?.properties === undefined ? [] : rows(use.items.properties, `${path}[].`);
    return [{ term: path, use, required: use.required === true }, ...nested, ...items];
  });
}

/** The kind of value; a list's with its items' kind. */
function kind(use: TermUse): string {
  return use.kind === "array" && use.items !== undefined ? `list of ${use.items.kind}` : use.kind;
}

/** What a value accepts beyond its kind. `prefix` names it when it is a list's item. */
function limits(use: TermUse, prefix: string): ReactNode[] {
  const notes: ReactNode[] = [];
  if (use.range !== undefined) notes.push(`${prefix}${describeRange(use.range, "")}`);
  if (use.values !== undefined) {
    notes.push(
      <>
        {prefix}one of:{" "}
        {use.values.map((value, index) => (
          <span key={value}>
            {index > 0 ? "; " : ""}
            <code>{JSON.stringify(value)}</code>
            {use.valueDescriptions?.[value] === undefined ? "" : ` (${use.valueDescriptions[value]})`}
          </span>
        ))}
      </>,
    );
  }
  if (use.kind === "color") notes.push(`${prefix}a color name or a hex code such as #0072b2`);
  if (use.maxLength !== undefined) notes.push(`${prefix}at most ${use.maxLength} characters`);
  return notes;
}

/** What a term accepts: range, values, limits, order, and when it applies. */
function accepts(use: TermUse): ReactNode[] {
  const notes = limits(use, "");
  if (use.maxItems !== undefined) notes.push(`at most ${use.maxItems} items`);
  // A list of plain values: what each item accepts.
  if (use.items !== undefined && use.items.properties === undefined) notes.push(...limits(use.items, "each item "));
  for (const [lower, upper] of use.ordered ?? []) notes.push(`${upper} must be greater than ${lower}`);
  if (use.appliesWhen !== undefined) {
    notes.push(`only when ${use.appliesWhen.term} is ${use.appliesWhen.values.map((value) => JSON.stringify(value)).join(" or ")}`);
  }
  return notes;
}

/** The last term of a path, the one the vocabulary defines: `categories[].name` → `name`. */
const leaf = (path: string) => path.slice(path.search(/[^.[\]]+$/));

/**
 * One graph type's inputs: every term, whether it is required, its kind, what it accepts and what
 * it means; then the values that determine one another and the checks across values.
 */
// @spec CPSE-REQ-044
export function InputTable({ type }: { type: GraphType }): ReactElement {
  const entry = vocabulary.graphTypes[type];
  if (entry === undefined) return <p>No inputs are published for {type}.</p>;
  return (
    <div>
      <table style={table}>
        <thead>
          <tr>
            <th style={headCell}>Term</th>
            <th style={headCell}>Required</th>
            <th style={headCell}>Kind</th>
            <th style={headCell}>Accepts</th>
            <th style={headCell}>Meaning</th>
          </tr>
        </thead>
        <tbody>
          {rows(entry.properties).map(({ term, use, required }) => (
            <tr key={term}>
              <td style={cell}>
                <code>{term}</code>
              </td>
              <td style={cell}>{required ? "yes" : "no"}</td>
              <td style={cell}>{kind(use)}</td>
              <td style={cell}>
                {accepts(use).map((note, index) => (
                  <div key={index}>{note}</div>
                ))}
              </td>
              <td style={cell}>{vocabulary.terms[leaf(term)]?.definition}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {entry.derivations.length > 0 && (
        <>
          <h4>Values that determine one another</h4>
          <ul>
            {entry.derivations.map((derivation) => (
              <li key={derivation.members.join()}>
                {derivation.members.join(", ")}: {derivation.description}. {derivation.required ? "Give at least one. " : ""}
                The first one given, in this order, sets the others; any other given must agree with it.
              </li>
            ))}
          </ul>
        </>
      )}
      {entry.checks.length > 0 && (
        <>
          <h4>Checks across values</h4>
          <ul>
            {entry.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
