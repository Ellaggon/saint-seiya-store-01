# Refactor Trigger System

The agent must automatically trigger refactoring when any of the following conditions are detected:

---

## Structural Triggers

Refactor required if:

- File exceeds 400 lines
- Function exceeds 60 lines
- Cyclomatic complexity > threshold
- Module responsibilities exceed 1 domain concern

---

## Dependency Triggers

Refactor required if:

- Circular dependencies detected
- Module imports exceed 12 dependencies
- Hidden coupling detected between layers

---

## Change-Frequency Triggers

Refactor required if:

- Same file modified > 5 times within short cycle
- Bug fixes repeatedly touch same module
- Performance patches accumulate

---

## Performance Triggers

Refactor required if:

- Repeated O(n²) operations detected
- N+1 query risk detected
- Repeated redundant API calls found

---

## Mandatory Action

When any trigger activates:

1. Generate REFACTOR_PLAN.md
2. Run preflight impact analysis
3. Execute incremental refactor
4. Re-run audit