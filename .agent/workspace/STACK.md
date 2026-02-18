# Project Technical Stack

This document defines the official technology stack.
No new technology should be introduced without justification in MEMORY.md.

---

# 1. Core Framework

- Astro v5
- TypeScript (strict mode)
- Node.js runtime

Principle:
Astro is the primary rendering engine.
React is used only when interactivity is required.

---

# 2. UI Layer

- TailwindCSS
- @astrojs/react (for isolated interactive components)
- Lucide (icons)

Rules:
- Prefer server-rendered UI.
- Avoid unnecessary client hydration.
- No heavy UI libraries unless strictly necessary.

---

# 3. Database Layer

- PostgreSQL (Supabase)
- Prisma ORM (recommended)

Rules:
- Schema centralized
- Avoid N+1 queries
- Use migrations only via ORM

---

# 4. API Layer

- Astro Server Endpoints
- REST style endpoints

Rules:
- Validate all input with Zod.
- Never trust FormData directly.
- Always return typed responses.

---

# 5. Validation & Safety

- Zod (mandatory for request validation)
- TypeScript strict typing

Rule:
All external input must pass schema validation before usage.

---

# 6. Authentication

- auth-astro
- next-auth (if required)

Rule:
No business logic inside auth callbacks.

---

# 7. Maps & External UI

- Leaflet (lightweight mapping)

Rule:
Load only on client when required.

---

# 8. File Storage

- AWS SDK v3 (S3)
- Signed URLs

Rule:
Never expose bucket credentials to client.

---

# 9. Tooling & Quality

- ESLint
- Prettier
- Husky (pre-commit)
- lint-staged
- astro check

Pre-commit must run:
- eslint
- prettier
- astro check

---

# 10. Deployment

- Vercel adapter
- Node adapter (fallback)

Rule:
No environment-specific logic hardcoded.

---

# 11. Explicit Non-Goals

- No Redux
- No heavy ORMs
- No class-based architecture
- No business logic inside components