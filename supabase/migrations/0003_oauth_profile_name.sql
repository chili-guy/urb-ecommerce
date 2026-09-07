-- =============================================================================
-- Ajuste do trigger de criação de profile para logins sociais (Google).
-- O Google manda o nome em raw_user_meta_data->>'full_name' (ou 'name').
-- Rode no SQL Editor DEPOIS de 0001_init.sql.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      ''
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
