// Runs the migrations and seeds in PGlite (Postgres in WebAssembly) with stand-ins for
// Supabase's auth and storage schemas, then exercises the flows the app depends on.
//   npm run test:db
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const db = new PGlite({ extensions: { pg_trgm } });
const sql = (f) => readFileSync(`${ROOT}/supabase/${f}`, "utf8");

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
};
const q = async (text, params) => (await db.query(text, params)).rows;
const as = async (role, uid, fn) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
};
const fails = async (fn) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return e.message;
  }
};

// Supabase-like environment ----------------------------------------------------
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema extensions; create schema auth; create schema storage;
  grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);

for (const f of ["migrations/0001_schema.sql", "migrations/0002_functions.sql", "migrations/0003_policies.sql", "migrations/0004_storage.sql", "seed.sql", "seed-demo.sql"]) {
  const err = await fails(() => db.exec(sql(f)));
  check(`apply ${f}`, !err, err ?? "");
  if (err) process.exit(1);
}

// Search -----------------------------------------------------------------------
const search = (args) =>
  q(`select slug, total_count from public.search_families(p_query => $1, p_category => $2, p_revit => $3, p_price => $4, p_sort => $5)`, [
    args.q ?? null, args.category ?? null, args.revit ?? null, args.price ?? null, args.sort ?? "relevance",
  ]);

let r = await as("anon", null, () => search({}));
check("all published families listed", r.length === 20, `${r.length}`);
r = await as("anon", null, () => search({ q: "cable tr" }));
check("prefix search 'cable tr'", r.some((x) => x.slug === "ladder-cable-tray-fittings"), r.map((x) => x.slug).join(","));
r = await as("anon", null, () => search({ q: "trasformer" }));
check("typo 'trasformer' finds the transformer", r[0]?.slug === "oil-distribution-transformer", r.map((x) => x.slug).join(","));
r = await as("anon", null, () => search({ q: "db" }));
check("tag search 'db'", r[0]?.slug === "tpn-distribution-board", r.map((x) => x.slug).join(","));
r = await as("anon", null, () => search({ category: "lighting" }));
check("category filter", r.length === 5, `${r.length}`);
r = await as("anon", null, () => search({ revit: 2021 }));
check("opens in Revit 2021 (min version <= 2021)", r.every((x) => x) && r.length > 0 && !r.some((x) => x.slug === "busbar-trunking-run"), `${r.length}`);
r = await as("anon", null, () => search({ price: "paid", sort: "price_asc" }));
check("paid filter sorted by price", r[0]?.slug === "led-high-bay" && r.at(-1)?.slug === "main-lv-panel-pcc" && r.length === 8, r.map((x) => x.slug).join(","));
r = await as("anon", null, () => q(`select * from public.suggest('downl')`));
check("suggest 'downl'", r.some((x) => x.slug === "recessed-led-downlight"), r.map((x) => x.label).join(" | "));

