# Plano de Melhorias — Fluxo 1Música

> Revisão feita em 2026-09-26 sobre `main` (commit `e296b05`).
> Escopo: fluxo ponta-a-ponta — login OTP → chat → checkout → Pix → composição da letra → geração de áudio → entrega.
>
> Cada item tem **Problema**, **Onde**, **Ação** e **Aceite**. As fases são ordenadas por risco/valor: P0 tem impacto direto em receita, dados de usuário ou custo; P3 é polimento.

---

## Mapa do fluxo atual

```
Login (OTP 6 díg.) ──► /chat (Groq/Gemini, N turnos) ──► POST /api/checkout
                                                              │
                                     saldo grátis? ──► status=paid
                                     senão ──────────► status=pending_payment
                                                              │
                              POST /api/orders/:id/generate-pix (MercadoPago)
                                                              │
                   ┌──────────────────────┬─────────────────────┬────────────────┐
              webhook MP            apply-coupon         simulate-payment   (frontend faz
            (status=paid)          (status=paid)          (status=paid)      polling 3s)
                   └──────────────────────┴─────────────────────┴────────────────┘
                                                              │
                              POST /api/orders/:id/compose-lyrics  → status=lyrics_review
                                                              │
                                      usuário revisa/edita a letra
                                                              │
                              POST /api/orders/:id/generate → Lyria (SÍNCRONO) → status=completed
                                                              │
                                              e-mail Brevo + /musica/:id
```

**Três fragilidades estruturais** que aparecem em quase todos os itens abaixo:

1. **A geração de áudio roda dentro do request HTTP** (`server.ts:2485`). Não há fila, worker nem retomada. Se o request cair, o pedido fica preso em `processing` para sempre.
2. **Não existe gate de autorização uniforme.** Cada rota reimplementa o `isOwner` na mão, e três rotas esqueceram de verificar qualquer coisa.
3. **Rate limiting está desligado** (`server.ts:554-565` — a função `rateLimit` só faz `return next()`), então o único freio é o teto diário de custo de IA, que é aplicado *depois* do gasto.

---

## P0 — Crítico (fazer antes de qualquer divulgação paga)

### [x] P0.1 — `/api/users/me/delete` não tem autenticação

**Problema:** a rota lê o e-mail do **body** e marca a conta como `trash` sem verificar sessão nenhuma. Qualquer pessoa com `curl` apaga a conta de qualquer usuário sabendo só o e-mail — e `performHardDeleteCleanup()` (`server.ts:3280`) apaga músicas, orders e o usuário de forma definitiva 30 dias depois.

**Onde:** `server.ts:3108-3137`

**Ação:**
- Trocar `const { email } = req.body` por `const verified = await verifySession(req, res); if (!verified) return` e usar `verified.email`.
- Ignorar completamente qualquer e-mail vindo do body.
- Invalidar o `session_token` no mesmo update (senão o token continua válido apontando para uma conta em `trash`).

**Aceite:** `POST /api/users/me/delete` sem header `Authorization` retorna 401. Com token do usuário A e body `{email: "b@x.com"}`, só a conta A é afetada.

---

### [x] P0.2 — `/api/orders/:id/simulate-payment` está ativo em produção

**Problema:** a rota marca qualquer pedido do próprio usuário como `paid` sem cobrança. O botão está escondido por `hostname === "localhost"` no frontend (`CheckoutSection.tsx:262`), mas **isso é só UI** — o endpoint responde em produção para qualquer sessão válida. Música de graça, ilimitada.

**Onde:** `server.ts:2016-2053`; botão em `src/components/CheckoutSection.tsx:262-289`

**Ação:**
- Guardar a rota com env explícita: `if (process.env.ALLOW_SIMULATED_PAYMENT !== "true") return res.status(404).end()`.
- Nunca definir `ALLOW_SIMULATED_PAYMENT` em produção (Railway/Vercel).
- Ao simular, gravar `payment_id = "simulated_" + ...` para o modo sandbox de áudio funcionar (ver P0.4).
- No frontend, trocar o teste de hostname por `import.meta.env.DEV`.

**Aceite:** em produção a rota responde 404. Em dev com a env ligada, continua funcionando e o pedido resultante **não** chama a Lyria.

