# AUTO_EXECUTION_PIPELINE

All implementation must follow this execution order.

---

# Step 1 — Context Load

Before implementing anything, load:

- ARCHITECTURE_SOURCE_OF_TRUTH
- PRODUCT_SOURCE_OF_TRUTH

---

# Step 2 — Module Evaluation

Before generating code, verify:

- The requested module exists in PRODUCT_SOURCE_OF_TRUTH.
- The module is within MVP scope.
- All declared dependencies are satisfied.

If misaligned, stop and report.

---

# Step 3 — Implementation Order

Modules must be implemented strictly in this sequence:

1. Domain (entities, value objects, domain services)
2. Application (use cases, DTOs)
3. Infrastructure (repository implementations, adapters)
4. Endpoints (API layer only, no business logic)
5. UI (presentation only, no business logic)

Layer boundaries must follow ARCHITECTURE_SOURCE_OF_TRUTH.

---

# Step 4 — Validation

Before finishing:

- Ensure no cross-layer violations.
- Ensure no business logic exists in UI.
- Ensure no direct database access from endpoints.
- Ensure dependencies follow defined module rules.

If violations are detected, correct them before completion.
