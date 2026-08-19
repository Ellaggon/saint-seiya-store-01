# Database Migration Runbook

## Environment contract

- `DATABASE_URL` is the pooled runtime connection used by serverless requests.
- `DIRECT_URL` is the direct or session-pooler connection used only by Prisma CLI migration commands.
- Vercel Production, Preview, and local development must each point to their own database. A preview must never use the production database.
- `DIRECT_URL` must be configured in each Vercel environment because its build gate runs `npm run db:migrate:status`.

## Required release order

1. Create a new migration with `npm run db:migrate -- --name <change>`; never edit an existing migration.
2. Open a pull request. CI creates an empty PostgreSQL database, applies every migration, validates Prisma, builds the app, and runs integration smoke tests.
3. During the production window, pause affected administrative writes and verify a Supabase backup or PITR point.
4. Run `npm run db:migrate:deploy` once with production `DIRECT_URL`.
5. Run `npm run db:migrate:status`; it must report that the database is up to date.
6. Validate structural and business invariants, then deploy the application.
7. Run the release smoke checks and reopen writes.

Vercel executes `npm run db:migrate:status` before each build. It never runs `migrate deploy`; a pending migration blocks application deployment until the database-first step is complete.

## Compatibility and cleanup

Use expand/contract changes: add compatible schema first, deploy consumers second, migrate data if necessary, and remove legacy columns only in a later release after all consumers have moved. Schema fallbacks are exceptional and must document an owner and a removal date in the pull request. `Product.imageUrl` remains a compatible product cover until catalog, cart, orders, preorders, and metadata read `ProductImage` consistently.

## Monitoring

Prisma emits a structured critical log event when it reports either schema-drift code:

```json
{"event":"prisma_schema_drift","severity":"critical","prismaCode":"P2021"}
```

Configure the production Log Drain or monitoring provider to page the on-call owner for `event=prisma_schema_drift` and `prismaCode=P2021 OR prismaCode=P2022`. These codes mean a missing table or column and require checking migration history before retrying writes. The alert must link to this runbook and preserve the deploy identifier, environment, and database project reference.

## Reversal strategy

1. If the application fails after an additive migration, roll back the Vercel application deployment first. Do not roll back the database; the previous application remains compatible with the expanded schema.
2. If a migration is incorrect but data is intact, create and deploy a new forward corrective migration. Do not edit the applied migration or use ad-hoc DDL from application code.
3. If data integrity is at risk, stop writes, retain logs and migration output, and restore through the verified Supabase backup/PITR procedure to a new recovery project. Validate counts and invariants there before directing traffic back.
4. Destructive removals require a separate release after a retention period, a tested restore, and confirmation that no production code reads the old field.
