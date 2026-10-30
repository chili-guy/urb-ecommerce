# Edge Functions

Projeto Supabase: `oglvswnmvsfzqnwjmkwi`. Código compartilhado em `_shared/` (módulos puros, sem acesso ao banco, ficam fáceis de testar).

| Função | Quem chama | JWT | O que faz |
| --- | --- | --- | --- |
| `shipping-quote` | site (qualquer visitante) | não | Cota frete real na Melhor Envio a partir do CEP e dos produtos (peso/medidas do cadastro) |
| `checkout-pay` | site (cliente logado) | sim | Cria o pedido, reserva estoque, recalcula preço/frete/cupom no servidor e cobra no Asaas (Pix ou cartão) |
| `asaas-webhook` | Asaas | não (valida o token) | Confirma/cancela/estorna o pedido conforme o pagamento muda no Asaas |
| `order-refund` | painel admin | sim (só administrador) | Estorno total de um pedido pago: pede ao Asaas, cancela o pedido e devolve (ou não) os itens ao estoque |
| `bling-oauth-callback` | Bling | não | Conclui a conexão OAuth com a Bling |
| `bling-sync-stock` | painel admin | sim (staff) | Sincroniza estoque da Bling |
| `bling-import` | painel admin | sim (staff) | Importa produtos da Bling (um ou em lote) |

## Secrets

Configure com `npx supabase secrets set "NOME=valor" --project-ref oglvswnmvsfzqnwjmkwi`. Nunca coloque no repositório.

| Secret | Obrigatório | Para quê |
| --- | --- | --- |
| `BLING_CLIENT_ID`, `BLING_CLIENT_SECRET` | sim (Bling) | OAuth da Bling |
| `ADMIN_REDIRECT_URL` | não | Para onde voltar depois de conectar a Bling (padrão `https://ur3.com.br/admin`) |
| `MELHORENVIO_TOKEN` | sim (frete) | Token de acesso da Melhor Envio |
| `SHIPPING_ORIGIN_CEP` | sim (frete) | CEP de onde a loja despacha (8 dígitos) |
| `SHIPPING_CONTACT_EMAIL` | sim (frete) | E-mail de contato enviado no `User-Agent` (exigência da Melhor Envio) |
| `MELHORENVIO_ENV` | não | `sandbox` para testar; qualquer outro valor = produção |
| `ASAAS_API_KEY` | sim (pagamento) | Chave de API do Asaas |
| `ASAAS_WEBHOOK_TOKEN` | sim (pagamento) | Valor aleatório; o mesmo texto vai no campo "Token de autenticação" do webhook no Asaas |
| `ASAAS_ENV` | não | `sandbox` ou `production`. Sem ele, a chave `$aact_hmlg_...` é tratada como sandbox |

Sem as configurações de frete, `shipping-quote` responde 503 e o site avisa o cliente. Sem frete ou sem a chave do Asaas, `checkout-pay` recusa com 503 antes de criar qualquer pedido.

## Deploy

```bash
npx supabase functions deploy shipping-quote --no-verify-jwt --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy asaas-webhook --no-verify-jwt --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy checkout-pay --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy order-refund --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy bling-import --project-ref oglvswnmvsfzqnwjmkwi
npx supabase functions deploy bling-sync-stock --project-ref oglvswnmvsfzqnwjmkwi
```

## Webhook do Asaas

Em Integrações > Webhooks, crie um webhook de cobranças:

- URL: `https://oglvswnmvsfzqnwjmkwi.supabase.co/functions/v1/asaas-webhook`
- Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_REPROVED_BY_RISK_ANALYSIS`

O webhook é idempotente (eventos repetidos ficam registrados em `payment_events` e ignorados).

## Parcelamento

O limite de parcelas sem juros e a parcela mínima ficam em `store_settings` (chave `installments`) e se mudam no painel, em **Pagamentos** (só administrador). Padrão: até 6x e R$ 5,00. O `checkout-pay` confere o número de parcelas contra essa regra no servidor; o navegador só mostra as opções. A taxa do parcelamento é descontada da loja pelo Asaas.

## Estorno

No painel, em Pedidos → detalhes do pedido pago → **Estornar pagamento** (só administrador). O pedido vira Cancelado + Reembolsado e sai da receita. O estoque só volta se a opção estiver marcada (não marque quando o produto não existe mais). Pelo painel não dá para cancelar um pedido já pago sem estornar (o banco recusa). Estorno feito direto no Asaas também cancela o pedido pelo webhook, mas não mexe no estoque.

## Pedidos e estoque

- O pedido nasce `Aguardando pagamento` e o estoque fica reservado: 30 min (Pix) ou 120 min (cartão).
- Pagamento confirmado → `Pedido confirmado`. Prazo vencido, recusa ou cancelamento → `Cancelado` e o estoque volta.
- Pagamento que chega depois do cancelamento reativa o pedido se ainda houver estoque; senão fica marcado no pedido para reembolso manual.
- `expire_unpaid_orders()` roda a cada chamada de `checkout-pay`. Opcionalmente agende no `pg_cron` (exemplo comentado no fim da migration `0010`).
