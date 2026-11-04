import { componentName as defaultName } from "../core/definitions/names";
import type { Pictograph } from "../core/definitions/pictograph";
import type { DescriptionBase } from "../core/definitions/types";
import { createIssue, pointer } from "../core/issues";
import type { Issue, Issues } from "../core/result";
import { validate } from "../core/validate/index";
import { PACKAGE_VERSION } from "../generated/version";
import { createGraph } from "../graph";
import { IMAGE_LICENSE_NOTICES, type ImageAsset, type ImageLicense, images } from "../images/index";
import { COMPONENT_NAME, printScene } from "./print";

/** `exportSource`'s options. */
export interface ExportSourceOptions {
  /** The exported component's name: a PascalCase identifier. Defaults to the graph type's, such as `CircleGraph`. */
  componentName?: string;
}

/** What `exportSource` returns: the component file's source text, or every issue that stops the export. Plain data. */
export type ExportSourceResult = { ok: true; source: string } | { ok: false; issues: Issues };

const PACKAGE_NAME = "@gener8v/graph-generator";

const NAME_EXPECTED = "a PascalCase identifier: a capital letter, then letters and digits, such as CircleGraph";

/**
 * The chosen component name, read own-key only as `renderGraph` reads its props, so a polluted
 * `Object.prototype.componentName` cannot name the component; or the issue at `/componentName`.
 */
function chosenName(options: unknown): { name?: string; issue?: Issue } {
  const chosen = typeof options === "object" && options !== null && Object.hasOwn(options, "componentName") ? (options as ExportSourceOptions).componentName : undefined;
  if (chosen === undefined) return {};
  if (typeof chosen === "string" && COMPONENT_NAME.test(chosen)) return { name: chosen };
  return { issue: createIssue("wrong_kind", pointer("componentName"), { term: "componentName", got: chosen, expected: NAME_EXPECTED }) };
}

/** The images a description's drawing embeds: a pictograph's unit image (AD-012); none for any other type. */
function embeddedImages(description: DescriptionBase): ImageAsset[] {
  if (description.type !== "pictograph") return [];
  const image = images[(description as Pictograph).unitImage];
  return image === undefined ? [] : [image];
}

/**
 * What the header comment says (CPSE-REQ-023): the package and version, the description as JSON
 * (`json`, the text that was validated and drawn), and, for embedded drawings, that they are
 * embedded, each one's name and author, and the full notice its license requires in every copy
 * (prd/CC-001; DGP TICKET-004 security review SEC-004). `printScene` escapes it into the comment.
 */
function headerFor(name: string, json: string, description: DescriptionBase): string {
  const lines = [
    `${name}: a ${description.type} exported by ${PACKAGE_NAME} ${PACKAGE_VERSION} with exportSource.`,
    "It depends on React alone, through the automatic JSX runtime, takes no props and uses no hooks.",
    "To change the graph, export the description again rather than editing the drawing.",
    "",
    "Description:",
    json,
  ];
  const embedded = embeddedImages(description);
  if (embedded.length > 0) {
    lines.push("", "Images: embedded in this file as drawings, not referenced, so the file needs no package or URL.");
    for (const image of embedded) lines.push(`- ${image.name}, by ${image.author}, under the ${image.license} license`);
    const licenses = [...new Set(embedded.map((image) => image.license))].sort() as ImageLicense[];
    for (const license of licenses) lines.push("", `The embedded drawings under the ${license} license carry this notice:`, "", IMAGE_LICENSE_NOTICES[license]);
  }
  return lines.join("\n");
}

const internalError = (): ExportSourceResult => ({ ok: false, issues: [createIssue("internal_error", pointer(), {})] });

/**
 * The description as JSON text, read once; `undefined` when it has none: a `toJSON` or a Proxy
 * trap that throws, a cycle, a value JSON cannot hold.
 */
function serialized(description: unknown): string | undefined {
  try {
    return JSON.stringify(description) as string | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Exports a description as the source of one standalone React component (AD-013): a `.tsx` file
 * that depends on React alone, takes no props and renders the markup the package's component
 * renders for the description. Validates with the components' validator, so it accepts exactly the
 * descriptions the components draw. Returns `{ ok: true, source }`, or `{ ok: false, issues }` with
 * every issue in the description and in `componentName`, the name's last. The same description and
 * package version always give the same text. Never throws (CPSE-REQ-018).
 */
// @spec CPSE-REQ-019, CPSE-REQ-021, CPSE-REQ-022, CPSE-REQ-023, CPSE-REQ-024, CPSE-REQ-025
export function exportSource(description: unknown, options?: ExportSourceOptions): ExportSourceResult {
  try {
    const chosen = chosenName(options);
    const nameIssues = chosen.issue === undefined ? [] : [chosen.issue];
    // The description as given is checked first, so its issues are the ones the components report,
    // and what the validator refuses (an accessor, a value JSON cannot hold) is never read further.
    const checked = validate(description);
    if (!checked.valid) return { ok: false, issues: [...checked.issues, ...nameIssues] };
    // Then it is read once, as JSON, and that copy is what is validated, drawn and printed in the
    // header, so the header is the description the file draws (security review SEC-002).
    const json = serialized(description);
    if (json === undefined) return internalError();
    const copy: unknown = JSON.parse(json);
    const graph = createGraph(copy);
    if (!graph.ok) return { ok: false, issues: [...graph.issues, ...nameIssues] };
    if (chosen.issue !== undefined) return { ok: false, issues: [chosen.issue] };
    const componentName = chosen.name ?? defaultName(graph.description.type);
    return { ok: true, source: printScene(graph.scene, componentName, headerFor(componentName, JSON.stringify(copy, null, 2), graph.description)) };
  } catch {
    // An option that throws when read, or a package defect: its message never reaches the caller
    // (GSV TICKET-002 SEC-003).
    return internalError();
  }
}
