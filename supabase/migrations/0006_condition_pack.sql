-- =============================================================================
-- UR3 — condição do produto (rode no SQL Editor DEPOIS de 0001..0005)
--
-- Pedido do cliente: etiquetar produtos como novo / seminovo / usado — hoje é
-- a linha principal de vendas dele e não havia como sinalizar isso na loja.
-- Idempotente.
-- =============================================================================

alter table public.products
  add column if not exists condition text not null default 'novo';

alter table public.products drop constraint if exists products_condition_check;
alter table public.products add constraint products_condition_check
  check (condition in ('novo', 'seminovo', 'usado'));

create index if not exists products_condition_idx on public.products (condition);