---

### [x] P0.3 — OTP de 6 dígitos sem limite de tentativas

**Problema:** `rateLimit()` é um no-op (`server.ts:554`), e `/api/verify-otp` (`server.ts:1273`) não conta tentativas erradas. Com o código válido por 10 minutos e 1.000.000 de combinações, é possível fazer brute force do login de qualquer e-mail que tenha pedido um código — e o `session_token` retornado dá acesso total à conta. O `/api/send-otp` também está sem freio, o que permite usar a conta Brevo como canal de spam.

**Onde:** `server.ts:554-565`, `server.ts:1196`, `server.ts:1273`

**Ação:**
- Reimplementar `rateLimit` de verdade (a estrutura `ipLimits` já existe, só não é usada) e aplicar em `/api/send-otp` (ex.: 5 / 10 min por IP **e** por e-mail).
- Adicionar coluna `attempts` em `otp_codes`; incrementar a cada falha e invalidar o código em 5 tentativas.
- Gerar o código com `crypto.randomInt(100000, 1000000)` em vez de `Math.random()`.
- Aumentar para 8 dígitos ou reduzir a validade para 5 minutos.
- Em múltiplas instâncias, `ipLimits` em memória não segura nada — usar tabela no Supabase ou aceitar o limite como best-effort e depender do contador de `attempts`.

**Aceite:** 6 tentativas erradas seguidas invalidam o código. 6 pedidos de OTP no mesmo IP em 10 min retornam 429.

---

### [x] P0.4 — Pedidos gratuitos (cupom/saldo) chamam a Lyria de verdade

**Problema:** `generateLyriaForOrder()` decide sandbox vs. real com
`payment_id.startsWith("mock") || startsWith("simulated")` (`server.ts:2210-2213`), mas os pedidos gratuitos recebem `payment_id` começando com `coupon_` (`server.ts:2139`), `bonus_balance_` (`server.ts:1789`) ou `pending_mp_` (`server.ts:1792`). **Nenhum casa com o teste**, então cupons, saldo de indicação e pagamentos simulados caem no branch real e gastam ~R$ 0,20 de Lyria cada — exatamente o oposto do que o comentário do código diz ("Sandbox/Coupon mode").

**Onde:** `server.ts:2206-2260`

**Ação:**
- Inverter a lógica: real **só** quando o `payment_id` é numérico (padrão MercadoPago) — o mesmo teste `/^\d+$/` já usado no refund (`server.ts:2726`) e no cupom (`server.ts:2107`).
- Extrair isso para `function isRealMercadoPagoPayment(paymentId?: string)` e usar nos três lugares, eliminando a divergência.
- Decidir explicitamente a política de cupom/indicação: se o prêmio é uma música **real**, dizer isso no código e orçar; se é demo, o arquivo local basta.

**Aceite:** pedido pago com cupom não gera linha `stage=music_generation` com `provider=lyria` no `cost_logs`. Pedido com `payment_id` numérico gera.

---

### [x] P0.5 — Webhook do MercadoPago sem validação de assinatura, idempotência e valor

**Problema:** `/api/webhook/mercadopago` (`server.ts:2162`) aceita qualquer POST. Ele re-consulta o pagamento na API do MP (o que impede forjar aprovação), mas:
- não valida o header `x-signature` (HMAC), então é um endpoint aberto para flood;
- não verifica `transaction_amount`, então um pagamento de valor menor aprovado por outro caminho libera a música;
- não é idempotente — MP reenvia notificações e cada uma refaz o update;
- **não dispara nada além do update de status.** Quem paga e fecha o navegador nunca tem a letra composta: `compose-lyrics` só é chamado pelo `useEffect` do `SuccessSection.tsx:128`. O pedido fica em `paid` para sempre, sem e-mail, sem música.

**Onde:** `server.ts:2162-2204`

**Ação:**
- Validar `x-signature` / `x-request-id` conforme a doc do MercadoPago antes de processar.
- Conferir `payment.transaction_amount >= 1.0` e `payment.external_reference` pertencente a um pedido em `pending_payment`.
- Fazer o update condicional (`.eq("status", "pending_payment")`) para ganhar idempotência de graça.
- Enfileirar a composição no webhook (ver P1.1), não depender do navegador aberto.
- Responder 200 rápido e processar fora do request.

