# Plano: Chat estilo WhatsApp + Agente de Voz em tempo real (Gemini native audio)

Projeto **1Música** (React + Vite + Express + Supabase). Contexto mobile-first. Entrevista de composição → checkout (R$ 1,00).

Decisões confirmadas com o usuário:
- **Modelo Live API (decisão validada por teste — ver abaixo):** usar `models/gemini-2.5-flash-native-audio-latest` (nativo, com transcrição + tool calls). É o modelo já configurado no `server.ts` e o amigo estava certo: `gemini-2.5-flash-native-audio-latest` **funciona** no Live API.
- **Chat (`ChatSection.tsx`):** estilo WhatsApp — botão da direita morfa de microfone → avião de papel quando há texto; gravação por **toggle** (clicar inicia, clicar de novo para); placeholder "Gravando áudio..." durante a gravação.
- **TTS no chat escrito:** remover o botão de alto-falante e o uso do `/api/tts` (OpenAI, pago). A fala fica só no modo de ligação de voz.
- **Agente de voz (`/agente`):** reescrever a página como tela de **ligação contínua** usando `models/gemini-2.5-flash-native-audio-latest` (nativo, sem limite no Gemini hoje). Proxy WebSocket no backend já existe (`/api/voice/ws`, server.ts:3134) — **manter a chave server-side** (não expor no browser).
- **Ao desligar:** passar as informações coletadas para o fluxo de checkout (`/checkout/:id`), igual ao chat faz com "Concluir e Compor".

---

## Decisão do modelo Live API (investigada e testada em 2026-07-15)

Dúvida: qual modelo do Live API usar? O amigo sugeriu `gemini-2.5-flash-native-audio-latest`; o usuário cogitou `gemini-3.1-flash-live-preview`. Fiz a checagem em cima da `GEMINI_API_KEY` do projeto:

1. **`models.list` (REST `v1beta/models`):** o ÚNICO modelo dessa chave que lista `bidiGenerateContent` como método suportado é `models/gemini-2.5-flash-native-audio-latest`. Modelos `gemini-3.x-flash-live-*` e `gemini-live-2.5-flash-native-audio` **não aparecem** na lista dessa chave.
2. **Teste real de WebSocket** (`wss://.../BidiGenerateContent?key=...` + `setup`):

   | Modelo | Resultado |
   |---|---|
   | `gemini-2.5-flash-native-audio-latest` | ✅ `setupComplete` |
   | `gemini-3.1-flash-live-preview` | ✅ `setupComplete` (mas não lista no `models.list` desta chave) |
   | `gemini-live-2.5-flash-native-audio` | ❌ fechou code=1008 (modelo do Vertex AI, não Gemini Developer API) |
   | `gemini-2.5-flash-native-audio-preview-12-2025` | ✅ `setupComplete` (preview datado, evitar) |

**Decisão:** manter **`models/gemini-2.5-flash-native-audio-latest`**. Motivos:
- É o modelo que já está configurado e funcionando no `server.ts` (setup com `inputAudioTranscription`, `outputAudioTranscription`, `tools`, geração AUDIO).
- É o alias "latest" mantido (não está na lista de deprecados do `gemini-2.5-flash-native-audio-preview-*`).
- Dá match exato com o `exemplo-livemode.js` e com a captura/playback de PCM 16kHz já desenhados.
- O amigo estava certo: `gemini-2.5-flash-native-audio-latest` funciona no Live API. A sugestão `gemini-3.1-flash-live-preview` também conecta, mas exige ajustes de API (config de `thinkingLevel` em vez de `thinkingBudget`, restrição de `send_client_content`/uso de `send_realtime_input`, e áudio de saída a 24kHz) e fica fora do `models.list` desta chave — melhor como upgrade futuro, não para o MVP.

**Conclusão:** o plano original já apontava o modelo certo. Esta seção apenas torna a escolha explícita e documenta o teste.

---

## Parte 1 — `ChatSection.tsx` (estilo WhatsApp)

Arquivo: `src/components/ChatSection.tsx`.

1. **Remover TTS:**
   - Remover estado `ttsEnabled` (linhas 63-66) e a função `speakText` (linhas 282-306).
   - Remover a chamada `speakText(cleanText)` em `handleSendMessage` (linhas 145-147).
   - Remover o botão TTS do JSX (linhas 478-491).
   - Remover `localStorage` de `umamusica_tts_enabled`.

