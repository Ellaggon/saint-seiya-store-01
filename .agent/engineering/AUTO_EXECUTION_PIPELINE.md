# Auto Execution Pipeline

All tasks MUST follow this execution pipeline automatically.

---

## Stage 1 — Preflight

Before any modification:

- Load /workspace/prompts/preflight.prompt.md
- Execute analysis
- Generate or update /workspace/PLAN.md

Execution is forbidden without PLAN.md

---

## Stage 2 — Execution

- Perform implementation according to PLAN.md
- Maintain scope discipline
- Avoid unrelated changes

---

## Stage 3 — Internal Audit

After implementation:

- Load /workspace/prompts/audit.prompt.md
- Execute evaluation
- If score < 9.2:
  Refactor automatically

---

## Stage 4 — Self-Healing

If any error occurs:

- Load /workspace/prompts/selfheal.prompt.md
- Apply minimal correction
- Re-run audit
- Repeat max 3 attempts

If unresolved:
Mark as [BLOCKED]