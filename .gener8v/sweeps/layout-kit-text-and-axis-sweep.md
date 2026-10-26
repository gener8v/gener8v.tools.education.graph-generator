# Layout kit text and axis drawing (graph-library): Defect Sweep

## Scope

Swept on 2026-10-26, on branch `ticket/rulers-gsv-002` at `e511459`. This is the first sweep of this subsystem.

**Swept, own logic:**
- the shared text kit: `src/layout/kit/text.ts` (`textWidth`, `widestWord`, `wrap` and the mark and cluster bounds) and `src/layout/kit/title.ts` (`textLines`, `textBlock`, `titleBlock`);
- the axis drawing: `src/layout/kit/axis.ts` (`drawAxis`) and `src/layout/kit/ruler.ts` (`drawRulerMarks`, `rulerMarksDepth`, `rulerNumberOverhang`);
- their two axis callers: `src/layout/number-line.ts` and `src/layout/ruler.ts`.

**Perimeter opened.**
- *Callees, read for what they do with absent or unusual arguments:*
  - `src/core/format.ts`: `cleanText`, `forEachCodePoint`, `formatSupplied`;
  - `src/core/value-scale.ts`: `drawableTicks`, `niceTicks`, `axisTick`, `axisTickLabel`, `isTickValue`, and `onGrid` and `valueTicks` as the sibling tick rule;
  - `src/core/ruler.ts`;
  - the axis, number-line and ruler checks and `describe` in `src/core/definitions/`;
  - `src/layout/kit/{format,scale,ticks,labels,markers}.ts`, `TICK_LABEL_DROP` in `kit/value-scale.ts`, and `src/core/style.ts`;
  - the `appliesWhen` path of `src/core/validate/structure.ts`, for `smallestDivision` only.
- *Callers:* every call to `wrap`, `textWidth`, `widestWord`, `textBlock`, `titleBlock` and `textLines`, in `bar-graph.ts`, `line-graph.ts`, `circle.ts`, `pictograph.ts` and `kit/value-scale.ts`. Each was read only for the width it passes and for whether caller text reaches a text node without passing through `wrap`.
- *Entry points into a layout:* `createGraph`, `<Graph>`, the six per-type components and the per-type entries.

**Run against the code.** Throwaway probes run with `tsx`; no test was added to the repository:
- 6,985 valid number lines from three fuzz runs: random ranges from 1e-9 to 1e9, spacings, titles, line labels, points, and custom tick labels on drawn ticks;
- all 6,750 ruler configurations: every unit, length and division, × 5 objects × 5 labels × 3 titles;
- 144 `drawAxis` calls on vertical and sloped axes, every 15°, on each documented side.

The checks were:
- no `internal_error` for a valid description;
- no node outside the drawing;
- no text crossing a line, tick, mark or bar;
- no overlap between at most two point labels;
- no ruler number outside the ruler's body.

The 224 existing tests for these files pass.

**Not swept:**
- the bar, line, circle and pictograph layouts' own geometry;
- `kit/isometric.ts`, `kit/measure.ts`, and `kit/check.ts` beyond its role in `createGraph`;
- the source exporter's printer, the tool definition and the React renderer beyond `SceneSvg`;
- validator stages other than the axis, number-line and ruler checks;
- any rendering in a real browser. Every width claim here rests on the kit's own Helvetica table. The x,y and x,y,z graph layouts do not exist yet, so `drawAxis`'s sloped and vertical paths were swept by calling it directly.

## Findings

### DS-001: A tick spacing computed in floating point prints 17-digit tick labels that overwrite each other, the last reading higher than the line's own end

**What breaks.** A number line given `tickSpacing: 0.1 * 3` has these tick labels:
- `0.30000000000000004`, `0.6000000000000001`, `0.9000000000000001`;
- `1.2000000000000002` at the end of a line whose text alternative says it runs "from 0 to 1.2".

Neighbouring labels overlap by up to 62 units, so the numbers cannot be read. A student sees a wrong-looking value at the end of the scale. A bar graph given the same interval draws `0`, `0.3`, `0.6`, `0.9`, `1.2`.

