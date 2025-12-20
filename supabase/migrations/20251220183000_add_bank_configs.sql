create table if not exists bank_configs (
  id uuid default gen_random_uuid() primary key,
  bank_id text not null,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table bank_configs enable row level security;

create policy "Enable read access for all users" on bank_configs
  for select using (true);

create policy "Enable write access for authenticated users" on bank_configs
  for all using (auth.role() = 'authenticated');
