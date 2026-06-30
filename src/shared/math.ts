export function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max = Number.POSITIVE_INFINITY,
): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(numeric, min), max);
}

export function uniqueSorted(values: readonly number[], epsilon = 1e-9): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.filter((value, index) => index === 0 || Math.abs(value - sorted[index - 1]) > epsilon);
}
