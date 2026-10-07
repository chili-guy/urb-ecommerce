-- =============================================================================
-- UR3 — integração de estoque com a Bling (OAuth2 + sincronização de estoque)
-- (rode no SQL Editor DEPOIS de 0001..0007). Idempotente.
--
-- Os tokens da Bling ficam numa tabela sem NENHUMA policy de leitura/escrita
-- pra anon/authenticated — só a service_role (usada pelas Supabase Edge
-- Functions, nunca pelo navegador) consegue ler ou gravar aqui. O painel admin
-- só enxerga o status através da função bling_connection_status() abaixo, que
-- devolve só os campos não-sensíveis.
-- =============================================================================

create table if not exists public.bling_connection (
  id                smallint primary key default 1,
  access_token      text,
  refresh_token     text,
  token_expires_at  timestamptz,
  connected_at      timestamptz,
  connected_by      uuid references auth.users(id) on delete set null,
  last_synced_at    timestamptz,
  last_sync_status  text,
  last_sync_error   text,
  updated_at        timestamptz not null default now(),
  constraint bling_connection_singleton check (id = 1)
);

alter table public.bling_connection enable row level security;
-- Nenhuma policy criada de propósito: default é negar tudo pra anon/authenticated.

create or replace function public.bling_connection_status()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  result json;
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select json_build_object(
    'connected',      (access_token is not null),
    'connectedAt',    connected_at,
    'lastSyncedAt',   last_synced_at,
    'lastSyncStatus', last_sync_status,
    'lastSyncError',  last_sync_error
  ) into result
  from public.bling_connection where id = 1;

  return coalesce(result, json_build_object(
    'connected', false, 'connectedAt', null,
    'lastSyncedAt', null, 'lastSyncStatus', null, 'lastSyncError', null
  ));
end;
$$;

grant execute on function public.bling_connection_status() to authenticated;

create or replace function public.bling_disconnect()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.bling_connection where id = 1;
end;
$$;

grant execute on function public.bling_disconnect() to authenticated;
