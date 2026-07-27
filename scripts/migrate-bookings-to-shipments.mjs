// One-off migration: copy each existing flat `bookings` doc into a `shipments`
// doc (shipment_no: 1). Purely additive — never mutates or deletes anything
// on the existing `bookings` docs, so it's safe to run against prod with the
// old app code still live, and safe to re-run (skips bookings that already
// have a shipment #1).
//
// Usage:
//   node --env-file=.env.local scripts/migrate-bookings-to-shipments.mjs            (dry run, default)
//   node --env-file=.env.local scripts/migrate-bookings-to-shipments.mjs --apply    (writes)

import { MongoClient } from "mongodb";

const APPLY = process.argv.includes("--apply");

const SHIPMENT_FIELDS = [
  "vendor_code",
  "truck_plate",
  "driver_name",
  "driver_phone",
  "plan_pickup_date",
  "eta",
  "container_no",
  "container_size",
  "container_size_code",
  "tare_weight",
  "seal_no",
  "eir_image_url",
  "container_image_url",
  "loading_status",
  "plan_loading_date",
  "pending_at",
  "loading_at",
  "loaded_at",
  "plan_return_date",
  "return_truck_plate",
  "return_driver_name",
  "return_driver_phone",
  "gcl_received",
  "return_date",
  "return_completed",
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI environment variable");
  const dbName = process.env.MONGODB_DB || "eir_scanner";

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const bookings = db.collection("bookings");
  const shipments = db.collection("shipments");

  const cursor = bookings.find({});
  let scanned = 0;
  let migrated = 0;
  let skipped = 0;

  for await (const booking of cursor) {
    scanned += 1;
    if (!booking.booking_no) {
      console.warn(`Skipping booking ${booking._id} — no booking_no`);
      skipped += 1;
      continue;
    }

    const existing = await shipments.findOne({ booking_no: booking.booking_no, shipment_no: 1 });
    if (existing) {
      skipped += 1;
      continue;
    }

    const shipmentDoc = { booking_no: booking.booking_no, shipment_no: 1 };
    for (const field of SHIPMENT_FIELDS) {
      if (booking[field] !== undefined) shipmentDoc[field] = booking[field];
    }
    shipmentDoc.created_at = booking.created_at ?? new Date().toISOString();

    if (APPLY) {
      await shipments.insertOne(shipmentDoc);
    }
    migrated += 1;
  }

  console.log(`Scanned ${scanned} booking(s).`);
  console.log(`${APPLY ? "Migrated" : "Would migrate"} ${migrated} shipment(s).`);
  console.log(`Skipped ${skipped} (already migrated or missing booking_no).`);
  if (!APPLY) {
    console.log("\nDry run only — no writes made. Re-run with --apply to write.");
  }

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
