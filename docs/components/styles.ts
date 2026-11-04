import type { CSSProperties } from "react";

// Shared styles of the documentation site's own components. System fonts only: the site loads
// nothing from outside its own files (prd/CC-003).

export const page: CSSProperties = {
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  fontSize: 14,
  lineHeight: 1.5,
  color: "#1b1b1b",
  maxWidth: 1000,
};

export const table: CSSProperties = { borderCollapse: "collapse", width: "100%", fontSize: 13, margin: "8px 0 16px" };

export const headCell: CSSProperties = { textAlign: "left", verticalAlign: "bottom", borderBottom: "2px solid #c4c4c4", padding: "6px 8px" };

export const cell: CSSProperties = { textAlign: "left", verticalAlign: "top", borderBottom: "1px solid #e0e0e0", padding: "6px 8px" };

export const codeBlock: CSSProperties = {
  background: "#f6f8fa",
  border: "1px solid #e0e0e0",
  borderRadius: 4,
  padding: 12,
  overflowX: "auto",
  fontSize: 13,
  maxHeight: 480,
};

export const note: CSSProperties = { borderLeft: "4px solid #0072b2", background: "#f2f8fc", padding: "8px 12px", margin: "12px 0" };