**Mechanism.**
- `axisTickLabel` rounds each tick to `decimalPlaces(spacing)` (`src/core/value-scale.ts:485-488`). `axisTick` removes noise at `decimalPlaces(spacing) + 3` (`:422-424`).
- `decimalPlaces` counts the digits of the spacing's shortest printed form (`:472-475`). For `0.30000000000000004` that is 17, so a noisy spacing keeps its noise in every tick and every label.
- The sibling tick rule for the data graphs passes each tick through `onGrid` (`:82`, used at `:190`). Its comment names this exact hazard: decimal noise removed "so no tick label prints dozens of digits (security review SEC-003)". The axis rule has no such step.
- The long labels also widen the end room (`halfLabel` → `inset`, `src/layout/number-line.ts:128-133`). The line shrinks from 334 to 232 units and the labels still collide.

**Circumstance.** Any supplied `tickSpacing` whose shortest decimal form carries arithmetic noise, such as `0.1 * 3` or `0.7 / 7`. Such a spacing comes from a developer who computes it rather than typing it. The project already treats this input as real: the ruler absorbs a computed `0.1 + 0.2` for exactly this reason (NLC TICKET-002 code review CR-003). The x,y and x,y,z graphs (graph-library NLC TICKET-003 and TICKET-004) read the same tick rule through `kit/axis.ts`, so every axis of those types inherits this defect once they are built.

**Proof.** Reproduced. From the repository root:

```sh
node_modules/.bin/tsx --eval 'import("./src/graph.ts").then(({ createGraph }) => { const t = (d) => createGraph(d).scene.nodes.filter((n) => n.kind === "text").map((n) => n.text); console.log(t({ type: "number-line", axis: { min: 0, max: 1.2, tickSpacing: 0.1 * 3 } })); console.log(t({ type: "bar-graph", categories: [{ name: "a" }], values: [1], valueScale: { minimum: 0, maximum: 1.2, tickInterval: 0.1 * 3 } })); })'
```

The command prints `0, 0.30000000000000004, 0.6000000000000001, 0.9000000000000001, 1.2000000000000002` for the number line and `0, 0.3, 0.6, 0.9, 1.2` for the bar graph.

The overlap was measured at the kit's Helvetica widths without its 1.1 safety margin. Label centres are 58 units apart, and neighbouring labels overlap by 7, 62, 59 and 59 units.

A test asserting the number line's labels are `["0", "0.3", "0.6", "0.9", "1.2"]` fails today. Any fix must keep `tests/layout/kit/ticks.test.ts:62-64` passing, where `100000000.0025` keeps all its digits (NLC TICKET-001 quality review QR-002). The noise therefore has to be taken out of the spacing's decimal count, not out of the tick.

**Class.** Sibling writers: two tick-label rules, one guarded against decimal noise and one not.

### DS-002: A supplied spacing that leaves no multiple in the range validates and draws a number line with no ticks and no numbers, while the text alternative says it is ticked

**What breaks.** `{ min: 1, max: 9, tickSpacing: 10 }` returns `ok: true`. The figure has the line and two arrowheads, but no tick and no number, so it has no scale to read. The text alternative says "A number line from 1 to 9, ticked every 10", which describes ticks the figure does not have (prd/CC-002). The caller gets no issue telling them the description drew nothing useful. With one multiple in range, as in `0.5` to `1.5` by `1`, the line has a single number and still has no readable scale.

**Mechanism.**
- `axisSpacingIssues` (`src/core/definitions/axis.ts:126-135`) reports a spacing of 0 or less, and a count above `MAX_VALUE_TICKS`. Nothing reports a count of 0. NLC-REQ-008 and NLC-REQ-009 set only those two bounds.
- `drawableTicks` returns `{ ticks: [] }` for such an axis (`src/core/value-scale.ts:442-457`). This is deliberate: NLC TICKET-001 security review SEC-001 made such an axis draw "only its line" rather than a wrong tick, and tests pin it (`tests/layout/kit/axis.test.ts:175-179`, `tests/layout/kit/ticks.test.ts:111-121`). That decision covered the drawing, not whether the description should validate.
- `describe` builds "ticked every …" from the spacing alone, never from the ticks (`src/core/definitions/number-line.ts:250-253`).

**Circumstance.** A spacing larger than a range that excludes zero, such as a caller who meant tenths writing `tickSpacing: 1` on a line from 0.1 to 0.9. No custom tick labels are needed to trigger it. With custom labels, the caller would at least see `tick_label_not_on_tick`. The x,y and x,y,z graphs will share `axisSpacingIssues`.

**Proof.** Reproduced:

```sh
node_modules/.bin/tsx --eval 'import("./src/graph.ts").then(({ createGraph }) => { const r = createGraph({ type: "number-line", axis: { min: 1, max: 9, tickSpacing: 10 } }); console.log(r.ok, r.scene.nodes.map((n) => n.kind).join(","), "|", r.scene.textAlternative); })'
```

