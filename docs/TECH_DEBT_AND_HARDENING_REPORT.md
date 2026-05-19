# Tech Debt And Hardening Report

## Eliminated Debt

- SAFE: `CatalogQueryService` no longer owns Prisma access.
- SAFE: catalog metadata and catalog filter facet queries avoid avoidable `Promise.all` fan-out against Supabase session pool.
- SAFE: catalog smoke coverage exists for SSR, partial HTML, raw catalog JSON, and preorders index.
- SAFE: preorder payment balance calculation is centralized in `PreorderPaymentPolicy`.
- SAFE: manual preorder payments and balance completion share the same overpayment validation.
- SAFE: public category and collection JSON endpoints now use use cases/repositories plus shared legacy response helpers.
- SAFE: navigation debug logs were removed from runtime frontend code.

## Remaining Debt

- LEGACY ACCEPTED: `/api/products/[id]` still returns manual JSON and bare `400/404` responses.
- LEGACY ACCEPTED: upload endpoints still return raw `{ url }` and legacy `{ error: string }` because admin forms consume those shapes directly.
- LEGACY ACCEPTED: admin category/collection action endpoints still return manual JSON error responses.
- SHOULD CLEAN SOON: `PrismaProductRepository` remains large and still contains several `any` casts outside the catalog hardening path.
- SHOULD CLEAN SOON: category/collection admin UI components still use broad `any` props.
- SHOULD CLEAN SOON: auth UI and upload UI catch blocks still use `any`.
- HIGH RISK: Supabase pool/session mode can still surface transient connection errors under real concurrency.
- HIGH RISK: automatic reservation expiration is still missing; expired reservations require an explicit workflow.

## Operational Risks

- HIGH RISK: provider-grade payments need webhook signature validation, idempotency persistence, retry/reconciliation workflow, and refund policy.
- HIGH RISK: high-concurrency reservation/payment behavior needs DB-backed load tests against staging data.
- SHOULD CLEAN SOON: manual payment idempotency currently relies on provider/providerPaymentId behavior; empty keys are not idempotent.
- SHOULD CLEAN SOON: catalog list requests still execute `count + findMany` per request. This is acceptable for MVP but should be monitored in staging.
- LEGACY ACCEPTED: catalog JSON success payloads intentionally remain raw for compatibility.

## Endpoints Still Legacy

- LEGACY ACCEPTED: `/api/catalog/products`
- LEGACY ACCEPTED: `/api/catalog/metadata`
- LEGACY ACCEPTED: `/api/catalog/filters`
- LEGACY ACCEPTED: `/api/products`
- SHOULD CLEAN SOON: `/api/products/[id]`
- SHOULD CLEAN SOON: `/api/upload-product-image`
- SHOULD CLEAN SOON: `/api/upload-category-image`
- SHOULD CLEAN SOON: `/api/admin/categories/actions`
- SHOULD CLEAN SOON: `/api/admin/collections/actions`

## Not Worth Touching Yet

- NOT WORTH TOUCHING: replacing Astro SSR with client-side state management.
- NOT WORTH TOUCHING: introducing Redis before staging metrics prove cache pressure.
- NOT WORTH TOUCHING: replacing all legacy endpoints in one breaking response-shape migration.
- NOT WORTH TOUCHING: splitting Prisma repositories into many tiny repositories without a concrete caller need.
- NOT WORTH TOUCHING: adding provider abstractions before real payment provider integration starts.

## Production Blockers

- HIGH RISK: no automatic reservation expiration/release workflow.
- HIGH RISK: provider payment reconciliation and webhook idempotency are not implemented.
- HIGH RISK: no staging load test for last-slot reservation race, duplicate payment, and simultaneous cancellation/payment.
- SHOULD CLEAN SOON: legacy upload/category/collection endpoints still need normalized errors before public admin QA.

## Provider Integration Blockers

- HIGH RISK: no webhook signature validation.
- HIGH RISK: no durable provider event table or replay handling.
- HIGH RISK: refund/cancel-after-paid workflow is intentionally absent.
- SHOULD CLEAN SOON: manual payment and balance completion rules are centralized, but provider-specific duplicate event behavior is not implemented.

## Staging Readiness

- SAFE: catalog SSR/partial/API smoke coverage exists.
- SAFE: preorder public/admin APIs use use cases and normalized responses.
- SAFE: Product stock is not used as preorder availability.
- SAFE: manual payment balance validation is centralized.
- LEGACY ACCEPTED: some admin and upload endpoints keep legacy response shapes.
- SHOULD CLEAN SOON: run smoke scripts against staging after deploying with real Supabase limits.

## Priority

1. HIGH RISK: add reservation expiration workflow.
2. HIGH RISK: run concurrent reservation/payment tests against staging DB.
3. SHOULD CLEAN SOON: normalize upload and product detail API errors with consumer adaptation.
4. SHOULD CLEAN SOON: reduce `any` in `PrismaProductRepository` and admin forms when touching those files.
5. LEGACY ACCEPTED: keep catalog raw JSON until all consumers are migrated.
