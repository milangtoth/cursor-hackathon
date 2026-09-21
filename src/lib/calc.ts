const SAFE_EXPR = /^(?:\d+(?:\.\d+)?|\s+|[+\-*/%(),]|Math\.sqrt|\*\*)+$/;

export function tryCalc(input: string): number | null {
  let s = input.trim();
  if (s.startsWith("=")) s = s.slice(1).trim();
  if (!s || !/\d/.test(s)) return null;
  if (!/[+\-*/%^()]/.test(s) && !/sqrt/i.test(s)) return null;

  const expr = s
    .toLowerCase()
    .replace(/π|\bpi\b/g, `(${Math.PI})`)
    .replace(/\be\b/g, `(${Math.E})`)
    .replace(/sqrt\s*\(/g, "Math.sqrt(")
    .replace(/\^/g, "**");

  if (!SAFE_EXPR.test(expr)) return null;

  try {
    const value = Function(`"use strict"; return (${expr})`)();
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return value;
  } catch {
    return null;
  }
}

export function formatCalc(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const text = value.toPrecision(10);
  return text.replace(/\.?0+$/, "");
}
