# Engineering Charter

This charter defines permanent engineering principles for all projects.

---

# 1. Core Philosophy

- Code is a consequence, not the origin.
- Simplicity beats cleverness.
- Consistency beats theoretical perfection.
- Architecture precedes implementation.

---

# 2. Architecture Principles

## Separation of Concerns
Systems must be divided into:

- Domain logic
- Infrastructure
- Presentation

Business logic must never live in UI components.

## Single Responsibility
- Functions do one thing well.
- Avoid multi-purpose utilities.
- Prefer small modules.

## Composition over Inheritance
Prefer functional composition and pure functions.

---

# 3. Robustness Standards

All code must:

- Validate external input
- Handle null and undefined safely
- Protect against edge cases
- Avoid silent failures

---

# 4. Scalability Standards

- Avoid unnecessary loops
- Avoid repeated DB queries
- Prevent N+1 patterns
- Prefer linear complexity (O(n))

---

# 5. Documentation Discipline

Document the WHY, not the WHAT.

MEMORY.md must be updated when:
- Architectural decisions are taken
- Libraries are introduced
- Trade-offs are accepted

---

# 6. Delivery Discipline

Before any change is complete:

- Code understandable in 30 seconds
- No debug artifacts
- No dead code
- Change must be reversible

---

# 7. Git Discipline

Commit prefixes:

- [FEAT]
- [FIX]
- [REF]
- [PERF]
- [DOC]
- [ARCH]
- [AUTO-HEALED]

Rule:
One logical change per commit.