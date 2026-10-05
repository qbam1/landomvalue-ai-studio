export type AISetting = {
  botName: string;
  role: string;
  target: string;
  tone: string;
  mustDo: string;
  mustNot: string;
};

export function isAISetting(value: unknown): value is AISetting {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["botName", "role", "target", "tone", "mustDo", "mustNot"].every(
    (key) => typeof record[key] === "string" && record[key].length <= 1000,
  );
}
