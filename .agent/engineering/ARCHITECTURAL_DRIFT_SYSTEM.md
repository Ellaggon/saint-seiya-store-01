# Architectural Drift Detection System

Purpose:
Prevent gradual degradation of system architecture.

---

## 1. Drift Detection Rules

Agent must periodically evaluate:

- violation of separation of concerns
- business logic inside UI layers
- duplicated domain logic
- uncontrolled cross-module imports
- increasing module coupling

---

## 2. Drift Indicators

Architectural drift is suspected when:

- files exceed defined size limits
- modules accumulate multiple responsibilities
- repeated patterns appear across unrelated modules
- dependency graph density increases significantly

---

## 3. Mandatory Refactor Trigger

If drift indicators exceed acceptable thresholds:

Agent must:

1. Propose refactor plan
2. Estimate affected modules
3. Generate PLAN.md refactor section
4. Execute controlled modular refactor

---

## 4. Architecture Preservation Rule

New code must follow:

- existing folder conventions
- existing naming conventions
- existing architectural boundaries

Deviation requires justification in MEMORY.md.

---

## 5. Execution Rule

Major structural changes cannot be executed
without running Architectural Drift Check first.