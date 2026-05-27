# Catalog Hardening Notes

## Request Map

- `/catalog` renders SSR and loads catalog products plus catalog metadata.
- `/catalog/partials/products` renders the products grid and pagination only for progressive enhancement.
- `/api/catalog/products` returns the legacy raw catalog JSON payload for consumers that still expect `{ items, pagination, sort }`.
- `/api/catalog/metadata` returns legacy raw metadata.
- `/api/catalog/filters` remains legacy and returns filtered facet metadata.

## Query Pressure

- Product listing requests execute `product.count` plus `product.findMany`.
- Full catalog SSR also executes metadata queries for sidebar and category hero.
- Partial rendering avoids metadata and only executes the product listing queries.
- Metadata and filtered facets intentionally run sequentially to avoid fan-out against the Supabase session pool.

## Current Pooling Risk

The project uses a singleton Prisma Client, but the configured Supabase URL uses the pooler in session mode. Under concurrent catalog requests, Prisma can still report transient connection exhaustion or closed connections. The code now avoids avoidable query fan-out, but pool stability still depends on Supabase limits and deployment concurrency.

## Legacy Boundaries

- Catalog JSON endpoints still preserve raw success payloads for compatibility.
- HTML partial routes are not JSON APIs and must not be wrapped in `{ data }`.
- `CatalogQueryService` no longer owns Prisma access; database access lives in `PrismaCatalogQueryRepository`.

## Smoke Coverage

Run catalog smoke checks against a running server:

```sh
SMOKE_BASE_URL=http://127.0.0.1:4322 npm run smoke:catalog
```