2. **Botão da direita morfando (mic ↔ avião de papel):**
   - Substituir a fileira de controles (linhas 429-492) por: `[input] [botão único]`.
   - Lógica do botão:
     - `isRecording` → ícone de parar/vermelho pulsante; clique = `stopRecording()`.
     - senão, `inputValue.trim()` preenchido → ícone **Send** (avião de papel, `lucide Send`); clique = `handleSendMessage(inputValue)`.
     - senão → ícone **Mic**; clique = `startRecording()`.
   - Manter `Enter` envia (`onKeyDown`).
   - `disabled` quando `isTyping || isProcessingAudio` (exceto o próprio estado de gravação).

3. **Gravação por toggle (não segurar):**
   - Remover handlers `onMouseDown/onMouseUp/onTouchStart/onTouchEnd` e o comportamento hold-to-record.
   - Criar `toggleRecord()`: se `!isRecording` → `startRecording()`; senão → `stopRecording()`.
   - O fluxo de áudio continua `webm` → `/api/speech-to-text` (Groq Whisper) → `handleSendMessage`, **sem alteração de formato** (isso é a "mensagem de voz" estilo WhatsApp, separada da ligação nativa).

4. **Placeholder:**
   - `isRecording` → `"🔴 Gravando áudio..."`; senão → `"Digite sua mensagem..."`.

5. **Imports:** manter `Send, Mic, MicOff, Loader2, ChevronRight`; remover apenas o que ficar sem uso (nenhum dos citados fica órfão).

---

## Parte 2 — Backend: `/api/voice/ws` (proxy Gemini native audio)

Arquivo: `server.ts` (handler ~linhas 3134-3237).

1. **Modelo:** trocar `models/gemini-2.0-flash-exp` (linha 3166) por `models/gemini-2.5-flash-native-audio-latest`.
2. **Setup:** garantir `realtimeInputConfig` com áudio 16kHz PCM (entrada/saída) — conferir nomes exatos na spec atual do `BidiGenerateContent` v1alpha (referência: `exemplo-livemode.js`). Manter `systemInstruction` (entrevista de composição pt-BR) e `tools` (`save_song_info`, `finish_interview`).
3. **Áudio do cliente → Gemini:** em `clientWs.on("message")`, trocar o envio `mediaChunks` webm (linha 3219) por PCM nativo:
   ```js
   geminiWs.send(JSON.stringify({ realtimeInput: { audio: { data: msg.data, mimeType: msg.mimeType || "audio/pcm;rate=16000" } } }))
   ```
4. **Transcrições + transcript:** em `geminiWs.on("message")`, capturar `serverContent.inputTranscription.text` (usuário) e `serverContent.outputTranscription.text` (IA) e acumular em `session.transcript: ChatMessage[]` (adicionar campo ao `AgentSession`, ~linha 3107). Append se a última mensagem for do mesmo sender, senão push nova.
5. **Fim da entrevista:** ao receber `toolCall` com `finish_interview`, enviar ao cliente:
   ```js
   clientWs.send(JSON.stringify({ type: "interview_complete", transcript: session.transcript }))
   ```
   Forward de `toolCall` para o cliente e de `tool_response` do cliente para o Gemini já existem — manter. Tratar `serverContent.interrupted` (parar reprodução no cliente).
6. **Custo (opcional):** em `finish_interview`, chamar `logCost({ stage: "chat", entry_mode: "agent", model: "gemini-2.5-flash-native-audio-latest" })` para acompanhar `cost_logs`.
7. **Segurança:** a chave continua `process.env.GEMINI_API_KEY` no servidor (server.ts:3151/3158). Não adicionar a chave em nenhum arquivo `src/`.

---

## Parte 3 — `VoiceAgent.tsx` (tela de ligação + motor de áudio nativo)

Arquivo: `src/pages/VoiceAgent.tsx` (reescrever). Referência técnica: `exemplo-livemode.js` (captura PCM, reprodução agendada, barge-in).

