export type AISetting = {
  botName: string;
  role: string;
  target: string;
  tone: string;
  mustDo: string;
  mustNot: string;
  answerFormat?: string;
};

export function isAISetting(value: unknown): value is AISetting {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (record.answerFormat === undefined ||
    (typeof record.answerFormat === "string" && record.answerFormat.length <= 1000)) &&
    ["botName", "role", "target", "tone", "mustDo", "mustNot"].every(
    (key) => typeof record[key] === "string" && record[key].length <= 1000,
  );
}