**Aceite:** webhook com assinatura inválida → 401. Mesma notificação entregue 3x → um único `compose-lyrics`. Pagar e fechar o navegador ainda resulta em e-mail com a música.

---

### [x] P0.6 — `/api/feedback` aceita qualquer e-mail sem autenticação

**Problema:** `server.ts:985` insere no banco com `user_email` vindo do body, sem sessão. Permite poluir a tabela de feedback e atribuir reclamações a terceiros.

**Ação:** exigir `verifySession` e usar `verified.email`; manter `relatedOrderId` apenas se o pedido for do usuário.

**Aceite:** sem token → 401; e-mail gravado é sempre o da sessão.

---

## P1 — Robustez do fluxo (o que mais dói para o usuário hoje)

### [x] P1.1 — Geração de áudio síncrona: tirar do request

**Problema:** `POST /api/orders/:id/generate` (`server.ts:2485-2660`) chama a Lyria, faz upload no Storage, atualiza o banco e envia e-mail — tudo dentro do HTTP. Consequências reais:
- **Timeout.** Railway/Cloud Run cortam o request antes da Lyria terminar; o cliente vê erro enquanto o servidor talvez conclua.
- **Pedido preso.** O status vai para `processing` (`server.ts:2537`) antes da chamada. Se o processo morrer (deploy, OOM, ou o **pause noturno das 02:00 BRT** em `.github/workflows/railway-pause.yml`), nada volta a mexer nesse pedido: `processing` não é retentável, o próprio endpoint recusa (`server.ts:2519`).
- **Sem retomada.** O frontend faz polling (`SuccessSection.tsx:100-125`), mas se o usuário fecha a aba durante `paid`, o `compose-lyrics` nunca acontece.

**Ação (incremental, sem infra nova):**
1. Responder `202 { status: "processing" }` imediatamente e rodar a geração em `setImmediate`/promise solta, deixando o polling existente do frontend descobrir o resultado. Resolve o timeout com mudança mínima.
2. Adicionar colunas `processing_started_at` e `attempts` em `orders`.
3. Criar um **reaper** no mesmo estilo do `performHardDeleteCleanup` (`server.ts:3280`): a cada N minutos, pedidos em `processing` com `processing_started_at` > 10 min voltam para `lyrics_review` (ou `failed` + estorno depois de 3 tentativas).
4. Rodar o reaper também **no boot** — cobre o restart após o pause noturno.
5. Só então, se o volume justificar, migrar para fila de verdade (Supabase queue / worker separado).

**Aceite:** matar o servidor no meio de uma geração e reiniciar → o pedido volta para um estado retentável em < 10 min. Nenhum pedido fica em `processing` por mais de 10 minutos.

---

### [x] P1.2 — Saldo grátis: decremento não atômico e sem devolução

**Problema:** dois bugs de crédito no mesmo trecho (`server.ts:1770-1795`):
- Leitura e escrita separadas (`free_songs_balance - 1` calculado em JS). Dois checkouts simultâneos leem o mesmo saldo e gastam **um crédito para duas músicas**. O mesmo padrão read-modify-write aparece no bônus de indicação (`server.ts:1365`) e no `current_uses` do cupom (`server.ts:2145`).
- Se a geração falhar, o refund só cobre pagamento MercadoPago (`server.ts:2726`). Quem usou saldo grátis ou cupom **perde o crédito** e recebe um e-mail dizendo "nenhuma cobrança foi realizada" (`server.ts:2777`).

**Ação:**
- RPC `consume_free_song(p_user_id)` com `UPDATE ... SET free_songs_balance = free_songs_balance - 1 WHERE id = $1 AND free_songs_balance > 0 RETURNING free_songs_balance`. Se não retornar linha, não há saldo.
- Mesmo tratamento para `increment_free_songs` e `increment_coupon_uses` (o padrão já existe em `increment_ai_usage`, `server.ts:459`).
- No handler de erro do `generate`, devolver crédito quando `payment_id` começa com `bonus_balance_`, e decrementar `current_uses` quando começa com `coupon_`.

