-- =============================================================================
-- UR3 — acompanhamento da sincronização de estoque com a Bling
-- (rode no SQL Editor DEPOIS de 0008). Idempotente.
--
-- bling_stock_items: 1 linha por produto do site com o resultado da última
--   checagem (estoque no site x estoque na Bling, e se achou par pelo SKU).
-- bling_sync_runs: histórico das execuções ("conferir" ou "sincronizar").
-- Só a service_role (Edge Function) escreve; a equipe (is_staff) só lê.
-- =============================================================================

create table if not exists public.bling_stock_items (
  product_id        bigint primary key references public.products (id) on delete cascade,
  sku               text,
  status            text not null check (status in ('ok', 'not_found', 'no_sku', 'no_stock_info')),
  bling_product_id  bigint,
  bling_stock       integer,
  site_stock        integer,
  previous_stock    integer,
  applied           boolean not null default false,
  checked_at        timestamptz not null default now()
);

create table if not exists public.bling_sync_runs (
  id              bigint generated always as identity primary key,
  started_at      timestamptz not null default now(),
  mode            text not null check (mode in ('sync', 'check')),
  status          text not null check (status in ('ok', 'error')),
  products_total  integer,
  matched         integer,
  changed         integer,
  not_found       integer,
  bling_only      integer,
  zeroed          integer,
  error           text,
  triggered_by    uuid references auth.users (id) on delete set null
);

create index if not exists bling_sync_runs_started_idx on public.bling_sync_runs (started_at desc);

alter table public.bling_stock_items enable row level security;
alter table public.bling_sync_runs enable row level security;

drop policy if exists bling_stock_items_staff_read on public.bling_stock_items;
create policy bling_stock_items_staff_read on public.bling_stock_items
  for select using (public.is_staff());

drop policy if exists bling_sync_runs_staff_read on public.bling_sync_runs;
create policy bling_sync_runs_staff_read on public.bling_sync_runs
  for select using (public.is_staff());

revoke all on public.bling_stock_items, public.bling_sync_runs from anon, authenticated;
grant select on public.bling_stock_items, public.bling_sync_runs to authenticated;
