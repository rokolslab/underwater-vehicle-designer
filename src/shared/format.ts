export function formatNumber(value: number, digits = 3): string {
  return Number(value).toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatInput(value: number): string {
  return Number(value.toFixed(4)).toString();
}
