# ARCHITECTURE_SOURCE_OF_TRUTH

This document is the structural authority of the repository.

It defines:

- Canonical folder structure
- Layer responsibilities
- Dependency boundaries
- Framework isolation rules
- Enforcement rules

This structure is mandatory.
All implementation must comply.

---

# 1. Architectural Philosophy

This project combines:

- Premium presentation inspired by Tamashii Nations
- Functional e-commerce structure inspired by TodoSaintSeiya
- Clean Architecture principles
- Framework isolation
- Long-term scalability

Architecture must enable:

- Clear separation of concerns
- Safe team collaboration
- Predictable feature expansion
- Maintainable growth

Dogma is forbidden.
Clarity is mandatory.

---

# 2. Canonical Folder Structure (Authoritative)

src/

domain/
entities/
services/
value-objects/
repositories/ # Interfaces only

application/
use-cases/
dto/

infrastructure/
database/ # Prisma, repository implementations
storage/
email/

endpoints/
api/ # HTTP adapters only

ui/
components/
layouts/
pages/ # Page components (visual only)
styles/

pages/ # Astro Router Layer (routing only)

lib/
utils/
config/

No other structural patterns are allowed.

---

# 3. Layer Responsibilities

## 3.1 Domain Layer

Location:
src/domain/

Responsibilities:

- Business entities (User, Product, Order, etc.)
- Value objects (Money, IDs, etc.)
- Domain services
- Repository interfaces

Rules:

- Pure TypeScript only
- No framework imports
- No HTTP logic
- No database logic
- No UI references

This is the core business model of the Sanctuary.

---

## 3.2 Application Layer

Location:
src/application/

Responsibilities:

- Use cases (CreateOrder, ListProducts, etc.)
- DTO definitions
- Application orchestration

Rules:

- Can depend only on domain
- No framework code
- No UI logic
- No Prisma usage

This layer coordinates business operations.

---

## 3.3 Infrastructure Layer

Location:
src/infrastructure/

Responsibilities:

- Prisma implementations
- External services (email, storage, payments)
- Repository implementations

Rules:

- Implements domain repository interfaces
- May use framework-specific libraries
- Must not contain business rules
- Must not contain UI logic

Infrastructure is replaceable.

---

## 3.4 Endpoints Layer (API)

Location:
src/endpoints/api/

Responsibilities:

- HTTP request handling
- Input validation
- Calling application use cases
- Returning structured responses

Rules:

- No business logic
- No direct DB access
- No domain manipulation
- No UI code

Endpoints are adapters only.

---

## 3.5 UI Layer

Location:
src/ui/

Responsibilities:

- Visual presentation
- Component structure
- Layout system
- Styling according to UI_SOURCE_OF_TRUTH

Rules:

- No business logic
- No direct DB access
- No use case execution
- Communicates only via HTTP endpoints

UI must follow:

- 0px border-radius
- Black / Gold premium aesthetic
- Mechanical precision styling
- Product-first hierarchy
- Clear shipping visibility

---

## 3.6 Astro Router Layer

Location:
src/pages/

Purpose:
Framework routing bridge.

Router files MAY:

- Import UI page components
- Import layouts
- Read route params
- Forward to endpoints

Router files MUST NOT:

- Execute use cases
- Import domain
- Import infrastructure
- Access database
- Contain business logic

Router is structural only.

---

# 4. Dependency Rules

Allowed:

- pages → ui
- pages → endpoints
- ui → endpoints (HTTP only)
- endpoints → application
- application → domain
- infrastructure → domain

Forbidden:

- domain importing anything outside domain
- application importing infrastructure
- application importing ui
- ui importing infrastructure
- pages importing domain
- pages importing infrastructure
- endpoints importing domain directly
- business logic inside UI
- business logic inside router
- direct DB access from endpoints
- direct DB access from router

Layer boundaries are strict.

---

# 5. E-commerce Module Alignment

The system must support:

Users:

- Profile management
- Address management
- Admin roles

Catalog:

- Products
- Categories (Lines)
- Characters
- Product filtering

Orders:

- Checkout flow
- Order items
- Shipping tracking
- Status lifecycle

Inventory:

- Stock tracking
- Warehouse location
- Reservation (Pre-order system)

Orders depend on Users and Catalog.
Inventory depends on Catalog.

---

# 6. Framework Isolation Rule

Framework-specific code (Astro, Prisma, Tailwind, etc.)
MUST NOT exist in:

- src/domain
- src/application

Framework code is allowed only in:

- src/pages
- src/ui
- src/endpoints
- src/infrastructure

---

# 7. Repository Contract Rule

- Repository interfaces live in domain
- Implementations live in infrastructure/database
- Application depends on interfaces only
- No cross-layer repository leakage

---

# 8. Business Logic Placement Rule

Business logic is allowed ONLY in:

- src/domain
- src/application

Strictly forbidden in:

- src/pages
- src/ui
- src/endpoints
- src/infrastructure

---

# 9. Enforcement Rule

If any implementation proposes:

- API files outside src/endpoints/api/
- Business logic in UI
- Business logic in router
- Direct DB access from endpoints
- Direct DB access from router
- Cross-layer violations
- Framework code inside domain/application

The implementation MUST be rejected.

No silent tolerance.

---

# 10. Evolution Principle

Architecture may evolve,
but only through updating this document first.

Code must follow architecture.
Architecture must follow product clarity.
