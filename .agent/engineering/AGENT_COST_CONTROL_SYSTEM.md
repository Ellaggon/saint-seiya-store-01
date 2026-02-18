# Agent Cost Control System

Purpose:
Optimize model usage and reduce token consumption.

---

## 1. Model Selection Policy

Small tasks:
- lint fixes
- minor refactors
- simple CRUD additions

→ Use lightweight model

Complex tasks:
- architecture changes
- cross-module refactors
- schema redesign

→ Use advanced reasoning model

---

## 2. Token Budget Rule

Each task must define:

- expected complexity
- token budget estimate

If budget exceeded:
- simplify solution
- reduce reasoning branches

---

## 3. Anti-Overanalysis Rule

Reject:

- more than 3 solution branches
- unnecessary architectural comparisons
- speculative optimization

---

## 4. Escalation Rule

If lightweight model fails twice:
→ escalate to advanced model

---

## 5. Mandatory Logging

Each major task must log:

- model used
- estimated complexity
- real complexity
- improvement suggestions