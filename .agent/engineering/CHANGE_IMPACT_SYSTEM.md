# Change Impact Prediction System

Purpose:
Predict structural risks before any significant modification.

---

## 1. Mandatory Impact Scan

Before executing any structural change:

Agent must estimate:

- impacted modules
- impacted contracts / types
- impacted database schema
- impacted APIs
- impacted tests

---

## 2. Risk Classification

Each change must be classified:

LOW:
isolated module change

MEDIUM:
multi-module interaction

HIGH:
schema / contracts / shared utilities modification

HIGH risk changes require extended audit after execution.

---

## 3. Regression Prediction

Agent must identify:

- potential runtime failures
- potential performance regressions
- possible backward compatibility issues

Predictions must be written in PLAN.md.

---

## 4. Test Targeting Rule

Agent must determine:

- which tests should run
- which tests must be created
- which snapshots must be updated

---

## 5. Mandatory Execution Rule

Execution cannot begin until:

- impact scan completed
- risks documented
- PLAN.md updated