# Modelo "Um amigo, uma música"

> Decisão de produto (out/2026): até o fim do ano o 1Música cresce por **indicação**,
> não por venda. Cada amigo que entra = uma música grátis. Pagar (R$ 1,00 via Pix)
> continua disponível para quem não quer esperar ou quer mais músicas.

## Como funciona

```
Você ──(link /convite/SEU_CODIGO)──► Amigo cria conta (OTP)
   │                                      │
   └─ +1 música grátis (até 5/mês)        └─ +1 música grátis na hora
```

| Quem | Ganha | Onde está no código |
|---|---|---|
| Amigo convidado | 1 música ao criar a conta | `server.ts` → `/api/verify-otp` (`initialBalance = 1`) |
| Quem convidou | 1 música por amigo, máx. 5/mês | `server.ts` → `increment_free_songs` RPC |
| Checkout | Usa saldo grátis antes de pedir Pix | `server.ts` → `/api/checkout` (`consume_free_song`) |

## O que mudou nesta rodada

1. **Música grátis agora é real.** Antes, pedidos pagos com saldo (`payment_id = bonus_balance_*`)
   recebiam o MP3 de demonstração (`assets/examples/*.mp3`) — o "prêmio" da indicação
   era uma música genérica. Agora usam a Lyria de verdade.
   - Função: `shouldUseRealLyria()` em `server.ts`.
   - Desligar (volta para o demo): `FREE_SONGS_REAL_AUDIO=FALSE` no Render.
2. **Custo do demo não é mais contabilizado.** `logCost(stage=music_generation)` só roda quando
   a Lyria é chamada de fato — o `/admin/custos` deixa de mostrar R$ 0,20 fantasma por cupom/demo.

Cupons (`coupon_*`) e pagamentos simulados continuam no demo, de propósito.

## Custo esperado

- Lyria ≈ **R$ 0,20/música**. Cada indicação válida gera até **2 músicas** (amigo + quem indicou)
  → custo máximo ≈ **R$ 0,40 por amigo novo**.
- Teto natural por usuário: 5 bônus/mês → ≈ R$ 1,00/mês de custo por "super indicador".
- Exemplo: 300 cadastros via indicação em 2 meses → ≈ R$ 120 de Lyria (pior caso, todos usam o saldo).

## Riscos e próximos passos

- **Farm de contas:** o bônus é dado no cadastro (só exige OTP de e-mail). Alguém pode criar e-mails
  descartáveis para acumular saldo. Mitigação já existente: limite de 5/mês por quem indica.
  Próximo passo se o custo subir: só creditar quem indicou quando o amigo **concluir a primeira
  música**, ou bloquear domínios de e-mail descartável.
- **Monitorar** em `/admin/custos` o volume de `music_generation` semanalmente durante a campanha.
