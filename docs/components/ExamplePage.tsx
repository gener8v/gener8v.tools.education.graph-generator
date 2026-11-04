import type { ReactElement } from "react";
import { GRAPH_TYPES, type GraphType } from "../../src/core/definitions/types";
import { Graph } from "../../src/index";
import { InputTable } from "./InputTable";
import { Limit } from "./Limit";
import { RulerWidthNote } from "./RulerWidthNote";
import { codeBlock, page } from "./styles";
import { vocabulary } from "./vocabulary";

/** The graph type a description names, when it names one. */
function graphType(description: unknown): GraphType | undefined {
  const type: unknown = typeof description === "object" && description !== null ? (description as { type?: unknown }).type : undefined;
  return GRAPH_TYPES.find((known) => known === type);
}

/**
 * One example's page: the description as JSON, the graph `<Graph>` draws from it, and its type's
 * input table. A ruler's page also says how wide to show a ruler (rulers NLC TICKET-003 CR-003).
 */
// @spec CPSE-REQ-044
export function ExamplePage({ file, description }: { file: string; description: unknown }): ReactElement {
  const type = graphType(description);
  const entry = type === undefined ? undefined : vocabulary.graphTypes[type];
  return (
    <div style={page}>
      <h2 style={{ marginTop: 0 }}>{entry?.title ?? file}</h2>
      {entry !== undefined && <p>{entry.description}</p>}
      {type === "ruler" && <RulerWidthNote />}
      <div style={{ maxWidth: type === "ruler" ? 640 : 480 }}>
        <Graph description={description} />
      </div>
      <h3>
        Description: <code>examples/{file}</code>
      </h3>
      <pre style={codeBlock}>
        <code>{JSON.stringify(description, null, 2)}</code>
      </pre>
      {type !== undefined && (
        <>
          <h3>Inputs</h3>
          <p>
            Every term a {type} description accepts. Leave out a term that is not required to use its default. Titles,
            labels and names are at most <Limit name="CALLER_TEXT_LIMIT" /> characters and a unit at most{" "}
            <Limit name="UNIT_TEXT_LIMIT" />, counted as code points; longer text is an issue, never cut.
          </p>
          <InputTable type={type} />
        </>
      )}
    </div>
  );
}
