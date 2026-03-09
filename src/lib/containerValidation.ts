/**
 * ISO 6346 Container Number Validation
 *
 * Format: OOOODDDDDDDC
 *   OOOO  = Owner code (3 letters) + Equipment category (1 letter: U/J/Z)
 *   DDDDDD = 6-digit serial number
 *   C      = 1 check digit
 *
 * Translated from Excel formula using CHOOSE(MATCH(...)) + SUMPRODUCT logic.
 */

const LETTER_VALUES: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19,
  J: 20, K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29,
  S: 30, T: 31, U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

const LETTER_MULTIPLIERS = [1, 2, 4, 8];
const DIGIT_MULTIPLIERS = [16, 32, 64, 128, 256, 512];

export function validateContainerNo(value: string): "valid" | "invalid" | "empty" {
  const raw = value.trim().toUpperCase().replace(/\s/g, "");
  if (!raw) return "empty";

  // Must be exactly 11 chars: 4 letters + 7 digits
  if (!/^[A-Z]{4}\d{7}$/.test(raw)) return "invalid";

  const letters = raw.slice(0, 4).split("");
  const digits = raw.slice(4, 10).split("").map(Number);
  const checkDigit = parseInt(raw[10], 10);

  // Sum for letters (positions 1–4)
  const letterSum = letters.reduce((sum, ch, i) => {
    const val = LETTER_VALUES[ch];
    if (val === undefined) return sum;
    return sum + val * LETTER_MULTIPLIERS[i];
  }, 0);

  // Sum for serial digits (positions 5–10)
  const digitSum = digits.reduce((sum, d, i) => sum + d * DIGIT_MULTIPLIERS[i], 0);

  const total = letterSum + digitSum;
  const computed = ((total % 11) % 10);

  return computed === checkDigit ? "valid" : "invalid";
}

/** Returns a human-readable message for UI display */
export function containerNoMessage(value: string): string | null {
  const result = validateContainerNo(value);
  if (result === "empty" || result === "valid") return null;
  if (!/^[A-Z]{4}\d{7}$/i.test(value.trim())) {
    return "รูปแบบไม่ถูกต้อง (ต้องเป็น 4 ตัวอักษร + 7 ตัวเลข เช่น TCKU1234567)";
  }
  return "Check digit ไม่ถูกต้อง (ISO 6346) — กรุณาตรวจสอบเลขตู้อีกครั้ง";
}