**Aceite:** dois `POST /api/checkout` em paralelo com saldo 1 → um sucesso, um `pending_payment`. Falha de geração em pedido de saldo → saldo volta ao valor anterior.

---

### [x] P1.3 — Estado do checkout não sobrevive a um refresh

**Problema:** `CheckoutRoute` (`src/App.tsx:93-113`) lê `paymentQr`/`paymentCopiaCola` de `location.state`. Ao dar F5 em `/checkout/:id`, o QR desaparece, o polling nem começa (depende de `localQr`, `CheckoutSection.tsx:62`) e o usuário vê o botão "Pagar R$ 1,00 via Pix" como se nada tivesse acontecido — inclusive quando o pedido já está pago. O contador de 10 minutos (`CheckoutSection.tsx:25`) é puramente cosmético e não corresponde à expiração real do Pix no MercadoPago.

**Ação:**
- `CheckoutSection` busca `GET /api/orders/:id` no mount e hidrata QR/copia-e-cola/status do servidor; `location.state` passa a ser só otimização.
- Se o status já for `paid`/`lyrics_review`/`processing`/`completed`, redirecionar direto para `/musica/:id`.
- Definir `date_of_expiration` na criação do pagamento MP, persistir em `orders` e alimentar o contador com esse valor.
- Ao expirar, oferecer "gerar novo Pix" em vez de deixar o QR morto na tela.

**Aceite:** F5 em `/checkout/:id` mantém QR, contador coerente e polling ativo. Pedido já pago não mostra tela de pagamento.

---

### [x] P1.4 — Guardas de rota chamam `navigate()` durante o render

**Problema:** `ChatRoute`, `MySongsRoute`, `ChatHistoryRoute`, `PurchaseHistoryRoute` e `FriendsRoute` (`src/App.tsx:34-160`) fazem `if (!user) { navigate("/login"); return null }` **no corpo do componente**. Efeito colateral em render: warning do React 19, navegação podendo rodar duas vezes em StrictMode e flash de tela branca.

**Ação:** criar um único `<RequireAuth>` que renderiza `<Navigate to="/login" replace />` e envolver as rotas protegidas. Elimina cinco cópias do mesmo bloco.

**Aceite:** nenhum warning de "Cannot update during render"; acesso deslogado a `/minhas-musicas` vai para `/login` sem flash.

---

### [x] P1.5 — `AuthContext` dispara `/api/users/me` duas vezes e derruba a sessão no timeout

**Problema:** dois `useEffect` (`AuthContext.tsx:85-120` e `AuthContext.tsx:122-145`) fazem a **mesma** chamada — um no mount, outro a cada mudança de rota — então todo carregamento faz duas requisições idênticas. Pior: o primeiro tem `AbortController` de 5s e chama `logout()` em qualquer erro que não seja abort. Uma resposta lenta (o `/api/users/me` devolve **todos** os pedidos com `chat_transcript` e `payment_id` inteiros, `server.ts:1447`) ou um 500 transitório desloga o usuário no meio do fluxo — inclusive depois de pagar.

**Ação:**
- Unificar em um efeito só, com dependência em `location.pathname` e deduplicação.
- Só chamar `logout()` em **401/403**; erro de rede ou 5xx mantém a sessão.
- Enxugar o payload: `/api/users/me` devolve apenas `id`, `status`, `title`, `created_at`, `hasAudio` por pedido; `chat_transcript` fica num endpoint dedicado, sob demanda. `payment_id` não deve ir para o cliente.

**Aceite:** um request por navegação; API fora do ar não desloga; payload de `/api/users/me` cai ordens de magnitude para quem tem muitos pedidos.

---

### [x] P1.6 — Chat: transcript e custo controlados pelo cliente

**Problema:** `/api/chat` (`server.ts:1483`) recebe o array `messages` completo a cada turno e o reenvia ao modelo, sem limite de quantidade nem de tamanho — dentro de um body de até 10 MB (`server.ts:58`). O `/api/checkout` (`server.ts:1749`) também aceita o `chatTranscript` cru do cliente, que é o que alimenta a composição da letra. O único freio é o teto diário de custo (`DAILY_AI_COST_LIMIT_BRL`, default R$ 0,05), aplicado **depois** do gasto: uma única chamada gigante estoura o teto e só é bloqueada na seguinte.

