# Revnit

A store for Nitish's electrical Revit families. Some are free and need a free account, some are exclusive and paid. Members search, download, buy and request families. Nitish publishes from a private studio and can see what people searched for and didn't find.

Built with Next.js 16 (App Router), Supabase (Postgres, Auth, Storage) and Razorpay.

## Run it locally

```bash
npm install
npm run dev
```

With no environment variables the site runs read-only on a bundled sample catalog of 20 families (`src/lib/data/sample-catalog.ts`). You can browse, search, filter and open family pages. Sign-in, downloads, payments and the studio need Supabase.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com). Choose the Mumbai region if most buyers are in India.
2. Set up the database. The quickest way is one paste: run `npm run db:sql`, open the `supabase/setup.sql` it writes, copy all of it, paste into **SQL Editor → New query**, and press **Run**. That file is the four migrations plus the categories, in order.

   Or run these files one at a time, in order:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_functions.sql`
   3. `supabase/migrations/0003_policies.sql`
   4. `supabase/migrations/0004_storage.sql`
   5. `supabase/seed.sql` (the 13 categories)

   With the Supabase CLI, `supabase db push` runs the migrations for you.
   `supabase/seed-demo.sql` loads the sample families for a staging project. Its files are placeholders, so don't run it in production.
3. **Authentication → URL Configuration**: set Site URL to your domain. Add `https://<your-domain>/**` and `http://localhost:3000/**` to Redirect URLs (the wildcard covers `/auth/callback` with its return path).
4. **Authentication → Sign In / Providers → Google**: in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an OAuth client (type Web application) with the authorised redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, then paste its client ID and secret here and enable the provider.
5. **Authentication → Emails → SMTP Settings**: connect a real sender such as [Resend](https://resend.com). Supabase's built-in sender only delivers to your own team, a few emails an hour, so sign-in links won't reach the public without this. Google sign-in works either way.
6. Copy `.env.example` to `.env.local` and fill in the three Supabase values from **Project Settings → API**.
7. Sign in once with Nitish's email, then make that account the admin:

   ```sql
   update public.profiles set role = 'admin' where email = 'nitish@example.com';
   ```

   The **Studio** link then appears in his account menu.

If the deployed site fails with `Could not find the table 'public.requests'` or `Could not find the function public.search_families` in Vercel's logs, the database hasn't been set up: run step 2 against the same Supabase project whose URL is in Vercel's environment variables.

File size: Supabase's free plan caps uploads at 50 MB per file. Most `.rfa` files are well under that. The Pro plan raises it to the 500 MB the bucket allows.

## Connect Razorpay

1. Create an account at [razorpay.com](https://razorpay.com) and start in **Test mode**.
2. **Settings → API Keys**: put the key ID in `NEXT_PUBLIC_RAZORPAY_KEY_ID` and the secret in `RAZORPAY_KEY_SECRET`.
3. **Settings → Webhooks**: add `https://<your-domain>/api/webhooks/razorpay` with the `payment.captured` event, and put its secret in `RAZORPAY_WEBHOOK_SECRET`. This records payments even when a buyer closes the tab before the browser confirms.
4. Switch to live keys after Razorpay approves the account (KYC).

Until the keys are set, the cart shows that payments aren't switched on.

## Email (optional)

With `RESEND_API_KEY` set (from [resend.com](https://resend.com), after verifying your sending domain), members who leave email updates on are emailed when:
- a family they downloaded or bought gets a new version
- a family is published in a category they follow
- a request they made or voted for changes status
- their payment is confirmed

Without it, the same messages still appear on their notifications page and as a dot on their account button.

## Deploy

Push to GitHub and import the repository in [Vercel](https://vercel.com). Connecting Supabase through Vercel's Supabase integration sets the database and Supabase variables for you; add the Razorpay and Resend ones yourself. `NEXT_PUBLIC_SITE_URL` is only needed for a custom domain: on Vercel the production domain is detected.

Every build first runs `scripts/migrate.mjs`, which applies any SQL files in `supabase/migrations` the database hasn't had yet (each once, in a transaction) and refreshes the categories. Shipping a schema change is just adding a numbered file and deploying. A failing migration fails the build, so the site never runs against a half-migrated database. Locally, `npm run db:migrate` does the same using `DATABASE_URL` from `.env.local`.

## How Nitish publishes a family

1. **Studio → New family**: name it and pick a category. It's created as a draft that only he can see.
2. Drop the `.rfa` files (one per Revit release) and the type catalog `.txt` onto the Files panel. The Revit version is read from each file, and the type catalog fills the Types section automatically.
3. Fill in the summary, description, search tags and price (0 means free). Buyers only see the amount once the family is in their cart; listings and the family page show Free or Exclusive. Add parameters. Matching type catalog columns override their values when a buyer picks a type on the family page.
4. Upload a render, or pick one of the line drawings.
5. **Publish**. Members following that category are notified.

To release a new version, upload the new files, then use **Ship an update**. Everyone who downloaded or bought the family is notified, and their library marks it as updated.

Removing a family that nobody has downloaded deletes it. Otherwise it's archived: it leaves the catalog but stays downloadable for the people who already have it.

## The demand loop

- Every search is logged (repeats by the same member within 10 minutes are ignored). **Studio → Search demand** lists what people searched for and didn't find, with a **Start family** link that creates a draft with that name.
- A search with no results offers a one-click request, prefilled with what they typed.
- On the request board, members vote. Moving a request to Planned, Modelling or Published in **Studio → Requests** notifies everyone who voted. Marking it Published requires linking the family, and the notification links straight to it.

## How it's built

```
src/app/                 Pages and API routes
  page.tsx               Home: search, the system diagram, new and popular families, requests
  families/              Catalog and family pages
  categories/[slug]/     Category pages (same catalog view)
  requests/              Request board
  cart/                  Cart and Razorpay checkout
  account/               Library, saved, notifications, orders, settings
  studio/                Nitish's admin area (404 for everyone else)
  api/download/[fileId]  Checks access in the database, then redirects to a 60-second signed link
  api/checkout/          Creates orders with prices read from the database, verifies payments
  api/webhooks/razorpay  Payment backup path
src/lib/data/            All data access. catalog.ts switches between Supabase and the sample catalog
src/lib/revit-files.ts   Revit version detection and type catalog parsing
src/components/          UI, including the line drawings and the single-line diagram
supabase/                Migrations and seeds
scripts/                 Seed generator and database tests
```

The rules live in the database rather than the app: row level security decides who sees what, `authorize_download()` decides who can download, `fulfil_order()` unlocks purchases (only the server's service role can call it), and triggers keep counters and notifications in step. Paid files sit in a private bucket and are only reachable through short-lived signed links.

## Checks

```bash
npm run typecheck   # TypeScript
npm run test:db     # applies every migration and seed in an in-memory Postgres, then tests
                    # search, requests, notifications, downloads, payments and access rules
npm run build
```

`npm run seed:demo` regenerates `supabase/seed.sql` and `supabase/seed-demo.sql` from `src/lib/taxonomy.ts` and the sample catalog. To add a category, add it to `taxonomy.ts`, run that, then run the new `seed.sql`.

## Before launch

- Replace Nitish's bio in `src/lib/site.ts` with his own words, and set the contact email there.
- Have the terms on `/license` reviewed. They're a plain-language starting point, not legal advice.
- Add a privacy policy. The site stores members' emails, downloads and searches.
- Check with an accountant whether GST applies to your sales and how invoices should be issued.
