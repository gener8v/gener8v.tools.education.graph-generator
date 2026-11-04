import type { ReactElement, ReactNode } from "react";
import { GRAPH_TYPES } from "../../src/core/definitions/types";
import { ISSUE_CODES, issueDocs } from "../../src/core/issues";
import { InputTable } from "./InputTable";
import { cell, headCell, table } from "./styles";
import { vocabulary } from "./vocabulary";

// The reference tables of the vocabulary and issue-code pages, built from the generated vocabulary
// and from `issueDocs`, so they cannot drift from the package (CPSE-REQ-045).

/** Every graph type: its `type` value, title and what it draws. */
// @spec CPSE-REQ-045
export function GraphTypeTable(): ReactElement {
  return (
    <table style={table}>
      <thead>
        <tr>
          <th style={headCell}>type</th>
          <th style={headCell}>Title</th>
          <th style={headCell}>What it draws</th>
        </tr>
      </thead>
      <tbody>
        {GRAPH_TYPES.map((type) => (
          <tr key={type}>
            <td style={cell}>
              <code>{type}</code>
            </td>
            <td style={cell}>{vocabulary.graphTypes[type]?.title}</td>
            <td style={cell}>{vocabulary.graphTypes[type]?.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Every term once, in name order, with its kind and definition. */
// @spec CPSE-REQ-045
export function TermTable(): ReactElement {
  const terms = Object.entries(vocabulary.terms).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return (
    <table style={table}>
      <thead>
        <tr>
          <th style={headCell}>Term</th>
          <th style={headCell}>Kind</th>
          <th style={headCell}>Definition</th>
        </tr>
      </thead>
      <tbody>
        {terms.map(([term, { kind, definition }]) => (
          <tr key={term}>
            <td style={cell}>
              <code>{term}</code>
            </td>
            <td style={cell}>{kind}</td>
            <td style={cell}>{definition}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The published color names and the color each one draws. */
// @spec CPSE-REQ-045
export function ColorTable(): ReactElement {
  return (
    <table style={{ ...table, width: "auto" }}>
      <thead>
        <tr>
          <th style={headCell}>Name</th>
          <th style={headCell}>Hex code</th>
          <th style={headCell}>Color</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(vocabulary.colors).map(([name, hex]) => (
          <tr key={name}>
            <td style={cell}>
              <code>{name}</code>
            </td>
            <td style={cell}>
              <code>{hex}</code>
            </td>
            <td style={cell}>
              <span aria-hidden="true" style={{ display: "inline-block", width: 48, height: 16, background: hex, verticalAlign: "middle" }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The limits the vocabulary publishes. */
// @spec CPSE-REQ-045
export function LimitFacts(): ReactElement {
  return (
    <ul>
      <li>
        Description versions accepted: {vocabulary.descriptionVersions.join(", ")}. Leave <code>version</code> out for the
        current one.
      </li>
      <li>
        Values in one description, counting every property and list item at every level: at most{" "}
        {vocabulary.limits.descriptionValues.toLocaleString("en-US")}.
      </li>
    </ul>
  );
}

/** Every graph type's input table. */
// @spec CPSE-REQ-044, CPSE-REQ-045
export function AllInputTables(): ReactElement {
  return (
    <>
      {GRAPH_TYPES.map((type) => (
        <section key={type}>
          <h3 id={`inputs-${type}`}>
            {vocabulary.graphTypes[type]?.title} (<code>{type}</code>)
          </h3>
          <InputTable type={type} />
        </section>
      ))}
    </>
  );
}

/** Text with its `backtick` spans shown as code. */
function withCode(text: string): ReactNode[] {
  return text.split("`").map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : part));
}

/** Every issue code, in the package's order, with what it means (`issueDocs`). */
// @spec CPSE-REQ-045
export function IssueCodeTable(): ReactElement {
  return (
    <table style={table}>
      <thead>
        <tr>
          <th style={headCell}>Code</th>
          <th style={headCell}>Meaning</th>
        </tr>
      </thead>
      <tbody>
        {ISSUE_CODES.map((code) => (
          <tr key={code}>
            <td style={cell}>
              <code>{code}</code>
            </td>
            <td style={cell}>{withCode(issueDocs[code])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
