
-- Public bucket for organization logos
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

-- Anyone can read logos (public bucket)
create policy "Public read org logos"
on storage.objects for select
to public
using (bucket_id = 'org-logos');

-- Authenticated users can upload to their org folder
create policy "Members upload org logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'org-logos'
  and (storage.foldername(name))[1] = public.current_user_org()::text
);

create policy "Members update org logos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'org-logos'
  and (storage.foldername(name))[1] = public.current_user_org()::text
);

create policy "Members delete org logos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'org-logos'
  and (storage.foldername(name))[1] = public.current_user_org()::text
);
