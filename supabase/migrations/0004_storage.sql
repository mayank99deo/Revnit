-- Storage. Family files are private and only leave through signed links issued
-- by /api/download after authorize_download() approves. Renders are public.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('family-files', 'family-files', false, 524288000),
  ('family-media', 'family-media', true, 10485760)
on conflict (id) do nothing;

create policy "Admin uploads catalog files" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('family-files', 'family-media') and public.is_admin());

create policy "Admin replaces catalog files" on storage.objects
  for update to authenticated
  using (bucket_id in ('family-files', 'family-media') and public.is_admin());

create policy "Admin deletes catalog files" on storage.objects
  for delete to authenticated
  using (bucket_id in ('family-files', 'family-media') and public.is_admin());

create policy "Admin lists catalog files" on storage.objects
  for select to authenticated
  using (bucket_id in ('family-files', 'family-media') and public.is_admin());
