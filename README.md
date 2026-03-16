# The Sanctuary

The ultimate digital sanctuary for Saint Seiya collectors. An e-commerce platform focused on premium presentation (Tamashii style), high-end catalog browsing, and reliable global shipping management.

## 🚀 Tech Stack

- **Framework:** [Astro](https://astro.build) (SSR)
- **Styling:** Tailwind CSS
- **Database / ORM:** Prisma
- **Authentication / Datastore:** Supabase
- **Storage:** AWS S3 SDK
- **Language:** TypeScript

## 🏗 Architecture (Strict Clean Architecture)

This repository follows a strict Clean Architecture pattern. All implementation must comply with the internal guidelines defined in the `.agent/` directory.

### Canonical Folder Structure

- **`src/domain/`**
  Core business model (User, Product, Order). Pure TypeScript. No framework bounds.
- **`src/application/`**
  Use cases and DTO definitions. Coordinates business operations.
- **`src/infrastructure/`**
  Database implementations (Prisma), storage, and third-party integrations (Supabase, S3).
- **`src/endpoints/`**
  API Layer. HTTP adapters only. Thin layers that validate input and execute use cases.
- **`src/ui/`**
  Visual presentation. Components, layouts, and UI-specific pages. Cannot contain business logic.
- **`src/pages/`**
  Astro router layer. Framework routing bridge. No business logic or DB access directly.

### Strict Dependency Rules

- `pages` → `ui`, `endpoints`
- `ui` → `endpoints` (via HTTP only)
- `endpoints` → `application`
- `application` → `domain`
- `infrastructure` → `domain`

## 📦 Core Modules

1. **Users:** Customer profile & Admin management.
2. **Catalog:** Products, Lines (Myth Cloth EX, Vintage, etc.), and Characters.
3. **Orders & Shipping:** Checkout flow, shipping tracker.
4. **Inventory & Reservations:** Stock tracking and pre-orders.

## ⚙️ Development

### Setup

Install dependencies:

```bash
npm install
```

### Environment Variables

Ensure you have your `.env` configured for:

- `DATABASE_URL` / `DIRECT_URL` (Supabase / Prisma)
- Supabase public/private keys
- S3 credentials (if applicable)

### Scripts

- **Run local development server:**

  ```bash
  npm run dev
  ```

- **Build for production:**

  ```bash
  npm run build
  ```

- **Preview production build:**
  ```bash
  npm run preview
  ```

## 📜 Engineering Standards

- **Atomic Commits:** Small, focused commits following Conventional Commits format (`feat:`, `fix:`, `refactor:`).
- **No direct commits to `main`:** Use lightweight feature branching (`feature/*`, `fix/*`).
- **Framework Isolation:** Astro, Prisma, and Tailwind code are strictly forbidden in `domain` and `application` layers.

---

> _Code must follow architecture. Architecture must follow product clarity._
