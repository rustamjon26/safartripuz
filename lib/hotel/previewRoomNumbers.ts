export function generatePreviewRoomNumbers(opts: {
  count: number;
  startNumber: number;
  prefix?: string;
}): string[] {
  const { count, startNumber, prefix } = opts;
  if (count < 1 || count > 200) return [];

  const numbers: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const base = String(startNumber + i);
    numbers.push(prefix?.trim() ? `${prefix.trim()}${base}` : base);
  }
  return numbers;
}

export function formatPreviewSummary(numbers: string[]): string {
  if (numbers.length === 0) return "";
  if (numbers.length <= 10) return numbers.join(", ");

  const first = numbers.slice(0, 5).join(", ");
  const last = numbers.slice(-5).join(", ");
  return `${first} ... ${last}`;
}
