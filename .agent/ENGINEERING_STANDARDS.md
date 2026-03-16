# Engineering Standards

This project follows strict but lightweight engineering discipline.
We optimize for clarity, reversibility, and long-term maintainability.

This is a single-founder codebase operating under professional standards.

---

## 🧠 Core Principles

- Small, atomic commits
- One responsibility per commit
- Clear separation of concerns
- Predictable Git history
- Never commit directly to `main`

Think like a senior engineer.
Optimize for your future self.

---

## 🌿 Branching Strategy

We use lightweight feature branching.

Branches:

- main → production-ready
- develop → integration branch
- feature/\* → new features
- fix/\* → bug fixes
- refactor/\* → internal improvements

Rules:

- Never work directly on `main`
- Each feature gets its own branch
- Keep branches short-lived and focused

Example:

```bash
git checkout develop
git pull
git checkout -b feature/admin-products-crud
```

## 🧾 Commit Discipline

We follow Conventional Commits.

Format:

type(scope): short description

Allowed types:
• feat
• fix
• refactor
• chore
• docs
• test
• perf

Examples:

feat(products): implement product creation endpoint
fix(auth): prevent session validation bug
refactor(inventory): extract reservation service

⸻

## 🔬 Commit Rules

• Commits must be atomic
• One logical change per commit
• Do not mix feature and refactor
• Do not mix formatting and logic
• Stage only related files (no blind git add .)
• A commit should not exceed ~300 lines of change when possible. Large changes must be split.

Before starting a task: 1. Generate a commit plan 2. List intended commits 3. Execute commits per logical unit

⸻

## 🔬 Scope rules

- auth
- catalog
- products
- orders
- inventory
- api
- ui
- infra
- database

⸻

## 🚫 Not Allowed

• Direct commits to main
• Large “misc changes” commits
• Mixed responsibilities
• Unclear commit messages

⸻

## 🏗 Architectural Integrity

All changes must respect:
• Existing domain boundaries
• Service isolation
• SSR-first philosophy
• Security constraints

⸻

## Pull Request Rules

All changes must go through pull request review.
PRs must be small and focused.
PR description must explain:

- what changed
- why
- testing performed

⸻

This repository evolves under disciplined engineering execution.
