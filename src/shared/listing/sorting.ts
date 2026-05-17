export const resolveSort = <TSort extends string>(
  value: string | null | undefined,
  allowed: readonly TSort[],
  fallback?: TSort,
): TSort | undefined => {
  if (!value) return fallback;
  return allowed.includes(value as TSort) ? (value as TSort) : fallback;
};
