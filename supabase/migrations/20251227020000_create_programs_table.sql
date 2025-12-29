-- Create programs table
create table public.programs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  source_url text not null,
  download_url text not null,
  is_active boolean default true,
  view_count integer default 0,
  download_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.programs enable row level security;

-- Policies
create policy "Enable read access for all users"
  on public.programs for select
  using (true);

create policy "Enable insert for admins only"
  on public.programs for insert
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.is_admin = true
    )
  );

create policy "Enable update for admins only"
  on public.programs for update
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.is_admin = true
    )
  );

create policy "Enable delete for admins only"
  on public.programs for delete
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.is_admin = true
    )
  );
