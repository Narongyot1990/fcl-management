import { MongoClient, ObjectId } from "mongodb";

const URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB || "eir_scanner";

if (!URI) throw new Error("Missing MONGODB_URI environment variable");

// ── Connection singleton (reused across Next.js hot-reloads) ─────────────────
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(URI).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(URI).connect();
}

export default clientPromise;

// ── Helpers ──────────────────────────────────────────────────────────────────
export async function getCollection(name: string) {
  const client = await clientPromise;
  return client.db(DB_NAME).collection(name);
}

export { ObjectId };

// ── Dedup keys per collection ─────────────────────────────────────────────────
export const DEDUP_KEYS: Record<string, string[]> = {
  vendors: ["code"],
  containers: ["code"],
  bookings: ["booking_no"],
  customers: ["code"],
  users: ["username"],
};

// ── Allowed collections ───────────────────────────────────────────────────────
export const ALLOWED = ["vendors", "containers", "bookings", "customers", "users"] as const;
export type AllowedCollection = (typeof ALLOWED)[number];
