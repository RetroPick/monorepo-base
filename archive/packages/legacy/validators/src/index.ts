export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function validateHex(value: string, bytes?: number): ValidationResult<`0x${string}`> {
  const expected = bytes == null ? "+" : `{${bytes * 2}}`;
  const re = new RegExp(`^0x[0-9a-fA-F]${expected}$`);
  if (!re.test(value)) return { ok: false, error: `expected 0x hex${bytes ? ` (${bytes} bytes)` : ""}` };
  return { ok: true, value: value as `0x${string}` };
}

export function validateFiniteNumber(value: unknown, name: string): ValidationResult<number> {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, error: `${name} must be a finite number` };
  }
  return { ok: true, value };
}

export function validateRequiredString(value: unknown, name: string): ValidationResult<string> {
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, error: `${name} is required` };
  }
  return { ok: true, value: value.trim() };
}
