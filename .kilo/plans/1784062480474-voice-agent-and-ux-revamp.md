# Plano: Agente de Voz (A/B), Revamp de UX e Correções de Dados

Projeto: **1Música** (React + Vite + Express + Supabase). Contexto: app mobile-first (MobileFrame), player de áudio global (`PlayerContext`/`MiniPlayer`), entrevista de composição via chat que dispara checkout (R$ 1,00).

Decisões confirmadas com o usuário:

- **Voz**: entregar **dois modos para A/B test** — (A) Chat escrito + STT/TTS; (B) Agente realtime (Live API). Registrar o `entry_mode` para decidir depois o que manter / como cobrar.
- **orders.user_id**: eu rodo a migration no Supabase (CLI logado no terminal, chaves no `.env`). Fazer de forma incremental/segura (coluna nullable → backfill → trocar queries → só depois restringir).
- **Exclusão**: Minhas Músicas ✅, Histórico de Chats ✅ (com modal de feedback). Histórico de Compras ❌ permanente.
- **PiP**: ativar ao sair de **qualquer tela** com música tocando.
- **Amigos**: tela exclusiva `/amigos` (e alias `/indicacoes`); Menu mostra contador + saldo como CTA.

> ⚠️ **Aviso de custo/segurança (Live API):** `gemini-2.5-flash-native-audio-latest` (BidiGenerateContent) **NÃO é grátis** — é cobrado por token de áudio (aprox. US$ 0,50 / 1M input + 1M output). O `exemplo-livemode.js` embute a chave no browser (`?key=...`) — **inseguro em produção**. Plano usa **proxy WebSocket no backend** com a chave server-side.

---

## Fase 0 — Modelos baratos por estágio (orientação)

Adicionar/ajustar env vars e abstrair provedores. Tabela de referência:

| Estágio                 | Modelo recomendado (mais barato)                | Env var                           | Notas                                                   |
| ----------------------- | ----------------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| Entrevista chat (texto) | `llama-3.1-8b-instant` (Groq) — já é primary    | `GROQ_API_KEY`                    | manter como está                                        |
| STT (gravar áudio)      | `whisper-large-v3` (Groq) — muito barato/grátis | `GROQ_API_KEY`                    | novo endpoint `/api/speech-to-text`                     |
| TTS (ler resposta)      | `tts-1` (OpenAI) **ou** Gemini 2.5 Flash TTS    | `OPENAI_API_KEY` + `TTS_PROVIDER` | fallback gratuito: `SpeechSynthesis` do browser (pt-BR) |
| Agente realtime (voz)   | `gemini-2.5-flash-native-audio-latest`          | `GEMINI_API_KEY` (server)         | **pago**; só via proxy WS                               |
| Composição de letra     | gemini/groq atuais                              | —                                 | sem mudança                                             |
| Geração musical         | Lyria (atual)                                   | —                                 | sem mudança                                             |

Adicionar coluna `entry_mode` e `model` em `cost_logs` (já existe tabela) para medir chat vs agente.

---

## Fase 1 — Corrigir `orders` para referenciar `user_id` (uuid)

1. **SQL (via `supabase` CLI logado):** `ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;` (nullable). Manter coluna `email` populada por segurança durante a transição.
2. **Backfill:** reusar `POST /api/admin/migrate-orders-userid` (já existe, protegido por service-role key) para preencher `user_id` a partir de `email`. Rodar e validar contagem migrada.
3. **Trocar queries (server.ts) para usar `user_id` vindo da sessão verificada (`verifySession` já retorna `email`; estender para retornar `userId`):**
   - `/api/checkout`: inserir `user_id` (e manter `email`).
   - `/api/users/me`: buscar `orders` por `user_id` (fallback `email` se `user_id` nulo, para não quebrar histórico antigo).
   - `/api/orders/:id` (GET/DELETE): filtrar por `user_id` + `session_token`.
   - `/api/orders/:id/generate-pix`, `simulate-payment`, `apply-coupon`, `compose-lyrics`, `generate`, `revise`: usar `user_id`.
