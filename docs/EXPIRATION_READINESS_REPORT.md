# Expiration Readiness Report

## Current State

The system already expires stale `PENDING` preorder reservations opportunistically inside reservation transactions. Both `reserve()` and `reserveWithPaymentDraft()` call `expireStalePendingReservations()` before checking active user reservations and available slots.

This is useful, but it is not automatic expiration. A campaign with no new reservation attempts can keep stale `PENDING` reservations visible as active until another reservation flow touches the campaign.

ETAPA 9 adds an MVP expiration path:

- `ExpirePendingReservations` application use case.
- `PreorderRepository.expirePendingReservations()` contract.
- `PrismaPreorderRepository.expirePendingReservations()` implementation.
- `npm run preorders:expire-pending` cron-friendly command.
- `npm run smoke:preorder-expiration` domain/mapper smoke coverage.

The job is still intentionally manual/cron-driven. There is no worker, queue, Redis dependency, provider cleanup, or schema migration.

ETAPA 9.5 adds operational wiring for Vercel staging:

- Vercel Cron calls `/api/internal/preorders/expire-pending`.
- The endpoint requires `Authorization: Bearer <CRON_SECRET>`.
- `.env.example` documents `CRON_SECRET`.
- `vercel.json` schedules the job once per day at `04:00 UTC`.

The daily cadence is deployment-safe for Vercel MVP/staging, but it is not a production-grade hold timeout. If reservation holds are expected to release within minutes, move the cron cadence to hourly or more frequent on a Vercel plan that supports it, or add a dedicated scheduler later.

## States Affected

- `PENDING`: can expire when `expiresAt < now`.
- `CONFIRMED`: must not expire automatically because deposit/payment has been accepted.
- `PARTIALLY_PAID`: must not expire automatically without a payment policy.
- `PAID`: must not expire automatically.
- `CANCELED`: already inactive.
- `EXPIRED`: already inactive.
- `FULFILLED`: already inactive.

## Capacity Rules

Active capacity currently counts:

- `PENDING`
- `CONFIRMED`
- `PARTIALLY_PAID`
- `PAID`

Inactive capacity excludes:

- `CANCELED`
- `EXPIRED`
- `FULFILLED`

Expiring a stale `PENDING` reservation releases capacity because `EXPIRED` is excluded from `ACTIVE_RESERVATION_STATUSES`.

## Repositories Affected

- `PrismaPreorderRepository.reserve()`
- `PrismaPreorderRepository.reserveWithPaymentDraft()`
- `PrismaPreorderRepository.findCampaignDetail()`
- `PrismaPreorderRepository.listCampaignsWithProducts()`
- `PrismaPreorderRepository.listReservationsByCampaign()`

The future expiration job should live in infrastructure/application boundaries and must not put Prisma in UI, pages, or domain.

## ETAPA 9 Strategy

1. Expire stale pending reservations by campaign or globally with a bounded batch size.
2. Receive `now` in the use case instead of calling time inside domain rules.
3. Keep the rule narrow: only `PENDING` with `expiresAt < now`.
4. Use `updateMany` with a status guard for idempotency.
5. Return a count and not full reservation payloads.
6. Keep invocation external via cron/manual command until production scheduling requirements are known.

## Edge Cases

- A stale `PENDING` reservation with a `PENDING` payment draft should become `EXPIRED`; payment drafts must not count as paid.
- A reservation that becomes `CONFIRMED` concurrently must not be expired. The `updateMany` predicate must include `status: PENDING`.
- Double expiration must be safe and should report zero additional rows on the second run.
- Expiration must not cancel or refund any paid reservation.
- Expiration should not modify `Product.stock`.

## Risks

- High: running an unbounded global update in production could lock too many rows.
- High: expiring paid or partially paid reservations would corrupt financial state.
- Medium: list/detail availability can be stale until the expiration job runs.
- Medium: stale `PENDING` payment drafts may remain as historical records.

## Smoke Tests To Add

- stale `PENDING` becomes `EXPIRED`.
- future `PENDING` remains `PENDING`.
- `CONFIRMED`, `PARTIALLY_PAID`, and `PAID` remain unchanged.
- second expiration pass is idempotent.
- capacity excludes expired reservations.

## What Not To Do Yet

- Do not add queues or workers before the MVP expiration use case exists.
- Do not add provider payment cleanup.
- Do not expire partially paid reservations.
- Do not change Prisma schema for expiration unless a real query/index bottleneck appears in staging.
- Do not use `Product.stock` in expiration logic.

## Operational Checks

- Run manually with `npm run preorders:expire-pending`.
- Run smoke policy with `npm run smoke:preorder-expiration`.
- A second consecutive run must be safe and should usually expire zero additional reservations.
- Monitor `expiredCount` and `durationMs` from the cron endpoint logs.