The command prints `true line,line,polygon,line,polygon | A number line from 1 to 9, ticked every 10, …`.

A test asserting that `validate` reports an issue at `/axis/tickSpacing` for this description fails today. The SEC-001 tests above must keep passing, because they test the kit, not the validator.

**Class.** Silent truncation. The axis's ticks are cut to none, and neither the caller nor the text alternative learns of it. Found as an incomplete gate: the tick-count check bounds the count from above only.

### DS-003: The 330 px minimum width for 3:1 mark contrast is documented only on `<RulerGraph>`, so a ruler drawn through `<Graph>` carries no warning

**What breaks.** A 30 cm ruler shown narrower than about 330 px renders its millimetre marks lighter than 3:1 against white (WCAG 1.4.11, prd/CC-002). The project accepted that and mitigated it with a note on one component. A developer using `<Graph>`, the package's documented entry component (CPSE-REQ-008), or `createGraph` with their own printer, finds no such note on that path. The same is true of the README and the published ruler description.

**Mechanism.**
- `drawRulerMarks` narrows each mark to half the mark spacing (`src/layout/kit/ruler.ts:175-176`). On a 30 cm ruler that is 352 / 300 / 2 = 0.587 units.
- The Scene scales to its container (`width="100%"`, `src/layout/scene.ts:160-166`), so a mark is shown 0.587 × W / 400 px wide.
- Rulers NLC TICKET-003 DEL-002 kept the marks and put the mitigation in `src/react/graphs/RulerGraph.tsx:11-13`. That is the only place it appears: `grep -rn "330" src README.md` returns that one line.
- `src/react/Graph.tsx:10-20` says nothing about it, and nor does `src/core/definitions/ruler.ts:212`, the published description. The README already has a Styling section for display caveats of this kind.
- The kit's own comment, `src/layout/kit/ruler.ts:26-27`, says the contrast "depends on the size the ruler is shown at, which the ruler's layout decides". `src/layout/ruler.ts` decides no shown size and names no minimum.

**Circumstance.** A centimetre ruler shown through `<Graph>` narrower than about 10.9 px per centimetre of its length: 327 px for 30 cm, 164 px for 15 cm. An example is a 30 cm ruler in a two-column worksheet or on a phone. A 12 in ruler marked to sixteenths is safe down to about 210 px.

**Proof.** The documentation gap is proven by the grep above.

The contrast threshold is reproduced arithmetically on DEL-002's own model. `#222222`, blended into white in sRGB at coverage `a`, reaches 3:1 only when 34a + 255(1 − a) ≤ 149, that is a ≥ 0.48. Then 0.587 × W / 400 ≥ 0.48 gives W ≥ 327 px.

The rendered contrast was not measured in a browser here. That part remains the delivery record's model, a hypothesis for whoever can render it. A sub-pixel line straddling two device pixels may render lighter still.

**Class.** Incomplete gates, found through a stale assertion (`kit/ruler.ts:26-27`).

## Swept and clean

- **Inherited defaults.**
  - `wrap`'s `maxLines = Infinity`: the callers that omit it pass category names and value labels, which validation bounds at 200 characters.
  - The `fontSize` default of 12 in `rulerMarksDepth`, `rulerNumberOverhang` and `drawRulerMarks`: the ruler layout passes one computed size to all three.
  - `drawAxis`'s `lineColor` default, `placeLabel`'s `padding = 0`, `drawMarker`'s size, and `linearScale` on a zero-width domain, which validation rules out.
  - `smallestDivision` on a centimetre ruler, which would make `rulerLayout` throw, is refused at validation as `inapplicable_property`.
- **Sibling writers.**
  - All six layouts take their title from `titleBlock` the same way.
  - Every text node carrying caller text passes through `wrap`, and so through the mark and cluster bounds (SEC-001): titles, point labels, line labels, custom tick labels, ruler labels, category names, axis labels, legend entries, circle labels and pictograph keys.
  - DS-001 is the one divergence found.
- **Incomplete gates.**
  - Every way into a layout validates first: `createGraph`, `<Graph>`, the per-type components and the entries.
  - `drawAxis` and `drawRulerMarks` check their options before drawing anything.
  - DS-003 is the one partial gate.
