import type { ReactElement } from "react";
import { formatIssue } from "../core/issues";
import type { Issue } from "../core/result";
import { defaultStyle } from "../core/style";

/** The most issues the placeholder lists; the rest are counted (GSV TICKET-002 security review SEC-002). */
export const PLACEHOLDER_ISSUE_LIMIT = 20;

// Black on white with a solid border, so the box reads the same in greyscale and in print (prd/CC-002).
const boxStyle = {
  boxSizing: "border-box",
  width: "100%",
  padding: "0.75em 1em",
  border: "2px solid #000000",
  background: "#ffffff",
  color: "#000000",
  fontFamily: defaultStyle.fontFamily,
  lineHeight: 1.4,
} as const;

/**
 * The default output for an invalid description: a visible box stating that the graph could not
 * be drawn and listing the issue messages, at most `PLACEHOLDER_ISSUE_LIMIT` of them, then how many
 * more there are. Issue text is rendered only as React text children, never as markup
 * (GSV TICKET-002 security review SEC-001).
 */
// @spec CPSE-REQ-015
export function Placeholder({ issues }: { issues: readonly Issue[] }): ReactElement {
  const shown = issues.slice(0, PLACEHOLDER_ISSUE_LIMIT);
  const more = issues.length - shown.length;
  return (
    <div role="note" style={boxStyle}>
      <p style={{ margin: 0, fontWeight: "bold" }}>This graph could not be drawn.</p>
      <ul style={{ margin: "0.5em 0 0", paddingLeft: "1.25em" }}>
        {shown.map((issue, i) => (
          <li key={i}>{formatIssue(issue)}</li>
        ))}
      </ul>
      {more > 0 && <p style={{ margin: "0.5em 0 0" }}>{`…and ${more} more.`}</p>}
    </div>
  );
}
