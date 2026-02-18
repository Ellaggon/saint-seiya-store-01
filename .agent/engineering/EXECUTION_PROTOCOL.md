# Agent Execution Protocol (Mandatory)

This protocol defines the operational behavior of the agent before, during and after any change.

---

# Phase 1 - Mandatory Pipeline

Every task MUST execute:

1. AUTO_EXECUTION_PIPELINE.md
2. Preflight
3. PLAN generation
4. Implementation
5. Audit
6. Self-healing

Skipping stages is forbidden.

# Phase 2 — Pre-Flight Analysis

Before writing or modifying any code the agent MUST:

1. Perform Impact Analysis
   - Identify affected files
   - Identify affected contracts (types, interfaces, APIs)
   - Detect possible regressions

2. Generate or update PLAN.md including:
   - Objective of the change
   - Files impacted
   - Risks
   - Definition of Done (measurable)
   - Rollback strategy (if applicable)

Execution is forbidden if PLAN.md is missing.

---

# Phase 3 — Implementation

During implementation:

- Prefer composition over inheritance
- Avoid side effects when possible
- Maintain architectural consistency
- Respect project STACK.md tools and conventions
- Do not introduce new libraries without justification

---

# Phase 4 — Internal Audit (/audit)

Before considering the task complete the agent MUST self-evaluate:

| Pillar | Criteria |
|-------|---------|
| Robustness | Handles edge cases, nulls, errors |
| Scalability | Works efficiently at scale |
| Readability | Understandable within 30 seconds |
| Cohesion | Single responsibility respected |
| Coupling | Avoids unnecessary dependencies |

If score average < 9.2 → automatic refactor required.

---

# Phase 5 — Self-Healing Loop

If error detected:

1. Root Cause Analysis
2. Apply fix
3. Add preventive validation or guard
4. Re-audit

After 3 failed attempts:
Mark status as **[BLOCKED]** and generate technical report.

---

# Phase 6 — Delivery Validation

Before finishing:

- PLAN.md updated
- No debug artifacts
- No dead code
- Documentation updated if architectural decision changed
- Commit classified correctly

