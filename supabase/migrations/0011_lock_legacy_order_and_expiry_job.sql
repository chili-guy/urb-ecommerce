-- 0011 — desliga o create_order antigo e agenda a limpeza de pedidos vencidos.
-- Pode rodar mais de uma vez. Rode depois da 0010 (o checkout novo já não usa o create_order).

-- ---------------------------------------------------------------------------
-- 1. create_order (0002/0005) deixa de ser chamável pelo site.
--    Ele aceitava qualquer visitante, confiava no preço do frete mandado pelo
--    navegador, criava o pedido já como "Pedido confirmado" sem pagamento e
--    baixava o estoque. Quem cria pedido agora é a Edge Function checkout-pay,
--    que usa create_checkout_order (só service_role).
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.create_order(jsonb, jsonb, text, text, text, text)') is not null then
    revoke execute on function public.create_order(jsonb, jsonb, text, text, text, text)
      from public, anon, authenticated;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Limpeza automática: a cada 5 minutos cancela pedidos cujo prazo de
--    pagamento venceu e devolve o estoque reservado. Sem isso a limpeza só
--    acontece quando alguém faz um novo checkout ou o Asaas avisa de um evento.
--    Se o pg_cron não estiver disponível neste projeto, só avisa e segue.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron indisponível: a limpeza de pedidos vencidos continua só por evento (checkout e webhook).';
    return;
  end if;
  create extension if not exists pg_cron;
  perform cron.schedule('expire-unpaid-orders', '*/5 * * * *', 'select public.expire_unpaid_orders()');
exception when others then
  raise notice 'não consegui agendar a limpeza (%). Ative a extensão pg_cron em Database > Extensions e rode de novo.', sqlerrm;
end
$$;
