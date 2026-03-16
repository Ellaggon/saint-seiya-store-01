# GIT_WORKFLOW_AUTOMATION

This document defines how the AI agent must interact with Git and GitHub.

All repository changes must follow this workflow.

---

# 1. Execution Trigger

After implementation and validation:

- Code compiles
- No architecture violations
- No pipeline violations

The agent must initiate the Git workflow.

---

# 2. Commit Plan Generation

The agent must:

1. Run `git diff`
2. Analyze modified files
3. Group changes by responsibility

A commit plan must be generated.

Example:

Commit 1
feat(products): implement ListProducts use case

Commit 2
feat(api): add products endpoint

Commit 3
feat(ui): implement product filters component

---

# 3. Commit Execution

Commits must follow ENGINEERING_STANDARDS.

Rules:

- atomic commits
- conventional commits
- stage only related files
- never commit to main

Execution example:

git add src/application/use-cases/ListProducts.ts
git commit -m "feat(products): implement ListProducts use case"

---

# 4. Push Branch

After commits:

git push origin <current-branch>

---

# 5. Pull Request Creation

The agent must create a pull request using GitHub CLI.

Example:

gh pr create \
--base develop \
--head <current-branch> \
--title "Feature: Product filters" \
--body "

## What changed

Implemented product filtering.

## Why

Required for catalog browsing.

## Tests

Build passed and endpoint verified.

"

---

# 6. PR Validation

Before creating the PR the agent must verify:

- project builds successfully
- no architecture violations
- no pipeline violations
- commits follow conventions

---

# 7. Agent Responsibility

The agent must never:

- push directly to main
- create vague commits
- bypass architecture rules
- bypass pipeline validation

---

# 8. Human Role

The developer must:

- review the pull request
- approve the changes
- merge to develop