**Ação:**
- Limitar no servidor: máx. ~40 mensagens e ~2.000 caracteres por mensagem; truncar a janela enviada ao modelo.
- Persistir o transcript server-side (tabela `chat_sessions` ou order em `chatting`) e fazer o `/api/checkout` ler do banco em vez de confiar no body.
- Estimar o custo **antes** da chamada (tokens de entrada) e recusar se a estimativa estourar o teto.
- Reduzir `express.json` para ~1 MB nas rotas de texto, mantendo o limite maior só em `/api/speech-to-text`. Hoje existem dois `express.json` (`server.ts:58` com 10mb e `server.ts:544` com 25mb) — **o segundo é código morto**, porque o primeiro já consumiu o body. Remover.

**Aceite:** body de 5 MB em `/api/chat` → 413. Transcript alterado no cliente não muda a letra gerada.

---

## P2 — Operação, custo e confiabilidade

### [x] P2.1 — CI faz deploy sem nenhum gate

**Problema:** `.github/workflows/deploy.yml` roda `railway up` em todo push para `main`. Não há `tsc --noEmit`, lint ou teste. O script `lint` existe no `package.json` mas nunca é executado; não há script `test`.

**Ação:** adicionado job `checks` (`npm ci` → `npm run lint` → `npm run build`) do qual o job `deploy` depende (`needs: checks`) — só roda `railway up` se o gate passar. Adicionado `"test": "playwright test"` no `package.json`. `tests/login.spec.ts` e `playwright.config.ts` agora lêem a base URL de `PLAYWRIGHT_BASE_URL` (default: produção/localhost como já era), em vez de hardcoded. Os testes Playwright viraram um job `smoke-test` **separado**, que roda só depois do `deploy` e usa `continue-on-error: true` — nunca bloqueia o build/deploy.

  Pré-requisito descoberto durante o trabalho: `npm run lint` (`tsc --noEmit`) já falhava no `main` antes desta mudança, por três bugs de sintaxe/tipos pré-existentes e não relacionados a este item — uma chave `}` faltando em `/api/orders/:id/generate` (`server.ts`, fechamento do `setImmediate`), uma variável `cleanEmail` redeclarada em `/api/verify-otp`, e uma referência a `user` inexistente em `/api/checkout` (um `.update()` órfão e não-atômico duplicando o decremento que a RPC `consume_free_song` já faz). Sem corrigir isso o gate ficaria permanentemente vermelho e bloquearia todo deploy futuro — corrigidos como parte deste item.

**Aceite:** push que quebra o `tsc` não chega em produção. ✅ (`checks` roda `npm run lint`; `deploy` tem `needs: checks`.)

---

### [x] P2.2 — Modelo Gemini configurado provavelmente não existe

**Problema:** `GEMINI_CHAT_MODEL = "gemini-3.5-flash-lite"` (`server.ts:665`), e os dois últimos commits mexeram exatamente nesse nome. O mapa `DEPRECATED_GEMINI_MODELS` (`server.ts:668-675`) inclui `"gemini-3.5-flash-lite"` apontando para si mesmo — entrada inútil que sinaliza confusão. Como `PREFER_GROQ = true` (`server.ts:662`), o Gemini é só fallback, então um nome inválido fica invisível até o Groq falhar — e aí o fallback falha também. Além disso o nome do modelo está hardcoded em três chamadas (`server.ts:1568`, `1631`, `2341`) e é gravado assim no `cost_logs` mesmo quando o provider real é o Groq, o que **distorce o dashboard `/admin/custos`**.

**Ação:**
- `GEMINI_CHAT_MODEL` corrigido para `"gemini-2.0-flash-lite"` (modelo real e vigente na API do Gemini). Removida a auto-referência inútil no mapa de deprecados; nomes antigos/inválidos (`1.5-flash`, `1.5-pro`, `2.0-flash`, `3.5-flash-lite`, `3.5-flash`, `3.1-flash-lite`) continuam mapeados para o modelo atual.
- `callGemini`/`callGroq`/`generateContentWithFallback` não recebem mais `model` como string do chamador: cada um sempre roda `GEMINI_CHAT_MODEL` ou `GROQ_CHAT_MODEL` internamente e devolve `model` (o nome que **de fato** rodou) junto de `provider`. Os quatro pontos de chamada (`/api/chat` x2, `compose-lyrics`, `revise`) não passam mais `model: "gemini-..."` hardcoded e o `logCost` agora grava `response.model`/`modelResponse.model` — o modelo real, não um literal que ignora qual provider rodou.

  Não implementado (fora do pedido original, ficaria para outro item do backlog): endpoint dedicado `/api/health/providers` de smoke test de boot — os providers já são validados a cada chamada real via `generateContentWithFallback`.

