import { MongoClient, ObjectId } from "mongodb";

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "eir_scanner";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  if (!URI) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(URI).connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(URI).connect();
  }

  return clientPromise;
}

export async function getCollection(name: string) {
  const client = await getClientPromise();
  return client.db(DB_NAME).collection(name);
}

export { ObjectId };

export const DEDUP_KEYS: Record<string, string[]> = {
  vendors: ["code"],
  containers: ["code"],
  bookings: ["booking_no"],
  customers: ["code"],
  users: ["username"],
};

export const ALLOWED = ["vendors", "containers", "bookings", "customers", "users"] as const;
export type AllowedCollection = (typeof ALLOWED)[number];
