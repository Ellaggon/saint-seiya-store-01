# Engineering Charter v2

Permanent engineering principles.

---

# 1. Simplicity First

If a solution requires long explanation,
it is likely over-engineered.

Always attempt:
"Is there a 30% simpler version?"

---

# 2. Decision Latency Control

Engineering decisions should be:

- Reversible whenever possible
- Small in scope
- Incremental

Avoid irreversible large changes unless necessary.

---

# 3. Anti-Overengineering Rule

Do not design for hypothetical scale.
Design for current scale with clear extension points.

---

# 4. Cognitive Load Limit

Code must be understandable within 30 seconds by a mid-level engineer.

If understanding requires external documentation,
refactor for clarity.

---

# 5. Refactor Triggers

Refactor when:

- Duplication appears
- Function exceeds responsibility
- File becomes difficult to navigate
- Performance regressions appear

---

# 6. Performance Guardrails

Always:

- Avoid N+1 queries
- Avoid unnecessary renders
- Avoid repeated heavy computations
- Cache when recomputation is expensive

---

# 7. Consistency Over Novelty

Introducing a new pattern requires justification.
Consistency across the system is more valuable than theoretical improvements.

---

# 8. Reversibility Principle

All changes should be revertible with minimal impact whenever possible.