**Aceite:** `/admin/custos` mostra `provider=groq` com `model=llama-3.1-8b-instant` (já era o caso, comportamento preservado). Derrubar o Groq (env inválida) e o chat continua funcionando via Gemini, agora com um `GEMINI_CHAT_MODEL` que existe de fato.

---

### [x] P2.3 — Chave de admin é a service role key do Supabase

**Problema:** `x-admin-key` é comparado com `process.env.SUPABASE_SERVICE_ROLE_KEY` (`server.ts:1022` e `server.ts:1086`). Isso obriga a circular a chave de acesso total ao banco para operar o dashboard, e qualquer log/print acidental do header vaza acesso irrestrito. A comparação também é `!==` simples, não constant-time.

**Ação:** extraído um helper único `isAuthorizedAdmin(req)` usado pelas duas rotas `/api/admin/*`. Ele aceita **apenas** `x-admin-key === ADMIN_DASHBOARD_KEY`, comparado com `crypto.timingSafeEqual` (nunca mais a service role key), OU um `session_token` (Bearer) de um usuário cujo e-mail está em `ADMIN_EMAILS` — esse segundo caminho já existia em `cost-logs` e agora também vale para `migrate-orders-userid`. `ADMIN_DASHBOARD_KEY` documentada em `.env.example`.

**Aceite:** requisição com a service role key no `x-admin-key` retorna 403 (o valor não é mais aceito em nenhuma rota admin).

---

### [x] P2.4 — Pause noturno do Railway derruba a API por 6h

**Problema:** `railway-pause.yml` zera as réplicas às 02:00 BRT e `railway-resume.yml` restaura às 08:00. O frontend na Vercel continua no ar, então das 02:00 às 08:00 o usuário entra, faz login... e tudo falha. Pior: pedidos em `processing` na hora do pause ficam órfãos (ver P1.1), e pagamentos Pix confirmados nessa janela **perdem a notificação do webhook** — o MP reenvia por um tempo, mas não indefinidamente.

**Ação:**
- `src/components/MaintenanceOverlay.tsx`: health check periódico (`/api/health` a cada 30s) montado no `App.tsx`; depois de 2 falhas seguidas, substitui a tela quebrada por "Estamos em manutenção noturna... voltamos às 8h" em vez de erros genéricos por toda a UI.
- `POST /api/orders/:id/generate-pix` agora recusa (503 `MAINTENANCE_WINDOW`) a partir de ~01:30 BRT até as 08:00 (`isInNightlyMaintenanceWindow()`, desligável via `MAINTENANCE_WINDOW_ENABLED=false`) — não gera Pix que não teria como ser processado antes da pausa.
- O reaper do P1.1 (já rodava no boot) continua cobrindo os pedidos órfãos em `processing`.
- Reconciliação: nova função `reconcilePendingPayments()` varre pedidos `pending_payment` com `payment_id` real (numérico) das últimas 12h e consulta o pagamento na API do MercadoPago, reaproveitando a mesma lógica idempotente do webhook (extraída para `settleMercadoPagoPaymentIfApproved()`). Roda automaticamente no boot do servidor **e** é exposta em `POST /api/admin/reconcile-pending-payments` (protegida por `isAuthorizedAdmin`), que o `railway-resume.yml` chama depois de escalar o serviço de volta e confirmar o health check.

  Pendente de configuração manual (fora do que dá para fazer só no código): o secret `ADMIN_DASHBOARD_KEY` precisa existir no GitHub (`Settings → Secrets and variables → Actions`) com o mesmo valor usado no Railway, para o passo de reconciliação do `railway-resume.yml` funcionar; e a variável `APP_URL` (ou o fallback hardcoded no workflow) precisa apontar para a URL pública correta do serviço.

