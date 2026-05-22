import { createExpirePendingReservationsUseCase } from "@/infrastructure/preorders/PreorderUseCaseFactory";

const parseArg = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
};

const parseDateArg = (value: string | undefined): Date => {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --now value: ${value}`);
  }
  return date;
};

const parseBatchSize = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --batchSize value: ${value}`);
  }
  return Math.trunc(parsed);
};

const run = async (): Promise<void> => {
  const startedAt = Date.now();
  const useCase = createExpirePendingReservationsUseCase();
  const result = await useCase.execute({
    now: parseDateArg(parseArg("now")),
    campaignId: parseArg("campaignId"),
    batchSize: parseBatchSize(parseArg("batchSize")),
  });
  const durationMs = Date.now() - startedAt;

  console.log(
    JSON.stringify({
      data: {
        expiredCount: result.expiredCount,
        now: result.now,
        campaignId: result.campaignId,
        batchSize: result.batchSize,
        durationMs,
      },
    }),
  );
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error(
    JSON.stringify({
      error: {
        code: "EXPIRE_PENDING_RESERVATIONS_FAILED",
        message,
      },
    }),
  );
  process.exitCode = 1;
});