1. **Conexão:** `new WebSocket(\`${proto}//${host}/api/voice/ws?session_token=${user.session_token}\`)`. Tratar mensagens `connected`, `gemini` (data), `interview_complete`, `error`.
2. **Captura de microfone (PCM 16k):** `getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`; `AudioContext(16000)`; `ScriptProcessor(4096,1,1)`; converter float→Int16 PCM, base64, enviar `{ type:"audio", data, mimeType:"audio/pcm;rate=16000" }` continuamente enquanto em chamada. (ScriptProcessor é aceitável para MVP; `AudioWorklet` é melhoria futura.)
3. **Reprodução nativa:** em `gemini` → `serverContent.modelTurn.parts`, para `inlineData` com `mimeType` iniciando em `audio/pcm`: decodificar PCM16→Float32 e agendar em `AudioContext` de saída (`nextPlayTime` crescente, como no exemplo). Manter `Set` de fontes ativas; ao receber `interrupted`, parar áudio enfileirado (barge-in). **Não usar `SpeechSynthesis`** (o Gemini já fala).
4. **Tool calls:** ao receber `toolCall`, responder `{ type:"tool_response", responses:[{ id, name, response:{ result:"ok" } }] }` (já existia). Especialmente `finish_interview` → aguardar `interview_complete`.
5. **UI "cognitiva" (dentro de `MobileFrame`):**
   - Header: voltar + título "Ligação".
   - Centro: **dois orbs/avatares** — "Você" (coral `#FF5A5F`) e "Compositor 1Música" (índigo `#6366F1`). Anel pulsante + barras de equalizador que animam e **mudam de cor conforme quem fala** (estado derivado das transcrições: `listening`=usuário, `speaking`=IA, `processing`=transição).
   - **Timer de chamada** (mm:ss) no topo.
   - Painel de **transcrição ao vivo** (rolável, recolhível) alimentado por `inputTranscription`/`outputTranscription`.
   - Rodapé: botão grande de **desligar** (PhoneOff, vermelho) + toggle de **mudo** (opcional).
   - Estados: `idle` ("Ligar") → `connecting` → `in-call` (listening/speaking/processing) → `ended`.
6. **Ao desligar / `interview_complete`:** fechar WS, parar áudio/mic, e **ir direto ao checkout**:
   ```js
   const res = await fetch(`${VITE_API_URL}/api/checkout`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${user.session_token}` }, body: JSON.stringify({ email: user.email, chatTranscript: transcript, structuredPrompt: JSON.stringify(transcript) }) })
   const data = await res.json()
   navigate(`/checkout/${data.orderId}`, { state: { paymentQr: data.paymentQr, paymentCopiaCola: data.paymentCopiaCola, paymentId: data.paymentId } })
   ```
   (Igual a `ChatRoute` em `src/App.tsx:48-81`.) Em erro, mostrar mensagem e voltar ao `/menu`.

---

## Arquivos afetados
- `src/components/ChatSection.tsx` — toggle mic/send, remover TTS.
- `server.ts` — `/api/voice/ws`: modelo native-audio, PCM, transcrições, `interview_complete`, log custo.
- `src/pages/VoiceAgent.tsx` — tela de ligação + motor de áudio nativo (reescrita).
- `src/App.tsx` — sem mudança de rotas (já tem `/agente` e `/checkout/:id`); `Menu.tsx`/`Home.tsx` já linkam `/agente` (rótulo pode virar "Ligar para o Compositor").

---

## Riscos / pendências
- **Campos exatos da Live API v1alpha** (setup `realtimeInputConfig`, nomes de `inlineData`, `audioStreamEnd`): validar contra a spec atual usando `exemplo-livemode.js` como referência funcional.
- **Autoplay policy:** `AudioContext` deve ser `resume()` após o gesto do clique em "Ligar".
- **ScriptProcessor** é depreciado; aceitável para MVP (exemplo usa assim). Migrar para `AudioWorklet` depois se necessário.
- O modelo native audio é contínuo (custo por token de áudio); usuário informou estar sem limite no Gemini hoje — monitorar `cost_logs`.
- `/api/tts` (server.ts:1511) fica órfão após remover o uso no frontend; recomenda-se removê-lo para eliminar custo OpenAI e `OPENAI_API_KEY`.

## Validação
1. `npm run lint` (tsc) passa.
2. **Chat WhatsApp:** microfone na direita morfa para avião quando há texto; clique grava/para (não segurar); placeholder "Gravando áudio..."; botão TTS sumiu; nenhuma chamada a `/api/tts` no network.
3. **Ligação:** `/agente` → "Ligar" → permissão de mic → falar → IA responde **com áudio nativo** (ouve-se); orbs animam e mudam de cor por quem fala; barge-in funciona; desligar → vai para `/checkout/:id`.
4. **Segurança:** `grep -r "GEMINI_API_KEY" src/` não retorna nada (chave só no backend).
5. Custo: `entry_mode=agent` registrado em `cost_logs`.