**Aceite:** pagamento feito às 03:00 tem a música entregue depois do resume, sem intervenção manual (via reconciliação no boot ou no `railway-resume.yml`).

> **Atualização (2026-10-05):** o backend migrou para o Render free (`render.yaml`) com keep-alive 24/7 (`.github/workflows/keep-alive.yml`), então não há mais pausa noturna. Foram removidos `railway-pause.yml`, `railway-resume.yml`, `MaintenanceOverlay.tsx` e `isInNightlyMaintenanceWindow()`. A reconciliação no boot continua cobrindo webhooks perdidos enquanto o serviço dorme/reinicia.

---

### [x] P2.5 — Observabilidade: erros existem, visibilidade não

**Problema:** há um bom `logErrorAndNotify` com ticket (`server.ts:264`), mas ele só é chamado em `generate` e `revise`. Todo o resto usa `console.error` e morre no log do Railway. Não há métrica de funil: quantos chats viram checkout, quantos checkouts viram pagamento, quantas gerações falham.

**Ação:**
- Extraído `sendAdminAlert()` (o envio de e-mail que já existia em `logErrorAndNotify`) para poder ser chamado também fora de uma request — usado pelos dois alertas novos abaixo. Como parte disso, `endpoint`/`errorMessage`/`userEmail` passaram a ser escapados com um novo `escapeHtml()` antes de entrar no HTML do e-mail.
- Middleware de erro global no Express (`app.use((err, req, res, next) => ...)`, registrado depois de todas as rotas) que roteia qualquer erro passado via `next(err)` por `logErrorAndNotify`.
- Reaper (`performProcessingReaper`) agora envia um alerta por e-mail (com a lista de IDs) sempre que marca pedido(s) como `failed` por esgotar tentativas — antes só logava no console.
- Novo monitor `checkDailyFailureRate()` (roda no boot e a cada 30 min): se a taxa de `failed` nas últimas 24h passar de `FAILURE_RATE_ALERT_THRESHOLD` (default 20%, com mínimo de 5 pedidos na amostra), envia um alerta — no máximo 1 por dia.
- Funil exposto em `/api/admin/cost-logs` (campo `funnel`) e renderizado em `/admin/custos`: chats iniciados (`chat_sessions`) → checkouts → passaram do pagamento → entregues → falharam, com taxa de falha destacada em vermelho acima do limite.
- De brinde: removida a segunda rota `GET /api/health` duplicada (inalcançável, item também listado em P3).

**Aceite:** dashboard mostra conversão chat → pago → entregue e taxa de falha (histórico completo, não só do dia — dado o volume atual do MVP, uma janela maior é mais legível que "hoje").

---

## P3 — Qualidade de código e UX

- [ ] **`server.ts` com 3.400+ linhas.** Fatiar em `routes/` (auth, orders, payments, admin) + `services/` (ai, email, storage, cost). Requisito prático para qualquer teste unitário.
  **Não executado nesta rodada** — é um refactor estrutural grande (mover ~30 rotas e várias closures que compartilham estado de módulo) sem uma suíte de testes automatizados no repo para validar que nada quebrou; o risco de regressão silenciosa em produção é maior que o benefício de fazer isso sem supervisão. Recomendo tratar como uma tarefa própria, feita incrementalmente (uma fatia por vez, com deploy e verificação manual entre cada uma) em vez de num único PR grande.
- [x] **`isOwner` duplicado 8 vezes** (`server.ts:1846`, `2038`, `2098`, `2246`, `2505`, `3050`, ...). Extraído `loadOwnedOrder(res, verified, orderId, select?)`, que busca o pedido, confere a posse (`user_id` ou e-mail legado) e já responde 404/403 sozinho — usado nos 8 pontos (`generate-pix`, `simulate-payment`, `apply-coupon`, `compose-lyrics`, `generate`, `revise`, `DELETE /api/orders/:id`, `DELETE /api/orders/:id/chat`). As duas rotas que expõem pedidos `completed` publicamente antes de exigir login (`GET /api/orders/:id` e o download) têm formato diferente (buscam o pedido antes de decidir se autenticação é necessária) e foram deixadas como estão.
- [x] **Duas rotas `GET /api/health`** (`server.ts:931` e `server.ts:3337`). A segunda é inalcançável — removida (feito junto do P2.5).
- [ ] **`apiFetch` existe mas é ignorado** em `App.tsx:46` e em todo o `AuthContext`, que montam `fetch` + header na mão. Padronizar: todo request passa por `apiFetch`, que centraliza o tratamento de 401.
  **Não executado nesta rodada** — toca praticamente todo componente que fala com a API (~15 arquivos); dado o volume, prefiro fazer como um passo isolado e revisável em vez de misturado aos outros itens deste PR.
