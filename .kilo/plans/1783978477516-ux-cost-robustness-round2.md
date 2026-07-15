# Plano: 1Música — UX, Custo, Robustez e Crescimento (rodada 2)

## Contexto / estado atual

- **Chips de opções no chat**: já existem (`ChatSection.tsx:366-383`) mas só na última mensagem AI e a IA raramente emite o marcador `[OPCOES: ...]`. Ação = instruir a IA + manter render.
- **Mini-player**: `stop()` pausa mas NÃO limpa `currentTrack`, então o `MiniPlayer` nunca some (bug "não fecha"). Faltam botões de skip ±10s (volume já existe).
- **Nenhuma ferramenta de analytics/clarity instalada** (grep vazio). Consumo de IA é registrado server-side em `cost_logs` e exibido apenas em **`/admin/custos`**.
- **Cupom → 500**: quase certamente o novo passo `compose-lyrics` batendo em erro de IA (quota/safety) e retornando 500; o pedido reverte para `paid`, então um reload retentou (sequência "bugada"). Precisa de UI de retry + garantir que a tabela `cost_logs` exista.
- **Deploy**: push já dispara Vercel (front) e GitHub Action → Cloud Run (back). Risco de skew de versão durante o deploy (front novo chama endpoint que o back antigo ainda não tem).

## Decisões confirmadas com o usuário

- Incluir **ambos** os itens maiores como MVP: **retomar conversa do histórico** e **karaoke (destaque de letra)**.

## Tarefas (ordem de execução)

### 1. Mini-player: fechar de verdade + skip + volume

- `src/contexts/PlayerContext.tsx`: adicionar `dismiss()` que zera `currentTrack` (e pausa o áudio) para esconder o `MiniPlayer`; adicionar `skip(delta: number)` que faz `audio.currentTime = clamp(currentTime+delta, 0, duration)`.
- `src/components/MiniPlayer.tsx`: o botão **X** chama `dismiss()` (some de fato); adicionar botões **−10s / +10s** usando `skip`; manter play/pause e o slider de volume.
- Risco: nenhum. Validação: tocar uma música, abrir Minhas Músicas, fechar o player (sai da tela), skip funciona.

### 2. Karaoke MVP (destaque de linha sincronizado, sem LRC)

- `src/components/AudioPlayer.tsx`: no render das letras, dividir em linhas; calcular `linhasAtivas = linhas.filter(non-vazias)`; `duracaoPorLinha = duration / linhasAtivas.length`; linha atual = `floor(currentTime / duracaoPorLinha)`; destacar (cor `#FF5A5F`, negrito, leve scale) a linha atual com transição suave. Usar `player.currentTime`/`player.duration` do contexto.
- É aproximado (sem timestamps reais). Validar: durante a reprodução a linha "cantada" acende progressivamente.
- (Opcional, fora do MVP se der trabalho: enviar LRC real do Lyria no futuro.)

### 3. Chips de opções no chat

- `server.ts` (`/api/chat` systemInstruction): regra explícita — "Quando oferecer escolhas ao usuário, termine a resposta com `[OPCOES: "Opção A" | "Opção B" | "Opção C"]` (máx 4, curtas)". Manter `parseAiResponse` existente.
- `ChatSection.tsx`: manter render de chips (já existe); garantir que `disabled` respeite `isTyping`/`isRecording`. Opcional: mostrar chips também em mensagens AI não-finais que tenham `options` (hoje só `index === last`). Manter só na última para não poluir.

### 4. Vercel cache bust a cada deploy

- `vercel.json`: adicionar `headers`:
  - `source: "/"` e `source: "/index.html"` → `Cache-Control: no-cache, no-store, must-revalidate` (força HTML novo a cada deploy, que referencia JS com hash novo).
  - `source: "/assets/(.*)"` → `Cache-Control: public, max-age=31536000, immutable` (assets já têm hash; cache longo ok).
- Observação: o skew Vercel↔Cloud Run durante o deploy persiste; anotar nos commits e considerar um `wait` no futuro. Validação: após deploy, hard refresh mostra novo comportamento sem cache antigo.

