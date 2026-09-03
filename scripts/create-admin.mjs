// Create or update an admin user.
//
// Usage:
//   node --env-file=.env.local scripts/create-admin.mjs <username> <password> ["Full Name"]
//
// Re-running with the same username updates that user's password and resets the
// role to "admin". Password hashing must match src/lib/auth/password.ts.

import { MongoClient } from "mongodb";
import { randomBytes, scrypt } from "node:crypto";

const KEYLEN = 64;
const COST = 16384;

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scrypt(password, salt, KEYLEN, { N: COST }, (err, dk) => {
      if (err) reject(err);
      else resolve(`scrypt$${COST}$${salt.toString("hex")}$${dk.toString("hex")}`);
    });
  });
}

async function main() {
  const [username, password, name] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: node --env-file=.env.local scripts/create-admin.mjs <username> <password> ["Full Name"]');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI environment variable");
  const dbName = process.env.MONGODB_DB || "eir_scanner";

  const client = new MongoClient(uri);
  await client.connect();
  const users = client.db(dbName).collection("users");

  const hashed = await hashPassword(password);
  const now = new Date().toISOString();

  const existing = await users.findOne({
    username: { $regex: `^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      { $set: { password: hashed, role: "admin", active: true, name: name ?? existing.name ?? username } }
    );
    console.log(`Updated existing user "${username}" -> role=admin, password reset.`);
  } else {
    await users.insertOne({
      username,
      name: name ?? username,
      role: "admin",
      permissions: [],
      active: true,
      password: hashed,
      created_at: now,
    });
    console.log(`Created admin user "${username}".`);
  }

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
