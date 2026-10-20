# TICKET-001: Isometric projection kit — Security Review

## Summary

This review covers the delivery of `graph-library/geometric-shapes-and-solids/TICKET-001` as it stands at HEAD of branch `ticket/gss-001` (`e8a6d42`). That is the delivery commit `88b80fe`, plus the code-review resolution `2c98c08` and the quality-review resolution `e8a6d42`. The `security-reviewer` agent ran the findings phase in a fresh context on 2026-10-20.

The module is 81 lines of arithmetic with no imports, and nothing can reach it yet:
- only its test imports it;
- no file in `dist/` contains its identifiers;
- the `exports` map has no `./*` pattern.

Its attack surface is therefore what its three consumers will pass in: GSS TICKET-006 (cube), GSS TICKET-007 (cylinder) and NLC TICKET-004 (x,y,z graph). Probed in memory, it holds up:
- **Non-finite results fail closed.** `NaN` and ±`Infinity` propagate, `fmt()` refuses them with a `RangeError`, and `createGraphWith` turns that into the fixed `internal_error`. `-0` comes out as `0` from `fmt()`, and `checkScene` rejects it if `fmt()` is skipped.
- **The constants are deeply frozen.** Every strict-mode write to `VIEW_DIRECTION`, `VISIBLE_FACES`, its three normals or the module's exports throws `TypeError`. Each call returns a new tuple or object, and inputs are neither kept nor changed.
- **Prototype pollution changes nothing it computes.** I polluted `Object.prototype` (indices 0–2, `back`, `cx`, `rx`, `rotation`, `transform`) and `Array.prototype[3]` before the module loaded. No constant and no result changed.
- **Module load:** no global state changes. A bare import is dropped under `sideEffects: false`. The import-boundary lint rejects `react`, `node:http`, `fetch`, `window` and `document`.
- **Dependencies:** `pnpm audit` and `pnpm audit --prod` are clean, and the lockfile is unchanged.

The two findings are guidance for the consumers. Neither affects anything this delivery does:
- **SEC-001 (Informational):** `VISIBLE_FACES` keeps `Object.prototype`. Names it does not have, such as `constructor` or a polluted `back`, resolve through the prototype chain, and `for…in` lists polluted keys. `faceVisible` reads a missing index the same way.
- **SEC-002 (Informational):** `(x + y) / 2` and `y − x` overflow for finite coordinates from about 9e307. A point on the line of sight, whose exact projection is (0, 0), then projects to (0, `Infinity`). That is unreachable today. But nothing yet bounds the x,y,z graph's axis values, and NLC TICKET-004's criterion reads as "project, then scale".

Two findings: 0 Critical, 0 High, 0 Medium, 0 Low, 2 Informational.

**Reviewer:** `security-reviewer` agent, fresh context (findings phase only, 2026-10-20)
**Delivery Record:** `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-001-delivery.md` (DEL-001, DEL-002, Notes, Post-Review Amendments CR-001..004 and QR-001..003)

**Files Reviewed:**
- `src/layout/kit/isometric.ts`
- `tests/layout/kit/isometric.test.ts`
- Read unchanged, because the module's results flow into them:
  - `src/layout/kit/format.ts` (`fmt`);
  - `src/layout/kit/scale.ts` (`linearScale`);
  - `src/layout/kit/check.ts` (`checkScene`, `isRounded`);
  - `src/graph.ts` (`createGraphWith`);
  - `src/layout/registry.ts`, `src/core/definitions/index.ts` (the null-prototype pattern);
  - `package.json`, `tsup.config.ts`, `tsconfig.json`, `eslint.config.js` (the non-rendering block).

Context read:
- the ticket and its Known Hazards;
- the consumers: GSS TICKET-006, 007 and 008, NLC TICKET-004, and NLC TICKET-001 for the axis bounds the x,y,z graph will inherit;
- the delivery record;
- `.gener8v/constraints/prd.md` (there is no `constraints/geometric-shapes-and-solids.md`);
- `.gener8v/technical-design/system-design.md`: AD-007 and AD-009;
- `.gener8v/context.md` and `.gener8v/CONVENTIONS.md`;
- the resolved code and quality reviews for this ticket. Their findings are not raised again, in particular QR's tree-shaking measurement and its note that `isoEllipse` accepts r ≤ 0;
- the earlier security reviews in this change, for house style, especially GSS TICKET-002, DGP TICKET-003 and CPSE TICKET-002. Their accepted risks (CPSE TICKET-002 SEC-004, CPSE TICKET-003 SEC-005) do not touch this module.

