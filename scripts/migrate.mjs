/*
 * Brings the database up to date. Runs before every build, so deploying is
 * enough to set up a new Supabase project or ship a schema change.
 *
 * Each file in supabase/migrations runs once, in order, inside a transaction,
 * and is recorded in revnit_admin.migrations. supabase/seed.sql (the
 * categories, safe to repeat) runs every time. A failed migration fails the
 * build, so a half-migrated site never goes live.
 *
 * Connects with POSTGRES_URL_NON_POOLING, which Vercel's Supabase integration
 * sets, or DATABASE_URL. With neither set (local builds) it does nothing.
 *
 *   npm run db:migrate
 */
import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";

const connection = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!connection) {
  console.log("migrate: no database connection configured, skipping");
  process.exit(0);
}

// sslmode in the URL makes node-postgres verify Supabase's certificate chain and fail; set TLS explicitly instead.
const url = new URL(connection);
const local = ["localhost", "127.0.0.1"].includes(url.hostname);
for (const key of [...url.searchParams.keys()]) url.searchParams.delete(key);

const supabaseDir = new URL("../supabase/", import.meta.url);
const read = (path) => readFileSync(new URL(path, supabaseDir), "utf8");
const migrations = readdirSync(new URL("migrations/", supabaseDir))
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();

const LOCK = 72536100; // keeps two simultaneous deploys from migrating at once
const client = new pg.Client({
  connectionString: url.toString(),
  ssl: local ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

// An unreachable database shouldn't block a deploy of code that may not need new SQL.
// A migration that runs and fails still stops the build below.
try {
  await client.connect();
} catch (error) {
  console.warn(`migrate: WARNING could not reach the database (${error.message}); skipping migrations`);
  process.exit(0);
}

try {
  await client.query("select pg_advisory_lock($1)", [LOCK]);
  await client.query(`
    create schema if not exists revnit_admin;
    create table if not exists revnit_admin.migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows } = await client.query("select name from revnit_admin.migrations");
  const applied = new Set(rows.map((r) => r.name));

  // A database set up by pasting the SQL by hand has the tables but no record of them.
  if (applied.size === 0) {
    const { rows: existing } = await client.query("select to_regclass('public.families') is not null as present");
    if (existing[0].present) {
      for (const name of migrations) {
        await client.query("insert into revnit_admin.migrations (name) values ($1)", [name]);
        applied.add(name);
      }
      console.log("migrate: found an existing schema, recorded current migrations as applied");
    }
  }

  for (const name of migrations) {
    if (applied.has(name)) continue;
    await client.query("begin");
    try {
      await client.query(read(`migrations/${name}`));
      await client.query("insert into revnit_admin.migrations (name) values ($1)", [name]);
      await client.query("commit");
      console.log(`migrate: applied ${name}`);
    } catch (error) {
      await client.query("rollback");
      throw new Error(`${name} failed and was rolled back: ${error.message}`);
    }
  }

  await client.query(read("seed.sql"));
  await client.query("notify pgrst, 'reload schema'");
  console.log("migrate: database is up to date");
} finally {
  await client.query("select pg_advisory_unlock($1)", [LOCK]).catch(() => {});
  await client.end();
}
