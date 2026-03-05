# PROJECT_TECHNICAL_STACK

This document defines the official technology stack of the project.
New technologies require explicit justification.

---

# 1. Core Framework

- Astro v5
- TypeScript (strict mode)
- Node.js runtime

Principles:

- Astro is the primary rendering engine.
- Prefer server-rendered UI.
- Use React only for isolated interactive components.

---

# 2. UI & Styling

- TailwindCSS
- @astrojs/react (only when necessary)
- Lucide (icons)

Rules:

- Avoid unnecessary client hydration.
- No heavy UI libraries.
- UI must follow the Design System (in /docs).

---

# 3. API Layer

- Astro Server Endpoints
- REST-style endpoints
- Zod for validation (mandatory)

Rules:

- All external input must be validated.
- No business logic inside endpoints.
- Typed responses only.

---

# 4. Database Layer

- PostgreSQL (Supabase)
- Prisma ORM

Rules:

- Schema centralized.
- Migrations via ORM only.
- Avoid N+1 queries.

---

# 5. Authentication (Post-MVP)

- auth-astro (preferred)

Rules:

- Authentication is isolated from business logic.
- No domain logic inside auth callbacks.

---

# 6. Storage

- Cloudflare R2 (S3 compatible)
- AWS SDK v3
- Signed URLs required

Rule:
Bucket credentials must never reach the client.

---

# 7. Email

- Resend

Rule:
Emails must be sent via centralized email service.

---

# 8. Tooling & Quality

- ESLint
- Prettier
- Husky
- lint-staged
- astro check

Pre-commit must run:

- eslint
- prettier
- astro check

---

# 9. Deployment

- Vercel adapter (primary)
- Node adapter (fallback)

Rule:
No environment-specific logic hardcoded.