**Review environment note:**
- **How I probed:**
  - Every probe was an inline `TSX_DISABLE_CACHE=1 npx tsx -e '…'` run from the repository root.
  - `tsx -e` evaluates sloppy-mode code. My first mutation probe showed writes silently ignored, with the values unchanged, so the immutability probes were repeated with `"use strict"`, the mode ESM consumers run in.
  - Each pollution probe ran in a fresh process and polluted before the module loaded.
  - Bundles were built with esbuild's API and `write: false`.
  - The scratch directory was not used.
- **Runtime:** Node.js v24.1.0, pnpm 10.28.2, macOS (Darwin 25.6.0).
- **Commands run in the repository** (all read-only):

| Command | Exit | Evidence |
|---|---|---|
| `pnpm audit` | 0 | No known vulnerabilities found |
| `pnpm audit --prod` | 0 | No known vulnerabilities found |
| `npx eslint --no-cache src/layout/kit/isometric.ts tests/layout/kit/isometric.test.ts` | 0 | no output |
| The module piped to `npx eslint --no-cache --stdin --stdin-filename src/layout/kit/isometric.ts`, with each of `import "react"`, `import "node:http"`, `fetch(…)`, `window.innerWidth` and `document.title` prepended | 1 each | `no-restricted-imports` or `no-restricted-globals`, with the boundary message (AD-001, prd/TC-005) or the network message (CPSE-REQ-005, prd/CC-003) |
| `pnpm typecheck` | 0 | `tsc --noEmit`; `tsconfig.json` sets `noEmit` and no incremental build info |

- **Not run:**
  - `pnpm test` / Vitest: its global setup rebuilds `dist/`. The quality-review resolution re-ran the full Verification Run at this HEAD (1,112 tests, three runs).
  - `pnpm build`, `pnpm size` (it writes to the system temporary directory) and `pnpm generate` (it writes source).
- **Tree check:** `git status --short` before and after every command and probe showed only ` M .gener8v/runs.jsonl` (hook-written), and this report once written.

**Findings:** 2
**Critical:** 0 | **High:** 0 | **Medium:** 0 | **Low:** 0 | **Informational:** 2

## Security Assessment

### Input Validation

**Status:** Adequate
**Notes:**
**Entry points:** none public. The module exports the following for internal layouts:
- `isometric(x, y, z)`, `isoEllipse(center, r)` and `faceVisible(normal)`;
- `ISO_SCALE`, `ELLIPSE_RATIO`, `VIEW_DIRECTION` and `VISIBLE_FACES`.

How it is reached:
- `grep -rln isometric src tests scripts examples` finds only the module and its test.
- No layout is registered against it, and `grep` of `dist/` for `ISO_SCALE`, `isoEllipse`, `VIEW_DIRECTION` and `VISIBLE_FACES` finds nothing.
- The values its consumers will pass come from validated descriptions:
  - a cube's `edgeLength`;
  - a cylinder's radius, diameter and height;
  - an x,y,z graph's axis ranges and points.

**Non-finite and extreme input** (each result then passed through `fmt()`):