4. **Restringir depois:** após validar 100% backfill, `ALTER TABLE orders ALTER COLUMN user_id SET NOT NULL;` + FK. Remover dependência de `email` nas queries críticas.
5. **Validação:** contar `orders` com `user_id` nulo após backfill == 0; smoke test de fluxo completo (criar → pagar → ver em Minhas Músicas).

---

## Fase 2 — Profile → Menu + exibição de e-mail

- Renomear `src/pages/Profile.tsx` → `src/pages/Menu.tsx` (componente `Menu`). Manter rota `/menu` como alias (ChatHistory/PurchaseHistory/MySongs navegam para `/menu`) e adicionar `/menu`.
- Header (linha 162 de Profile.tsx): trocar `<h1>{user.email}</h1>` por `<h1>Menu</h1>`.
- Acima do botão "Excluir minha conta" (seção linha 372): adicionar bloco discreto:
  `Usuário conectado` + `{user.email}` (texto pequeno, cinza, `mt-6`).
- Manter bloco de indicação/referral no Menu por enquanto (será movido para Fase 7), mas adicionar **contador + CTA** de indicações (ver Fase 7).

---

## Fase 3 — Chat pergunta o nome 1x (function/tool calling)

- No `POST /api/chat` (server.ts ~1179): adicionar `functionDeclarations` com ferramenta `save_user_name(name: string)`.
- System instruction: se `name` (user.name) estiver vazio, o modelo deve perguntar o nome uma vez e chamar `save_user_name`; depois usa o nome para personalizar.
- Quando o modelo chamar a tool: backend faz `supabase.from("users").update({ name })` (pela sessão) e retorna `ok`. Front (`ChatSection`) ao receber resposta com tool call, chama `updateUser({ name })` do `AuthContext`.
- **Validação:** usuário sem nome vê pergunta; após responder, nome persiste e aparece em `/menu`; não é perguntado de novo.

---

## Fase 4 — Modo A: Chat com STT + TTS (reaproveitar `/api/chat-voice`)

- **Backend novo** `POST /api/speech-to-text`: recebe áudio base64 → Groq `whisper-large-v3` → retorna `transcript` (para substituir o fluxo atual de chat-voice que faz STT+resposta junto; mais barato separar). Manter `/api/chat-voice` como fallback.
- **TTS backend novo** `POST /api/tts`: recebe `text` → provedor configurado (`TTS_PROVIDER`) → retorna áudio (URL/base64) para o frontend tocar. Default tolerante: se sem `OPENAI_API_KEY`, usar `SpeechSynthesis` no browser.
- **Front (`ChatSection.tsx`):** reativar o botão de microfone (atualmente comentado linhas 435-459) usando `MediaRecorder`; enviar áudio → `/api/speech-to-text` → inserir transcript como mensagem user → chamar `/api/chat` normalmente. Adicionar **toggle de TTS** (ícone alto-falante) que, quando ligado, fala cada resposta da IA (via `/api/tts` ou `SpeechSynthesis`). Guardar preferência em `localStorage`.
- Logar `entry_mode: "chat"` em `cost_logs`.

---

## Fase 5 — Modo B: Agente realtime (Live API) — proxy WebSocket

