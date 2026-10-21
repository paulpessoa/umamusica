# Prompt para continuar o trabalho

Cole o bloco abaixo numa nova sessão do Claude Code (web ou local, na raiz do repo `paulpessoa/umamusica`).

```text
Contexto: o 1Música (repo paulpessoa/umamusica) adotou o modelo "um amigo, uma música":
quem convida e o amigo convidado ganham 1 música grátis REAL (Lyria); Pix de R$ 1,00 segue
como opção. Em 21/10/2026 foram abertos 3 PRs, nesta ordem de merge:

1. PR #6 — branch claude/blissful-bardeen-hb0z75 (backend, server.ts)
   - shouldUseRealLyria(): saldo de indicação (bonus_balance_*) usa Lyria; flag FREE_SONGS_REAL_AUDIO
   - logCost de music_generation só quando a Lyria é chamada
   - POST /api/orders/:id/use-free-song (usar saldo em pedido pending_payment)
   - doc: docs/MODELO-UM-AMIGO-UMA-MUSICA.md
2. PR #7 — branch claude/amigo-uma-musica-frontend (frontend)
   - Checkout: botão "Usar minha música grátis" / card de convite
   - SuccessSection: feedback Gostei/Não gostei (feedback.category='song_rating') + CTA de convite
   - textos Home/Invite/FAQ; fix do token no feedback de exclusão (Menu.tsx)
3. PR #8 — branch claude/marketing-um-amigo-uma-musica (docs/marketing)
   - 10 posts (POSTS.md), artes (img/), GIFs (gif/), cronograma 03/11–31/12 (cronograma.html, README.md)
   - gerador: node docs/marketing/gerador/render.mjs [id]

Leia AGENTS.md, docs/PLANO-MELHORIAS.md e docs/MODELO-UM-AMIGO-UMA-MUSICA.md antes de mexer.

Tarefa agora:
a) Verifique o estado dos 3 PRs (CI, conflitos, comentários). Corrija o que estiver vermelho,
   validando com `npx tsc --noEmit`, `npm run build:server` e `npx vite build` antes de cada push.
b) Se algum PR ainda não existir ou a branch estiver incompleta, recrie a partir da descrição acima.
c) Próximos itens sugeridos (um PR pequeno para cada, só se eu aprovar):
   - anti-farm: creditar quem convidou só quando o amigo concluir a 1ª música
   - apply-coupon não verifica o status do pedido (pode reabrir um pedido completed)
   - migrar chamadas fetch manuais para apiFetch (item P3 pendente)
   - painel admin com contagem de cadastros por convite e taxa de "Gostei"
Responda em português, de forma objetiva, e me diga o que fez e o que ficou pendente.
```
