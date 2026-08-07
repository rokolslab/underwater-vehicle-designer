export function safeIdStem(prefix: string, rawId: string, index: number): string {
  const encodedId = Array.from(rawId)
    .map((character) => character.codePointAt(0)?.toString(16).padStart(2, "0"))
    .join("-");
  return `${prefix}-${index}-${encodedId || "empty"}`;
}