- **Nova rota WS no `server.ts`**: `/api/voice/ws`. O servidor abre WS para `wss://generativelanguage.googleapis.com/ws/...BidiGenerateContent?key=${GEMINI_API_KEY}` (chave server-side), faz `setup` com `systemInstruction` (entrevista de música em pt-BR, estilo do `exemplo-livemode.js` porém focado em coletar dados da canção) e `tools` (`save_song_info`, `finish_interview`). Encaminha áudio/texto entre browser↔Gemini.
- **Tools do agente:** `save_song_info(fields)` acumula rascunho (em memória no servidor, indexado por `session_token`); `finish_interview()` sinaliza fim → servidor devolve o transcript/structured ao cliente. Cliente então chama `POST /api/checkout` (igual ao chat) para gerar pedido.
- **Nova tela** `src/pages/VoiceAgent.tsx` montando o widget do `exemplo-livemode.js` (FAB + painel) adaptado para conectar no `/api/voice/ws` (áudio via `getUserMedia`, `AudioWorklet`/`ScriptProcessor`, `AudioContext` de saída). Estados: idle/connecting/listening/processing/speaking/error reaproveitados do exemplo.
- **A/B:** `Home` e `Menu` ganham dois CTAs: "Criar Nova Música" (chat, Fase 4) e "Conversar com o Agente" (VoiceAgent). Registrar `entry_mode: "agent"` em `cost_logs`.
- **Risco:** proxy WS e function calling sobre Live API é a parte mais complexa; se necessário, MVP do agente pode apenas conduzir a entrevista e, ao fim, o cliente envia o transcript ao checkout (sem tools obrigatórios).

---

## Fase 6 — Remover "karaoke" da letra

- Em `src/components/AudioPlayer.tsx` → `renderLyrics()` (linhas 162-206): remover o cálculo de `activeLineIndex` / `durationPerLine` e o destaque (`text-[#FF5A5F] font-bold scale-[1.02]`) por linha ativa. Renderizar todas as linhas uniformes (`text-gray-600`); manter o tratamento de linhas entre `[ ]` como título de seção.

---

## Fase 7 — Amigos/Indicações em tela exclusiva

- Nova página `src/pages/Friends.tsx` (rota `/amigos` + alias `/indicacoes`), reusando o bloco de referral do Menu (saldo de músicas grátis + link de convite + copiar + lista de amigos cadastrados).
- `Menu.tsx`: no topo da seção de indicação, manter um **resumo/CTA**: "X amigos · Y músicas grátis" com botão que leva a `/amigos`. Remover a lista detalhada do Menu (ficar só o resumo).
- `App.tsx`: adicionar rotas `/amigos`, `/indicacoes`.

---

## Fase 8 — Listas consistentes + Player/Playlist

- **`MySongs.tsx`:** padronizar todos os status (`pending_payment`, `processing`, `completed`, `failed_safety`, `failed`) num mesmo layout de linha: ícone + título + badge de status + **bandeja de ações à direita** (play, delete, chevron) sempre visível. `playOrder` já existe; manter. Reposicionar o botão de play para a bandeja (não só em completed). A lista funciona como playlist (tocar atualiza `MiniPlayer`).
- **`PurchaseHistory.tsx`:** ajustar visual para o mesmo padrão de linha; **sem** botão de delete (permanente). Pendente mantém "Retomar Pagamento"; concluído mantém "Ver Música".
- **`ChatHistory.tsx`:** adicionar botão de delete por item + `DeleteMusicModal` (reutilizar, categoria `chat_deletion`). Backend: novo `DELETE /api/orders/:id/chat` que zera `chat_transcript` (mantém o pedido/música). Confirmar se "excluir chat" = zerar transcript ou apagar pedido — **default: zerar transcript** (preserva a música já paga).
- **Modais de feedback:** `DeleteMusicModal` já coleta `reasonCategory`/`reasonDetails` → gravar em `/api/feedback` (já existe). Reutilizar para música e chat.

---

## Fase 9 — Home: player de exemplo + local dos assets

- **Integrar ao PlayerContext global:** em `src/pages/Home.tsx`, remover o `<audio>` local e o estado `playingExampleId`; em vez disso, cada música de exemplo vira um `PlayerTrack` e usa `player.playTrack`/`player.togglePlay`/`player.currentTrack` (igual a MySongs). Assim play/pause, `MiniPlayer` e PiP (Fase 10) funcionam de forma consistente em todas as telas.
- **Validação do local dos arquivos de exemplo** (`/assets/examples/*.mp3` hoje referenciados; deploy em Vercel **e** Cloud Run):
  - Opção A (recomendada p/ MVP): manter em `public/assets/examples/` — Vite copia para `dist/` e Vercel serve estático; **confirmar que o servidor Express (Cloud Run) serve `dist/` estático** (ver `app.get("*", ...)` em server.ts ~2639 e adicionar `express.static`).
  - Opção B (mais portátil): mover para um bucket do Supabase Storage e referenciar por URL pública/assinada (funciona idêntico nos dois deploys, sem depender de static hosting).
  - Decisão: manter em `public/` se o Cloud Run servir estático; caso contrário, migrar para Supabase Storage. Validar em ambos os ambientes antes de fechar.