- [x] **Mock user automático em localhost** (`AuthContext.tsx:28-42`) gravava um `session_token` falso no localStorage. O token não era aceito pelo servidor, então o resultado era um estado "logado" que falhava em toda chamada — mais confuso que útil. Removido; dev local agora usa o mesmo fluxo de OTP que produção.
- [x] **`referral_code` gerado com `Math.random().toString(36).substr(2,6)`** (`server.ts:1389`) sem checagem de unicidade — colisão quebra o insert. Nova `generateUniqueReferralCode()` usa `crypto.randomBytes`, confere colisão contra a tabela `users` e tenta de novo (até 5x, com fallback em UUID). `substr` trocado por `slice`.
- [x] **`order_id` também é `Math.random()`** (`server.ts:1761`, `substr(2,9)`) — trocado por `crypto.randomUUID()`.
- [x] **HTML de e-mail interpola dados sem escape** (`songMetadata.title`/`style`/`artistName` no e-mail de entrega; `endpoint`/`errorMessage`/`userEmail` no e-mail de alerta de erro). Adicionado `escapeHtml()` e aplicado nos dois pontos (feito junto do P2.5).
- [ ] **`DAILY_AI_COST_LIMIT_BRL` default R$ 0,05** (`server.ts:398`) — validar contra o custo real medido em `/admin/custos`; se estiver apertado demais, usuários legítimos são bloqueados no meio da entrevista.
  **Não executado** — é uma decisão de produto/negócio (qual teto é seguro dado o custo real por música, não algo que dê para inferir só lendo o código); melhor decidida olhando os números reais no dashboard depois de mais uso.
- [x] **Contagem de indicações usa `count === null || count < 5`** (`server.ts:1359`) — erro na query virava "pode premiar". Agora trata `error` explicitamente (loga e **não** premia em caso de falha na consulta) em vez de tratar `null` como "sem limite".
- [ ] **Só 2 migrations no repo** (`supabase/migrations/`) para um schema com `users`, `orders`, `coupons`, `cost_logs`, `feedback`, `otp_codes`, `ai_usage_daily`. O README cita um `supabase_schema.sql` que não existe. Versionar o schema completo — hoje não é possível recriar o ambiente do zero.
  **Não executado** — eu não tenho acesso ao Supabase deste projeto para extrair o schema real (`pg_dump`/introspecção); escrever as migrations de memória, sem conferir contra o banco de verdade, arriscaria documentar um schema errado, que é pior que não ter nenhum. Alguém com acesso ao painel do Supabase precisa rodar o dump e eu (ou qualquer assistente) posso formatar isso em migrations a partir daí.

---

## Ordem sugerida de execução

| Bloco | Itens | Por quê primeiro |
|---|---|---|
| 1 | P0.1, P0.2, P0.6 | Três rotas abertas. Correção pequena, risco eliminado hoje. |
| 2 | P0.4, P1.2 | Dinheiro vazando (Lyria em pedido grátis, crédito consumido em dobro). |
| 3 | P0.3, P0.5 | Auth e pagamento: o que quebra confiança se explorado. |
| 4 | P1.1 | A mudança estrutural. Depende do reaper + colunas novas. |
| 5 | P1.3, P1.4, P1.5, P1.6 | UX do fluxo pago e contenção de custo. |
| 6 | P2.1, P2.2 | Rede de segurança para tudo acima. |
| 7 | P2.3 – P2.5, P3 | Operação e manutenção. |

**Recomendação:** o bloco 1 é meia hora de trabalho e fecha as três exposições mais graves — vale fazer antes de qualquer outra coisa, inclusive antes de ler o resto deste plano com calma.