### 5. Robustez do fluxo pós-pagamento / 500

- `src/components/SuccessSection.tsx` (`composeLyrics`): em falha, mostrar mensagem + botão **"Tentar novamente"** que chama `composeLyrics()` de novo (resetar `composedRef` nesse caso) em vez de travar no loader.
- `supabase/migrations/0005_cost_logs.sql` (já criado): **executar no SQL editor do Supabase** (não aplicado automaticamente). `logCost()` já é non-fatal, mas a tabela precisa existir para o painel funcionar.
- `server.ts` `compose-lyrics`: já reverte para `paid` em erro (ok). Confirmar que não quebra pedidos de cupom (status `paid` → review → geração, igual ao Pix).

### 6. Histórico de compras detalhado + pedido de estorno

- `src/pages/PurchaseHistory.tsx`: para cada pedido mostrar método (derivar do prefixo de `payment_id` conforme `PENDENCIAS.md`: `coupon_*`=Cupom, `bonus_balance_*`=Saldo grátis, `pay_*`=Teste, numérico=Pix MP, `mock*`/`simulated*`=Teste, `pending_mp_*`=Pix pendente), valor (R$ 1,00 ou Grátis), data e status.
- Botão **"Reportar / Solicitar estorno"** por pedido → modal simples → `POST /api/feedback` (já existe) com `category: "refund_request"`, `relatedOrderId`, detalhe. Reaproveitar `feedback` (sem nova tabela neste MVP).
- Validação: abrir `/historico-compras`, ver detalhes e enviar uma solicitação (checar linha em `feedback`).

### 7. Retomar conversa do histórico (MVP)

- `src/components/ChatSection.tsx`: aceitar prop `initialMessages?: ChatMessage[]`. Se vier, usar como estado inicial (sem a saudação padrão) e permitir continuar enviando mensagens.
- `src/App.tsx` `ChatRoute`: ler `location.state?.initialMessages` e passar para `ChatSection`.
- `src/pages/ChatHistory.tsx`: o botão "Abrir Música" → em vez de ir para `/musica/:id`, navegar para `/chat` com `state: { initialMessages: order.chat_transcript }`. "Finalizar e Compor" cria um **novo** pedido via `/api/checkout` (o pedido antigo fica no histórico). Simples e sem risco de sobrescrever pedido pago/concluído.
- Validação: em `/historico-chats`, abrir → continua a conversa; ao finalizar, vai para checkout/música normalmente.

### 8. (Opcional, baixo risco) Microsoft Clarity

- Nenhuma analytics instalada hoje. Se o usuário fornecer o ID do Clarity, adicionar o `<script>` no `index.html` (head). Fica fora do MVP principal até ter o ID.

## Páginas novas/alteradas para teste manual

- **`/admin/custos`** — painel de custo/receita (precisa da chave admin; usa `SUPABASE_SERVICE_ROLE_KEY` ou `ADMIN_DASHBOARD_KEY`).
- **`/chats`** — alias do histórico de chats (404 corrigido na rodada anterior).
- **`/historico-compras`** — agora detalhado + botão de estorno.
- **`/chat`** — aceita retomar conversa vindo do histórico.
- **`/musica/:id`** — fluxo de revisão de letra + player com karaoke.
- **Mini-player** — aparece ao tocar em Minhas Músicas/Menu; fecha, skip ±10s, volume.

## Riscos / dependências

- `cost_logs` precisa ser criada manualmente no Supabase (SQL em `supabase/migrations/0005_cost_logs.sql`).
- Skew de versão Vercel/Cloud Run em janelas de deploy.
- Karaoke é aproximado (sem LRC); pode dessincronizar em músicas com intro longa.

## Validação final

1. `npm run lint` (tsc --noEmit) e `npm run build` passam.
2. Fluxos manuais acima em produção após deploy (conferir `/admin/custos` populado).
3. Commit + push (dispara Vercel + Cloud Run).