- Atualizar `exampleSongs[].audioUrl` para a origem escolhida.

## Fase 10 — Picture-in-Picture global

- Novo componente `src/components/PictureInPictureManager.tsx` montado em `App.tsx` (junto do `MiniPlayer`), usando `useLocation` + `usePlayer`.
- Técnica áudio-only: `<video>` oculto com `srcObject` vindo de `canvas.captureStream()` (canvas desenha capa/visualizer). Ao sair de `/musica/:id` com `isPlaying`, chamar `video.requestPictureInPicture()`. Ao voltar ou parar, `document.exitPictureInPicture()`.
- Feature-detect `document.pictureInPictureEnabled`; se indisponível, manter só `MiniPlayer`.

---

## Fase 10 — Música + foto (R$ 1) — FUTURO (fora do MVP)

Anotar como próxima fase: campo `cover_image` em `orders`/`song_metadata`, upload pós-conclusão, cobrança extra via novo Pix. Não implementar agora.

---

## Arquivos principais afetados

- `server.ts` — migration queries, `/api/chat` (tool name), `/api/speech-to-text` (novo), `/api/tts` (novo), `/api/voice/ws` (novo), queries de `orders` por `user_id`, `DELETE /api/orders/:id/chat` (novo), `cost_logs` `entry_mode`.
- `src/pages/Profile.tsx`→`Menu.tsx`, `src/pages/Friends.tsx` (novo), `src/pages/VoiceAgent.tsx` (novo), `src/pages/MySongs.tsx`, `src/pages/PurchaseHistory.tsx`, `src/pages/ChatHistory.tsx`.
- `src/components/ChatSection.tsx`, `AudioPlayer.tsx`, `PictureInPictureManager.tsx` (novo), `DeleteMusicModal.tsx` (reuso), `MiniPlayer.tsx`.
- `src/pages/Home.tsx` (player de exemplo → PlayerContext), `src/contexts/PlayerContext.tsx`, `src/App.tsx`, `src/types.ts` (talvez `Order.user_id`).
- Assets de exemplo: `public/assets/examples/*.mp3` (ou bucket Supabase Storage, conforme Fase 9). `server.ts` (servir `dist/` estático no Cloud Run).
- `.env` — `OPENAI_API_KEY`, `TTS_PROVIDER` (novos); `GEMINI_API_KEY`/`GROQ_API_KEY` já existem.

## Validação geral

1. `npm run lint` (tsc) passa.
2. Fluxo A: criar música por chat com STT + TTS; nome coletado 1x; checkout ok.
3. Fluxo B: agente realtime conduz entrevista e gera pedido; `entry_mode=agent` logado.
4. PiP abre ao sair de tela com música tocando (Chrome).
5. Exclusões: música e chat com modal de feedback; compras sem botão.
6. `orders.user_id` 100% preenchido; queries não dependem de `email`.
7. Karaoke removido (letra estática).
8. `/amigos` acessível e Menu mostra CTA de indicações.
9. Home: músicas de exemplo tocam pelo PlayerContext global (MiniPlayer/PiP consistentes); assets servidos corretamente em Vercel **e** Cloud Run.

## Riscos / pendências

- Proxy WS Live API + tools é o trecho de maior risco/esforço (Fase 5); se travar, entregar MVP do agente sem tools (transcript → checkout).
- Custo do Live API não é zero — monitorar `cost_logs` por `entry_mode`.
- PiP só funciona em navegadores com suporte (Chrome/Edge); fallback MiniPlayer.
- Migração `orders`: fazer backfill antes de restringir NOT NULL para não órfãos.
