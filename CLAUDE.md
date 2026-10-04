## gener8v Pipeline

This project uses the [gener8v pipeline](https://github.com/gener8v/gener8v.claude-skills). Skills are `/<skill>` under a copied install or `/gener8v:<skill>` under the plugin; this file uses the short form. The rules every skill follows are in `.gener8v/CONVENTIONS.md`.

- **Where things stand.** `.gener8v/pipeline-state.yaml` is generated from the artifacts — never hand-edit it. With the plugin installed a SessionStart hook puts the current state and next steps in front of every session; without it, run `/orchestrate` at session start and after any pipeline skill.
- **Who writes code.** Delivery writes source, on a ticket, after an approved plan. Brownfield adds `@spec` annotations only. Reviews change code only during interactive resolution, with approval, and record it in the delivery record. Anything else in source is a trivial fix (typo, formatting, config) or it becomes a ticket.
- **Traceability.** Every function, class or handler that implements a requirement carries `@spec <PREFIX>-REQ-XXX` on the line above it. Preserve and update annotations when code moves. `grep -rn "@spec"` audits coverage.
- **Artifacts and IDs.** Everything the pipeline produces lives in `.gener8v/` at the root you work from — a single repository or a workspace holding several, with every code path root-relative — and is written by the skill that owns it. Requirement, constraint, decision and ticket IDs are append-only — never renumber; mark removed items Withdrawn.
- **Changes.** Work is organised in changes under `.gener8v/changes/<slug>/`; living specifications are amended, never regenerated.
- **Scale.** 1–2 capability areas: Planning → Specification → Ticket Breakdown → Delivery → Reviews. 3–5: add Constraints, Dependencies, Technical Design. 6+: parallel specification passes and sub-pipelines. Depth follows correctness risk (data integrity, tenant isolation, security), not just area count.
