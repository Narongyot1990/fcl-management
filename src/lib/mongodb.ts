import { Collection as MongoCollection, MongoClient, MongoServerError, ObjectId } from "mongodb";

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "eir_scanner";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;
const indexPromises = new Map<string, Promise<void>>();

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
  const collection = client.db(DB_NAME).collection(name);
  await ensureCollectionIndexes(name, collection);
  return collection;
}

async function ensureCollectionIndexes(name: string, collection: MongoCollection) {
  if (indexPromises.has(name)) {
    await indexPromises.get(name);
    return;
  }

  const promise = (async () => {
    if (name !== "bookings") return;

    await Promise.all([
      collection.createIndex({ booking_date: -1, created_at: -1 }, { name: "booking_date_created_at_desc" }),
      collection.createIndex({ created_at: -1 }, { name: "created_at_desc" }),
      collection.createIndex({ container_no: 1 }, { name: "container_no" }),
    ]);

    try {
      await collection.createIndex(
        { booking_no: 1 },
        {
          name: "booking_no_unique",
          unique: true,
          partialFilterExpression: { booking_no: { $type: "string" } },
        }
      );
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        console.warn("Could not create unique bookings.booking_no index because duplicate booking numbers already exist.");
        return;
      }
      throw error;
    }
  })();

  indexPromises.set(name, promise);
  await promise;
}

export { MongoServerError, ObjectId };

export const DEDUP_KEYS: Record<string, string[]> = {
  vendors: ["code"],
  bookings: ["booking_no"],
  customers: ["code"],
  users: ["username"],
};

export const ALLOWED = ["vendors", "containers", "bookings", "customers", "users"] as const;
export type AllowedCollection = (typeof ALLOWED)[number];
