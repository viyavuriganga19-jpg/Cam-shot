
-- Drop broad public select on storage.objects, restrict to file-by-name access only
drop policy if exists "bills read public" on storage.objects;
-- Keep bucket publicly readable via direct URL (Supabase storage public URLs work regardless of policies for public buckets)
-- but disallow listing via API by not creating a select policy. For safety we still allow owners to read.
create policy "bills owner select" on storage.objects for select
  using (bucket_id = 'bills' and auth.uid()::text = (storage.foldername(name))[1]);

-- Restrict signup trigger function execute
revoke execute on function public.handle_new_user() from public, anon, authenticated;