// Members ------------------------------------------------------------------------
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";
await q(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'a@x.com', '{"full_name":"Asha"}'), ($2, 'b@x.com', '{}'), ($3, 'nitish@x.com', '{}')`, [U1, U2, ADMIN]);
r = await q(`select count(*)::int as n from public.profiles`);
check("profiles created by trigger", r[0].n === 3);
await q(`update public.profiles set role = 'admin' where id = $1`, [ADMIN]);

let err = await as("authenticated", U1, () => fails(() => q(`update public.profiles set role = 'admin' where id = $1`, [U1])));
check("member cannot make themselves admin", Boolean(err), err ?? "update succeeded");
err = await as("authenticated", U1, () => fails(() => q(`update public.profiles set full_name = 'Asha K' where id = $1`, [U1])));
check("member can edit their name", !err, err ?? "");

await as("authenticated", U1, () => q(`select public.log_search('IP65 junction box', 0, '{}')`));
await as("authenticated", U1, () => q(`select public.log_search('ip65   junction box', 0, '{}')`));
await as("anon", null, () => q(`select public.log_search('ip65 junction box', 0, '{}')`));
r = await q(`select count(*)::int as n from public.searches where normalized = 'ip65 junction box'`);
check("searches logged, repeat by same member deduped", r[0].n === 2, `${r[0].n}`);
r = await as("authenticated", U1, () => q(`select count(*)::int as n from public.searches`));
check("members can't read the search log", r[0].n === 0);
err = await as("authenticated", U1, () => fails(() => q(`select public.studio_overview(30)`)));
check("studio_overview forbidden to members", err?.includes("forbidden"), err ?? "");
r = await as("authenticated", ADMIN, () => q(`select * from public.studio_search_demand(30, true)`));
check("studio search demand shows unmatched query", r[0]?.query === "ip65 junction box" && Number(r[0].unmatched) === 2, JSON.stringify(r[0]));

// Requests -------------------------------------------------------------------------
const [{ id: reqId }] = await as("authenticated", U1, () =>
  q(`insert into public.requests (user_id, title) values ($1, 'IP65 junction box') returning id`, [U1]),
);
await as("authenticated", U2, () => q(`insert into public.request_votes (request_id, user_id) values ($1, $2)`, [reqId, U2]));
r = await q(`select votes_count from public.requests where id = $1`, [reqId]);
check("requester auto-votes, second vote counted", r[0].votes_count === 2, `${r[0].votes_count}`);
err = await as("authenticated", U1, () => fails(() => q(`update public.requests set status = 'shipped' where id = $1 returning id`, [reqId]).then((rows) => { if (!rows.length) throw new Error("no rows updated"); })));
check("members can't change request status", Boolean(err), err ?? "");
await as("authenticated", ADMIN, () => q(`update public.requests set status = 'planned' where id = $1`, [reqId]));
r = await q(`select user_id from public.notifications where kind = 'request'`);
check("status change notifies requester and voter", r.length === 2, `${r.length}`);
err = await as("authenticated", U1, () => fails(() => q(`insert into public.requests (user_id, title, status) values ($1, 'Sneaky', 'shipped')`, [U1])));
check("members can't file pre-shipped requests", Boolean(err), err ?? "");

// Downloads ----------------------------------------------------------------------
const free = (await q(`select ff.id, f.id as family_id, f.updated_at from public.family_files ff join public.families f on f.id = ff.family_id where f.slug = 'recessed-led-downlight' and ff.kind = 'rfa' limit 1`))[0];
const paid = (await q(`select ff.id, f.id as family_id from public.family_files ff join public.families f on f.id = ff.family_id where f.slug = 'tpn-distribution-board' and ff.kind = 'rfa' limit 1`))[0];

err = await as("anon", null, () => fails(() => q(`select * from public.authorize_download($1)`, [free.id])));
check("anonymous download refused", err?.includes("sign_in_required"), err ?? "");
r = await as("authenticated", U1, () => q(`select * from public.authorize_download($1)`, [free.id]));
check("free download authorised", r[0]?.storage_path?.startsWith(free.family_id), JSON.stringify(r[0]));
r = await q(`select downloads_count, updated_at from public.families where id = $1`, [free.family_id]);
check("download counted", r[0].downloads_count === 3413, `${r[0].downloads_count}`);
check("counter update doesn't touch updated_at", String(r[0].updated_at) === String(free.updated_at));
err = await as("authenticated", U1, () => fails(() => q(`select * from public.authorize_download($1)`, [paid.id])));
check("paid download needs purchase", err?.includes("purchase_required"), err ?? "");

// Payments -----------------------------------------------------------------------
const [{ id: orderId }] = await q(`insert into public.orders (user_id, amount_paise, razorpay_order_id) values ($1, 79900, 'order_TEST') returning id`, [U1]);
await q(`insert into public.order_items (order_id, family_id, price_paise) values ($1, $2, 79900)`, [orderId, paid.family_id]);
err = await as("authenticated", U1, () => fails(() => q(`select public.fulfil_order('order_TEST', 'pay_X')`)));
check("members can't call fulfil_order", Boolean(err), err ?? "");
await as("service_role", null, () => q(`select public.fulfil_order('order_TEST', 'pay_1')`));
await as("service_role", null, () => q(`select public.fulfil_order('order_TEST', 'pay_1')`));
r = await q(`select count(*)::int as n from public.entitlements where user_id = $1`, [U1]);
check("payment grants entitlement", r[0].n === 1);
r = await q(`select count(*)::int as n from public.notifications where kind = 'order'`);
check("fulfil_order is idempotent", r[0].n === 1, `${r[0].n} order notifications`);
r = await as("authenticated", U1, () => q(`select * from public.authorize_download($1)`, [paid.id]));
check("owner can download paid family", r.length === 1);
r = await as("authenticated", U2, () => q(`select count(*)::int as n from public.orders`));
check("other members can't see the order", r[0].n === 0);

// Updates and follows ------------------------------------------------------------
await as("authenticated", ADMIN, () => q(`insert into public.family_changelog (family_id, version_label, notes) values ($1, '1.3', 'Added Revit 2026')`, [free.family_id]));
r = await q(`select user_id, title from public.notifications where kind = 'update'`);
check("new version notifies downloaders", r.length === 1 && r[0].user_id === U1, JSON.stringify(r));
r = await q(`select version_label, version_updated_at is not null as set from public.families where id = $1`, [free.family_id]);
check("version label and release time recorded", r[0].version_label === "1.3" && r[0].set);

const lighting = (await q(`select id from public.categories where slug = 'lighting'`))[0].id;
await as("authenticated", U2, () => q(`insert into public.category_watches (user_id, category_id) values ($1, $2)`, [U2, lighting]));
const [{ id: draftId }] = await as("authenticated", ADMIN, () =>
  q(`insert into public.families (slug, name, category_id) values ('bulkhead-light', 'Bulkhead light', $1) returning id`, [lighting]),
);
r = await as("authenticated", U2, () => q(`select count(*)::int as n from public.families where id = $1`, [draftId]));
check("drafts hidden from members", r[0].n === 0);
await as("authenticated", ADMIN, () => q(`update public.families set status = 'published' where id = $1`, [draftId]));
r = await q(`select title from public.notifications where kind = 'new_family' and user_id = $1`, [U2]);
check("publishing notifies category followers", r[0]?.title === "New in Lighting: Bulkhead light", r[0]?.title ?? "none");

await as("authenticated", ADMIN, () => q(`update public.families set status = 'archived' where id = $1`, [free.family_id]));
r = await as("authenticated", U1, () => q(`select count(*)::int as n from public.families where id = $1`, [free.family_id]));
const r2 = await as("authenticated", U2, () => q(`select count(*)::int as n from public.families where id = $1`, [free.family_id]));
check("archived family stays visible to its downloader only", r[0].n === 1 && r2[0].n === 0);
r = await as("authenticated", U1, () => q(`select count(*)::int as n from public.family_files where family_id = $1`, [free.family_id]));
check("downloader still sees archived family's files", r[0].n > 0);

// Studio -----------------------------------------------------------------------
r = await as("authenticated", ADMIN, () => q(`select public.studio_overview(30) as o`));
check("studio overview", r[0].o.downloads === 2 && r[0].o.revenue_paise === 79900, JSON.stringify(r[0].o));
r = await as("authenticated", ADMIN, () => q(`select * from public.studio_daily_activity(30)`));
check("daily activity has 30 days", r.length === 30, `${r.length}`);
r = await as("authenticated", ADMIN, () => q(`select * from public.studio_top_families(30, 5)`));
check("top families", r.length === 5);

// API-shaped reads (what PostgREST embeds rely on) ---------------------------------
r = await as("anon", null, () => q(`select c.slug, (select count(*) from public.families f where f.category_id = c.id and f.status = 'published')::int as n from public.categories c order by sort_order`));
check("category counts", r.find((x) => x.slug === "lighting").n === 5, JSON.stringify(r.slice(0, 3)));

console.log(failures ? `\n${failures} FAILED` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
