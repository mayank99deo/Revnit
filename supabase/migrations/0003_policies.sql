-- Row level security. Members see the published catalog and their own records;
-- the admin (Nitish) manages everything. Payments and downloads are written by
-- security definer functions or the server's service role.

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.families enable row level security;
alter table public.family_files enable row level security;
alter table public.family_changelog enable row level security;
alter table public.downloads enable row level security;
alter table public.saves enable row level security;
alter table public.category_watches enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.entitlements enable row level security;
alter table public.requests enable row level security;
alter table public.request_votes enable row level security;
alter table public.searches enable row level security;
alter table public.notifications enable row level security;

-- Profiles: members can edit their own details but never their role.
create policy "Read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "Update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from anon, authenticated;
grant update (full_name, company, job_title, notify_email) on public.profiles to authenticated;

-- Catalog.
create policy "Anyone reads categories" on public.categories for select using (true);
create policy "Admin manages categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy "Anyone reads published families" on public.families
  for select using (
    status = 'published'
    or public.is_admin()
    or (status = 'archived' and public.has_family(id))
  );
create policy "Admin manages families" on public.families
  for all using (public.is_admin()) with check (public.is_admin());

-- Files and changelogs follow their family's visibility (the subquery runs under families' policy).
create policy "Read files of visible families" on public.family_files
  for select using (exists (select 1 from public.families f where f.id = family_id));
create policy "Admin manages files" on public.family_files
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Read changelog of visible families" on public.family_changelog
  for select using (exists (select 1 from public.families f where f.id = family_id));
create policy "Admin manages changelog" on public.family_changelog
  for all using (public.is_admin()) with check (public.is_admin());

-- Member activity.
create policy "Read own downloads" on public.downloads
  for select using (user_id = auth.uid() or public.is_admin());

create policy "Read own saves" on public.saves for select using (user_id = auth.uid());
create policy "Add own saves" on public.saves for insert with check (user_id = auth.uid());
create policy "Remove own saves" on public.saves for delete using (user_id = auth.uid());

create policy "Read own watches" on public.category_watches for select using (user_id = auth.uid());
create policy "Add own watches" on public.category_watches for insert with check (user_id = auth.uid());
create policy "Remove own watches" on public.category_watches for delete using (user_id = auth.uid());

-- Commerce (writes happen server-side with the service role).
create policy "Read own orders" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
create policy "Read own order items" on public.order_items
  for select using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
create policy "Read own entitlements" on public.entitlements
  for select using (user_id = auth.uid() or public.is_admin());

-- Demand board is public; members file requests and vote.
create policy "Anyone reads requests" on public.requests for select using (true);
create policy "Members file requests" on public.requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'open' and family_id is null and status_note is null);
create policy "Admin manages requests" on public.requests
  for update using (public.is_admin()) with check (public.is_admin());
create policy "Admin deletes requests" on public.requests
  for delete using (public.is_admin());

create policy "Read own votes" on public.request_votes for select using (user_id = auth.uid());
create policy "Cast own vote" on public.request_votes for insert to authenticated with check (user_id = auth.uid());
create policy "Withdraw own vote" on public.request_votes for delete using (user_id = auth.uid());

-- Searches are written through log_search() and read only in the studio.
create policy "Admin reads searches" on public.searches for select using (public.is_admin());

create policy "Read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "Mark own notifications read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;
