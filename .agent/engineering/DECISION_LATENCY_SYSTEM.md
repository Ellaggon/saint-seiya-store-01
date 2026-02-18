# Decision Latency Control System

Purpose:
Prevent over-analysis, overengineering, and slow agent execution.

---

## 1. Decision Time Limits

For any implementation task:

- Architectural decision: max 3 candidate solutions
- Library selection: max 5 minutes reasoning equivalent
- Refactor decision: binary decision (refactor / no refactor)

Agent must avoid infinite optimization loops.

---

## 2. Sufficient Solution Rule

Preferred solution is:

- Correct
- Maintainable
- 30% simpler than the most complex alternative

Perfect solutions are forbidden if a sufficient solution exists.

---

## 3. Overengineering Detection

Agent must reject designs when:

- abstraction layers exceed real need
- patterns are introduced without reuse probability
- complexity grows faster than feature scope

---

## 4. Cognitive Load Limits

Reject implementations when:

- module understanding requires > 30 seconds
- file exceeds structural readability
- multiple responsibilities are introduced

---

## 5. Mandatory Execution Rule

When decision time threshold is reached:

1. Choose simplest viable solution
2. Document trade-off in MEMORY.md
3. Continue execution immediately