| Call | Result | Through `fmt()` |
|---|---|---|
| `isometric(NaN, 0, 0)` | `[NaN, NaN]` | `RangeError` on both |
| `isometric(0, 0, NaN)` | `[0, NaN]` | `0`; `RangeError` |
| `isometric(Infinity, 0, 0)` | `[-Infinity, Infinity]` | `RangeError` on both |
| `isometric(Infinity, Infinity, 0)` | `[NaN, Infinity]` | `RangeError` on both |
| `isometric(1e9, -1e9, 1e9)` (`VALUE_LIMIT`) | `[-1414213562.37…, -816496580.93…]` | prints |
| `isometric(1e21, 0, 0)` | `[-7.07e20, 4.08e20]` | prints |
| `isometric(1e22, 0, 0)` | `[-7.07e21, 4.08e21]` | `RangeError` (at or above 1e21, `fmt()`'s exponent-form bound) |
| `isometric(1e308, 1e308, 1e308)`, exactly (0, 0) | `[0, Infinity]` | `0`; `RangeError` (SEC-002) |
| `isometric(-0, -0, 0)` | `[0, -0]` | `0`, `0` |
| `isometric(5e-324, 0, 0)` | `[-5e-324, 0]` | `0`, `0` |
| `isoEllipse([0, 0, 0], NaN)`, `…, Infinity)` | `rx`, `ry` non-finite; `cx`, `cy` 0 | `RangeError` on `rx`, `ry` |
| `isoEllipse([0, 0, 0], -1)` | `rx` −1, `ry` −0.58 | prints. Not reachable, since every member has a positive minimum (quality review, not raised) |
| `faceVisible` of `[NaN, 0, 0]`, `[0, 0, 0]`, `[-0, -0, -0]`, `[Infinity, -Infinity, 0]`, `[1]`, `[]` | `false` | — |
| `faceVisible` of `[1e308, 1e308, 1e308]`, `[5e-324, 0, 0]`, `[Infinity, 0, 0]` | `true`: the sign of the dot product, as documented | — |

Bisection shows the largest coordinate whose projection still prints:
- 1.414e21 along x alone;
- 1.225e21 along z alone;
- 7.071e20 with y = −x.

The largest limit any registered description has today is 1e9 (`VALUE_LIMIT`, `src/core/value-scale.ts:14`). The circle's radius maximum is 1e6.

**What is handled well:**
- **It fails closed.**
  - Every non-finite or exponent-sized result is refused by `fmt()` (`src/layout/kit/format.ts:15-16`).
  - `createGraphWith` catches the `RangeError` and returns the fixed `internal_error` (`src/graph.ts:42-46`). The message, which quotes only a number, never reaches the caller (GSV TICKET-002 SEC-003).
  - A layout that skipped `fmt()` would be caught by `checkScene`, whose `isRounded` rejects non-finite numbers and `-0` (`src/layout/kit/check.ts:21`, `:57`).
- **`-0`:** `isometric(-0, -0, 0)` gives `-0` for y, and `fmt()` normalizes it. `faceVisible` of a negative-zero normal is `false`.
- **Malformed normals are not visible.** Without pollution, a `NaN`, zero, short or empty normal gives `false`, and the strict `> 0` keeps edge-on faces hidden (`src/layout/kit/isometric.ts:59`).
- **No caller-shaped work:**
  - no property lookup by a caller key, no object built from caller keys, no merge;
  - no loop or spread over caller data, so the GSS TICKET-002 SEC-001 hazard on caller-sized spreads cannot arise;
  - constant work per call. The only spreads, in the test, are over fixed three-element tuples.
- **Under pollution, nothing changes.** With `Object.prototype[0..2] = 1e9`, `back`, `cx`, `rx`, `rotation` and `transform` polluted, and `Array.prototype[3] = 7`, all set before the module loaded:
  - `ISO_SCALE` and `ELLIPSE_RATIO` keep their values;
  - `VIEW_DIRECTION` and `VISIBLE_FACES` serialize unchanged;
  - `isometric(1, 2, 3)` and `isoEllipse([1, 2, 3], 5)` return their unpolluted values;
  - `faceVisible` gives `true` for the three named normals and `false` for the three opposite ones.

  `ELLIPSE_RATIO = VIEW_DIRECTION[2]` (`src/layout/kit/isometric.ts:16`, QR-003) reads an own index of a frozen array, so pollution cannot reach it.

**Gaps:** none in this delivery. SEC-001 and SEC-002 are latent and depend on how the consumers call the module.

**Not applicable:** SQL, NoSQL, command and template injection, XSS and path traversal. The module handles no strings, produces no markup and does no I/O.

### Authentication & Authorization

**Status:** Not Applicable
**Notes:** This is library layout code, with no server, accounts, sessions or permissions (`.gener8v/context.md`: "no user accounts").

### Data Protection

**Status:** Adequate
**Notes:**
- **Sensitive data:** none. The module holds no data, and logs, stores and sends nothing.
- **Exceptions:** the only exception its results can cause is `fmt()`'s `RangeError`, whose message names a number, and `createGraphWith` discards it.
- **Secret scan:** I scanned the 204 lines that `git diff f2b3f30 HEAD -- src tests` adds. The patterns:
  - keys, tokens, passwords and private keys;
  - AWS, GitHub, npm and Slack token shapes;
  - URLs, `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource`;
  - `eval` and `Function(`, `innerHTML` and `dangerouslySetInnerHTML`, `document.` and `window.`;
  - storage, `console.`, `process.env`, `child_process`, `require(` and `import(`;
  - `__proto__`, `prototype` and `Object.assign`;
  - timers, `Math.random` and `crypto`.

  Nothing matched. The module has no import statement.

### Configuration Security

**Status:** Adequate
**Notes:**
- **Manifest:** this ticket changes only its two files. `git diff f2b3f30 HEAD` shows no change to:
  - `package.json` or `pnpm-lock.yaml`;
  - `eslint.config.js`, `tsup.config.ts` or `.size-limit.json`;
  - `.github/`.

  `sideEffects: false` and `files: ["dist"]` stand. The `exports` map has no `./*` pattern, so consumers cannot import the module or a chunk that will hold it.
- **Module load:** importing the module left these unchanged:
  - `globalThis`'s own property names;
  - `Object.prototype`'s and `Array.prototype`'s own property names;
  - `Math`'s members.

  It makes five `Math.sqrt` calls and five `Object.freeze` calls, and nothing else.
- **Tree-shaking** (esbuild, in memory):
  - a bare `import "./src/layout/kit/isometric.ts"` bundles to 0 bytes;
  - a named import left unused drops the module;
  - using only `isometric` gives 311 bytes, keeping the frozen constants. The quality review measured that and did not raise it.
- **Immutability, in strict mode:**

| Attempt | Result |
|---|---|
| `VIEW_DIRECTION[0] = 5`, `VIEW_DIRECTION.length = 0`, `.push(1)`, `.sort()` | `TypeError` (read-only property, or object not extensible) |
| `VISIBLE_FACES.left = …`, `VISIBLE_FACES.left[0] = -1`, `delete VISIBLE_FACES.top`, `VISIBLE_FACES.back = …` | `TypeError` |
| `Object.defineProperty(VISIBLE_FACES, "left", …)`, `Object.setPrototypeOf(VISIBLE_FACES, …)` | `TypeError` |
| Assigning to the module's exports (`ISO_SCALE`, `isometric`) | `TypeError` |
| Mutating a returned `isometric` tuple or `isoEllipse` object | It changes only the caller's copy, because every call returns a new one. `isoEllipse` keeps no reference to `center`, and `faceVisible` changes nothing |

  In sloppy mode the same writes are silently ignored, and every value is unchanged afterwards. What freezing does not remove is `VISIBLE_FACES`' prototype (SEC-001).
- **Built output:** no built entry contains the module yet. `check:dist` and the size limits will first see it with the cube, cylinder or x,y,z entries.
- **Secrets and defaults:** none.
- **Cryptography:** not applicable. The module uses no randomness and no cryptographic function.
- **Logging and monitoring:** not applicable. The package logs nothing (AD-014), and the module adds no logger.

**Dependency audit:** `pnpm audit` (pnpm 10.28.2, Node.js v24.1.0), run 2026-10-20 10:10 UTC in the repository against the HEAD lockfile (`e8a6d42`), read-only.
- `pnpm audit`: `No known vulnerabilities found`, exit 0.
- `pnpm audit --prod`: `No known vulnerabilities found`, exit 0. The package has no runtime dependencies; `react` is a peer.
- This delivery does not change the lockfile.

**Carried Known Hazards (security-relevant):**

| Hazard | Result |
|---|---|
| Ticket: do not round inside `isometric()` | Honoured: no `Math.round` and no `fmt()` in the module. Non-finite results reach the callers' `fmt()` and fail closed |
| CPSE TICKET-002 SEC-003: `fmt()` on extreme values; `createGraph` catches layout errors (CPSE TICKET-003) | Holds: `fmt()` refuses non-finite and exponent-sized results, and `createGraphWith` catches them. That finding's third probe still reproduces at HEAD, outside this delivery: `linearScale([-1e308, 1e308], …)` returns `NaN` at 1e308, and 0 rather than the middle at 0. Its fourth recommendation, an axis-domain hazard on NLC TICKET-001, is not among that ticket's Known Hazards (SEC-002) |
| CPSE TICKET-002 SEC-002: no `url(` in attribute values | Not applicable: the module returns numbers only |
| GSS TICKET-002 SEC-001: no caller-sized spreads | Honoured: none in the module; the test spreads fixed three-element tuples only |
| GSV TICKET-001 SEC-003 and DGP TICKET-003 SEC-003: null-prototype maps, own-key reads, no reads of missing indices through the prototype | No read in this delivery depends on the prototype. `VISIBLE_FACES` is a lookup table that keeps `Object.prototype` (SEC-001) |

**Compliance cross-reference:** checked against `.gener8v/constraints/prd.md`. No per-area constraints file exists. The ticket names prd/TC-010 and TC-002.

| Constraint | Result |
|---|---|
| prd/CC-001 (licenses) | Met: no dependency, asset or font added |
| prd/CC-002 (WCAG 2.1 AA, non-text content) | Not applicable here: the module renders nothing. The cube and cylinder tickets carry it |
| prd/CC-003 (no data collection or network) | Met: no imports. Network modules and globals fail lint in `src/layout` (probed through stdin) |
| prd/CC-004 (no trademarked imagery) | Not applicable |
| prd/TC-002 (rounding) | Met: nothing is rounded here, and callers round with `fmt()`. The module uses only `Math.sqrt` and arithmetic, none of the trigonometric or power functions TC-002 names |
| prd/TC-005 (no React DOM or browser globals in non-rendering code) | Met: no imports; `react`, `window` and `document` fail the boundary lint |
| prd/TC-007 (side-effect-free, tree-shakable) | Met: an unused import is dropped entirely |
| prd/TC-010 (fixed projection, analytic hidden lines) | Met: the projection takes no view parameter, and `faceVisible` is an analytic front-facing test |

No CC-XXX violation was found, so no finding is raised to Critical.

## Findings

### SEC-001: `VISIBLE_FACES` keeps `Object.prototype`, so names it does not have resolve through the prototype chain, and `faceVisible` reads a missing index the same way

**Severity:** Informational
**Category:** Injection
**OWASP Reference:** N/A. Related to CWE-1321 (prototype pollution).
**Location:**
- `src/layout/kit/isometric.ts:47-51`: `VISIBLE_FACES` is `Object.freeze` of an object literal, so its prototype is `Object.prototype`.
- `src/layout/kit/isometric.ts:59`: `faceVisible` reads `normal[0]`, `normal[1]` and `normal[2]` with no length check. `Point3` is a type-level guard only. The test builds normals with `as unknown as Point3` (`tests/layout/kit/isometric.test.ts:98`), a cast that checks nothing.
- For comparison:
  - the registries are frozen null-prototype records (`src/layout/registry.ts:34`, `src/core/definitions/index.ts:23`);
  - `checkScene` reads its attribute table own-key (`src/layout/kit/check.ts:53`).

**Description:**
Freezing makes the table's three entries unchangeable, but it does not remove the prototype. Probes in fresh processes:
- **Without pollution:**
  - `"constructor"`, `"toString"`, `"__proto__"` and `"hasOwnProperty"` are all `in VISIBLE_FACES`, and `VISIBLE_FACES[name]` returns a function, or `Object.prototype`.
  - `faceVisible` of each is `false`, because their indices are `undefined`. So today an inherited name fails closed.
  - `for…in` lists only `left`, `right` and `top`.
- **With `Object.prototype` polluted before load** (`back = [-1, -1, -1]`, indices 0–2 = 1e9, plus `cx`, `rx`, `rotation` and `transform`):
  - `for…in VISIBLE_FACES` lists `left, right, top, 0, 1, 2, back, cx, rx, rotation, transform`.
  - `VISIBLE_FACES["back"]` returns the polluted `[-1, -1, -1]`.
  - `faceVisible(VISIBLE_FACES["constructor"])` is `true`, and so are `toString`, `__proto__` and `hasOwnProperty`: a function's missing indices read the polluted 1e9.
  - `faceVisible([-1])` is `true`: indices 1 and 2 fall through to the prototype. This is the same mechanism as DGP TICKET-003 SEC-003's empty-array read.
  - `Object.keys` and `Object.values` still give the three own entries.

No read in this delivery does any of these:
- the module reads only own indices of its own frozen arrays;
- the test reads `VISIBLE_FACES` through `Object.values` and fixed names.

The exposure would come from a consumer:
- TICKET-006 or TICKET-007 (DEL-002: both use `faceVisible`) choosing a face by a string taken from a description, for example an edge or face name in a label option;
- or a consumer iterating the table with `for…in`.

**Attack Scenario:** N/A (Informational)
**Impact:** this needs both a separate prototype-pollution bug in the host process and a consumer that indexes or iterates the table that way. Given both:
- a face the description never named reads as visible, so a hidden edge could be drawn solid, or a label placed for a face that does not exist;
- nothing is disclosed.

**Recommendation:** either or both of:
- **Build the table on a null prototype,** as the registries are, keeping its type: `Object.freeze(Object.assign(Object.create(null), { left: …, right: …, top: … }))`. Check that QR-002's `toEqual` pin (`tests/layout/kit/isometric.test.ts:75`) still passes.
- **Add a Known Hazard to GSS TICKET-006 and TICKET-007:**
  - read `VISIBLE_FACES` only by fixed property names or through `Object.values`/`Object.entries`;
  - never index it with a string from a description, and never iterate it with `for…in`;
  - map any description choice of edge or face through a `switch`, or an `Object.hasOwn` check;
  - pass `faceVisible` a full three-element normal built in code.

**Compliance Impact:** None
**Status:** Resolved
**Resolution:** Fixed — `VISIBLE_FACES` is built on a null prototype (frozen, annotated `/* @__PURE__ */`), so a name it does not hold reads as undefined. A test pollutes `Object.prototype` and checks that the table gains nothing and every face's visibility is unchanged; building it on a plain object again fails the test. Approved by the user, 2026-10-20.

---

### SEC-002: `isometric` overflows for finite coordinates from about 9e307, and nothing yet bounds the values the x,y,z graph will pass it

**Severity:** Informational
**Category:** Input Validation
**OWASP Reference:** N/A. Related to A10:2025 Mishandling of Exceptional Conditions and CWE-1339 (insufficient precision or accuracy of a real number).
**Location:**
- `src/layout/kit/isometric.ts:43`: `(y - x)` and `(x + y) / 2` are formed before the scale factor applies, so they overflow where the exact result is finite, even zero.
- `src/layout/kit/format.ts:15-16` and `src/graph.ts:42-46`: the non-finite result is refused and becomes `internal_error`.
- `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-001.md:33`: axis minimums and maximums are accepted with no stated bound on their size, and its Known Hazards carry none.
- `.gener8v/changes/graph-library/tickets/number-lines-and-coordinate-graphs/TICKET-004.md:34`: "ticks lie on their axis within 0.5 units of `isometric(value along that axis)` after scaling". That reads as "project the raw value, then scale".
- `.gener8v/changes/graph-library/delivery/geometric-shapes-and-solids-ticket-001-delivery.md:141`: "A layout scales its figure, then translates the projected bounds". This is the safe order, but it sits only in the delivery record's Notes, not in any consumer ticket's Known Hazards.
- Outside this delivery: `src/layout/kit/scale.ts:14-19`. A domain whose width overflows gives a ratio of 0, not a non-finite ratio, so the middle-of-range fallback is skipped, and `(value - d0) * 0` is `NaN` where `value - d0` overflows.

**Description:**
On the line of sight, every point projects exactly to (0, 0):
- `isometric(t, t, t)` gives (0, 0) up to t = 8.9e307;
- from t = 9e307, `x + y` overflows, the result is (0, `Infinity`), and `fmt()` throws.

The order a layout uses decides whether a valid description can get there. For three points on each range, (hi, hi, hi), (lo, hi, 0) and (hi, lo, lo):

| Axis range | Scale each axis into 200 units with `linearScale`, then project | Project the raw values, then fit 400 units |
|---|---|---|
| [−10, 10], [−1e9, 1e9], [−1e300, 1e300] | prints | prints |
| [−8e307, 8e307] | prints | `fmt()` throws on one coordinate |
| [0, 1.7e308] | prints | `fmt()` throws on two coordinates |
| [−1e308, 1e308] | `fmt()` throws, because `linearScale` returns `NaN` at 1e308 (outside this delivery) | `fmt()` throws |

Every failure fails closed. Each is a fixed `internal_error`: the fallback is drawn, and nothing throws past `createGraph` or leaks.

No valid description reaches this today:
- no registered type calls the module;
- the solids' measurements will be bounded by their definitions. The GSV TICKET-004 Known Hazard on TICKET-006 and TICKET-007 requires a finite, curriculum-sized maximum for every derivation-group member, such as the cylinder's radius and diameter, and the circle's radius maximum is 1e6;
- the data graphs stop at ±1e9.

The open case is the x,y,z graph:
- NLC TICKET-001 has not set a size bound on axis values. CPSE TICKET-002 SEC-003 recommended one as an axis-domain hazard on that ticket, but its resolution recorded a hazard on CPSE TICKET-003 only.
- NLC TICKET-004's criterion invites projecting raw values.

A valid x,y,z description with axes near ±1e308 would then report a package defect instead of a drawing. DGP TICKET-003 SEC-003 treated that outcome as contradicting `createGraph`'s promise that a valid description never becomes `internal_error`.

**Attack Scenario:** N/A (Informational)
**Impact:** none today. Once the x,y,z graph lands without a bound, a stored description with extreme axis values shows the fallback with `internal_error`: a false package-defect signal and a lost figure. Nothing is disclosed, and the cost per render is unchanged.
**Recommendation:**
1. **Known Hazard on NLC TICKET-001:** bound axis `min` and `max` to a curriculum-sized size, for example ±`VALUE_LIMIT` (1e9) as the data graphs do, and state the bound in the definition's description text. The same bound keeps `linearScale`'s domain width finite.
2. **Known Hazard on NLC TICKET-004, GSS TICKET-006 and GSS TICKET-007:**
   - scale each coordinate into drawing units before projecting, `isometric(sx(x), sy(y), sz(z))`. The projection is linear (tested), so this is the same drawing;
   - never project raw description values;
   - add a `createGraph` test at each axis's or member's limits that expects a drawing, not `internal_error`.
3. **Optional, in this module:** `x / 2 + y / 2` in place of `(x + y) / 2` removes the overflow of the sum. Halving is exact for normal numbers, so results should be unchanged below the overflow range; probe before adopting. It is not needed once (1) holds.

**Compliance Impact:** None. prd/TC-002 holds: no non-finite number is printed.
**Status:** Deferred
**Resolution:** Deferred → NLC TICKET-001 — Known Hazards appended to `tickets/number-lines-and-coordinate-graphs/TICKET-001.md` (bound axis values, for example ±1e9), `TICKET-004.md`, and `tickets/geometric-shapes-and-solids/TICKET-006.md` and `TICKET-007.md` (scale before projecting; a `createGraph` test at the limits). Approved by the user, 2026-10-20.

## Resolution Log

| Finding | Decision | Action Taken | Risk Accepted | File Updated |
|---------|----------|-------------|---------------|--------------|
| SEC-001 | Fixed | `VISIBLE_FACES` on a null prototype; pollution test | No | `src/layout/kit/isometric.ts`, `tests/layout/kit/isometric.test.ts` |
| SEC-002 | Deferred → NLC TICKET-001 | Known Hazards on NLC TICKET-001, TICKET-004 and GSS TICKET-006, TICKET-007 | No | the four ticket files |

## Verdict

**Result:** Approved
**Unresolved Critical/High:** 0
**Accepted Risks:** 0
**Notes:**
- SEC-001 is fixed and re-verified; SEC-002 is carried as Known Hazards on the tickets that will feed values into the projection. The module is import-free, deeply frozen, side-effect-free at load, and fails closed on every non-finite result.
- Re-verification: `pnpm generate` (no change), `lint`, `typecheck`, `bench`, `build`, `check:dist`, `check:deps`, `check:images`, `size`, `publint`, `attw`, `audit` and `gener8v-state lint` exit 0. `pnpm test` (1,113 tests) exits 0 on three runs. Building the table on a plain object again fails the new test.
- Dependency audit: `pnpm audit` and `pnpm audit --prod`, 2026-10-20, no known vulnerabilities.
