# Pendências / Notas

## Histórico de Compras (já implementado na UI)
A página `/historico-compras` já lista as compras do usuário, derivando o
meio de pagamento a partir do prefixo de `orders.payment_id`:
- `coupon_*` → Cupom de Presente
- `bonus_balance_*` → Saldo Grátis
- `pending_mp_*` → Pix (pendente)
- `pay_*` → Teste (aprovado)
- numérico puro → Pix (Mercado Pago)
- `mock*` / `simulated*` → Ambiente de Teste

**Melhoria futura (Supabase):** hoje o histórico é montado lendo a tabela
`orders`. Se quisermos filtros/relatórios mais robustos (valor pago, data de
pagamento, reembolsos), criar uma tabela dedicada, ex.:

```sql
create table purchases (
  id uuid primary key default gen_random_uuid(),
  order_id text references orders(id),
  user_email text,
  method text,           -- 'pix' | 'coupon' | 'free_balance' | 'test'
  amount numeric default 1.0,
  status text,           -- 'paid' | 'refunded' | 'pending'
  paid_at timestamptz,
  created_at timestamptz default now()
);
```

## Histórico de Chats (já implementado na UI)
A página `/historico-chats` lê `orders.chat_transcript` (já salvo em cada pedido).

## Revisar com IA
Botão em `/musica/:id` (música paga/concluída ou `failed_safety`) que chama
`POST /api/orders/:id/revise`: a IA limpa a letra conforme as regras do Google
Lyria (usando o contexto do chat) e regera o áudio.
