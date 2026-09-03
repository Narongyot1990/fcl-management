/**
 * Password hashing with Node's built-in scrypt — no native dependency.
 *
 * Stored format: `scrypt$<N>$<saltHex>$<hashHex>`
 * Node runtime only (imported by API route handlers that set
 * `export const runtime = "nodejs"`).
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const COST = 16384; // scrypt N
const PREFIX = "scrypt";

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, { N: COST }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt);
  return `${PREFIX}$${COST}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | undefined | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== PREFIX) return false;
  const cost = Number.parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  if (!Number.isFinite(cost) || salt.length === 0 || expected.length === 0) return false;

  const actual = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, expected.length, { N: cost }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isHashed(value: string | undefined | null): boolean {
  return typeof value === "string" && value.startsWith(`${PREFIX}$`);
}