- **Fail-open on the error path.**
  - Every guard throws rather than defaulting: `checkedLabels`, `checkedOptions`, `checkFontSize`, `requirePositive`, the `maxLines` check and `fmt`. `createGraph` turns any throw into `internal_error`.
  - No fuzzed valid description produced `internal_error`.
  - Every `??` fallback in the subsystem picks a color or an empty label, never a safety decision.
- **Silent truncation.**
  - `wrap`'s cuts end in "…", and every text alternative states the text whole.
  - Marks past four in a row and cluster code points past sixteen are dropped from the drawing only, as documented.
  - A second custom label at one tick is dropped, as the published vocabulary states.
  - DS-002 is the exception.
- **Stale assertions.** Checked against code or arithmetic, and true:
  - the ±4,000 coordinate bound and the 0.01–36 font bound;
  - "301 marks exceed the 100-tick limit" and the mark-length table;
  - the 352-unit edge and the ~7.96 number size at 30 cm;
  - "the same product, in the same order" (`text.ts:125`);
  - "never splits" and "linear time";
  - all 95 ASCII advances against the Helvetica AFM.

  Four loose but harmless claims go to Quality Review rather than here:
  - `text.ts:22` says the 667 fallback errs "on the large side". It does not for —, …, Æ, Œ or ‰, each 1,000 in Helvetica against 733 with the margin. The margin absorbs isolated ones, including the kit's own "…".
  - `title.ts:14-16` puts the baseline "four fifths of the font size below each line's top". It is 0.9 em below the line box and 0.8 em below the em box.
  - The `tickLabels.text` description says a cut label keeps "never fewer than a few letters". At the 24-unit floor it keeps one wide letter: "W…", "数…".
  - Numeric tick labels on some default spacings, such as −19 to 0, come within 0.24 units of each other at real widths. This is documented as "may touch" (DEL-003).
- **Identity confusion.** Custom tick labels are keyed by the tick they match (`isTickValue`), with one rule for the drawing, the check and the text alternative. Ruler marks are identified by index, never by decimal value. Clusters keep marks, joiners and flag halves with their base character.
- **Not applicable:**
  - time-based inference: the subsystem has no clocks, timeouts or reapers;
  - unasked authorization: it has no routes, identities or person-level data;
  - over-serving the client: the component renders only the Scene, and nothing person-level crosses.

## Verdict

- **DS-001 → ticket, fix now.** Fix it before graph-library NLC TICKET-003 and TICKET-004 build the x,y and x,y,z graphs on the same tick rule. The fix belongs in the spacing's decimal count, so QR-002's far-from-zero ticks keep their digits. Whether the text alternative keeps stating the supplied spacing "as written" is a separate question the ticket should leave alone.
- **DS-002 → decision, then ticket.** The Product Owner decides:
  - whether a supplied spacing leaving fewer than 1 tick, or fewer than 2, is reported;
  - under which issue code, since issue codes are public contract (CONTRIBUTING.md);
  - and, if such a line stays valid, what its text alternative says.

  The SEC-001 kit behaviour stays.
- **DS-003 → ticket (documentation), can wait.**
  - Put the minimum shown width where `<Graph>` and `createGraph` users read it: the README's Styling section, `<Graph>`'s doc comment, and possibly the ruler's published description.
  - Correct `src/layout/kit/ruler.ts:26-27` to point at that decision (DEL-002) instead of the layout.

The only active change is graph-library. Ticket Breakdown appends the tickets to `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/`, starting at `TICKET-006.md` (the area's current maximum is TICKET-005), citing DS-001, DS-002 and DS-003. Each is its own ticket; nothing is bundled.

## Since the last sweep

No earlier sweep of this subsystem: `.gener8v/sweeps/` was empty. All three findings are new.

## Resolution

Recorded 2026-10-26 by Ticket Breakdown. Each finding became its own ticket in `graph-library/number-lines-and-coordinate-graphs/`.

- **DS-001** → `graph-library/number-lines-and-coordinate-graphs/TICKET-006` (Small, Must). It is a predecessor of TICKET-003 and TICKET-004.
- **DS-002** → Product Owner decision (Product Owner — Thomas Eaves, 2026-10-26): reject a supplied tick spacing that leaves fewer than two ticks in the axis range, reported at `/axis/tickSpacing`, with one new issue code (`too_few_ticks`, proposed). → `graph-library/number-lines-and-coordinate-graphs/TICKET-007` (Small, Must). The SEC-001 kit behaviour stays.
- **DS-003** → `graph-library/number-lines-and-coordinate-graphs/TICKET-008` (Small, Must; documentation, can wait).
