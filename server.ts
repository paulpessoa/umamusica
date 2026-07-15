// Server main entrypoint for 1Música platform
import express from "express"
import path from "path"
import fs from "fs"
import dotenv from "dotenv"
import { GoogleGenAI, Type } from "@google/genai"
import { createClient } from "@supabase/supabase-js"
import cors from "cors"
import crypto from "crypto"
import http from "http"
import { WebSocketServer, WebSocket } from "ws"
import { ChatMessage, Order, MusicStatus, SongMetadata } from "./src/types.js"

// Load environment variables
dotenv.config()

const app = express()
app.use(cors())
const PORT = parseInt(process.env.PORT || "3000", 10)

// ─── Brevo API Email Helper (No IP restrictions) ──────────────
async function sendEmailViaBrevo(params: {
  to: string
  subject: string
  htmlContent: string
  fromEmail?: string
  fromName?: string
}) {
  const apiKey = process.env.BREVO_API_KEY
  const fromEmail =
    params.fromEmail ||
    process.env.BREVO_SENDER_EMAIL ||
    "contato@qisites.com.br"
  const fromName = params.fromName || "1Música"

  if (!apiKey) {
    console.warn("[Brevo] API Key not configured. Email not sent.")
    return { success: false, error: "API Key missing" }
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: [{ email: params.to }],
        sender: { email: fromEmail, name: fromName },
        subject: params.subject,
        htmlContent: params.htmlContent
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(
        `[Brevo] Email send failed (${response.status}):`,
        errorBody
      )
      return { success: false, error: errorBody }
    }

    const data = await response.json()
    console.log(`[Brevo] Email sent successfully to ${params.to}`)
    return { success: true, messageId: data.messageId }
  } catch (error: any) {
    console.error("[Brevo] Email send error:", error.message || error)
    return { success: false, error: error.message }
  }
}

// Shared footer template for all system emails
function getEmailFooterHtml() {
  return `
    <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
    <p style="font-size: 12px; color: #666; text-align: center; font-style: italic; margin-bottom: 8px;">
      "Transformando memórias e sentimentos em músicas exclusivas por R$ 1,00."
    </p>
    <p style="font-size: 11px; color: #999; text-align: center; margin: 0; line-height: 1.5;">
      <a href="https://umamusica.vercel.app/termos" style="color: #FF5A5F; text-decoration: none; font-weight: 500;">Termos de Uso</a> &nbsp;•&nbsp;
      <a href="https://umamusica.vercel.app/faq" style="color: #FF5A5F; text-decoration: none; font-weight: 500;">FAQ</a> &nbsp;•&nbsp;
      <a href="https://qisites.com.br/privacidade" style="color: #FF5A5F; text-decoration: none; font-weight: 500;">Privacidade</a>
    </p>
  `
}

// Utility to remove emojis and special formatting
function removeEmojis(text: string): string {
  if (!text) return ""
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F2FE}\u{2600}-\u{26FF}\u{1F004}-\u{1F0CF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/gu,
      ""
    )
    .trim()
}

// Build optimized structured prompt from chat transcript
function buildStructuredPrompt(chatTranscript: ChatMessage[]): any {
  if (!chatTranscript || chatTranscript.length === 0) {
    return null
  }

  // Extract only user messages (skip AI prompts)
  const userMessages = chatTranscript
    .filter((m) => m.sender === "user")
    .map((m) => m.text?.trim() || "")
    .filter((t) => t.length > 0)

  if (userMessages.length === 0) {
    return null
  }

  // Try to extract structured information
  const firstChoice = userMessages[0] || ""
  const recipientName = userMessages[1] || ""
  const keyMemory = userMessages[2] || ""
  const additionalContext = userMessages.slice(3).join(" | ")

  // Detect topic from first choice
  let topic = "Música Personalizada"
  if (firstChoice.includes("romântica") || firstChoice.includes("💑")) {
    topic = "Homenagem romântica"
  } else if (firstChoice.includes("mãe") || firstChoice.includes("👩‍👦")) {
    topic = "Presente para a mãe"
  } else if (
    firstChoice.includes("Aniversário") ||
    firstChoice.includes("🎂")
  ) {
    topic = "Aniversário especial"
  } else if (firstChoice.includes("amigo") || firstChoice.includes("🤝")) {
    topic = "Agradecimento a amigo"
  } else if (firstChoice.includes("pai") || firstChoice.includes("👨")) {
    topic = "Música para o pai"
  } else if (firstChoice.includes("Formatura") || firstChoice.includes("🎓")) {
    topic = "Formatura / conquista"
  } else if (firstChoice.includes("bebê") || firstChoice.includes("👶")) {
    topic = "Nascimento de bebê / Boas-vindas"
  } else if (firstChoice.includes("trabalho") || firstChoice.includes("💼")) {
    topic = "Colega de trabalho / Despedida"
  } else if (firstChoice.includes("futebol") || firstChoice.includes("⚽")) {
    topic = "Paixão pelo time de futebol"
  } else if (firstChoice.includes("moto") || firstChoice.includes("🏍️")) {
    topic = "Clube de moto / Irmandade"
  } else if (firstChoice.includes("igreja") || firstChoice.includes("⛪")) {
    topic = "Amigos da igreja / Fé"
  }

  return {
    topic,
    recipientName,
    keyMemories: [keyMemory, additionalContext].filter((s) => s.length > 0),
    userResponses: userMessages,
    _format: "optimized_v1"
  }
}

// Robustly parse & normalize song metadata JSON returned by any AI provider.
// Groq does not honor responseSchema, so keys may vary in casing/spacing
// (e.g. "Artist Name", "Lyrics"). This maps them to our canonical shape.
function parseSongMetadata(rawText: string): SongMetadata | null {
  if (!rawText) return null
  let text = rawText.trim()

  // Strip markdown code fences if present (```json ... ```)
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  // If there's surrounding prose, extract the outermost JSON object
  if (!text.startsWith("{")) {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      text = text.slice(start, end + 1)
    }
  }

  let obj: any
  try {
    obj = JSON.parse(text)
  } catch {
    return null
  }
  if (!obj || typeof obj !== "object") return null

  // Case/space-insensitive key lookup
  const norm = (k: string) => k.toLowerCase().replace(/[\s_-]/g, "")
  const lookup: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    lookup[norm(key)] = obj[key]
  }
  const pick = (...names: string[]) => {
    for (const n of names) {
      const v = lookup[norm(n)]
      if (v !== undefined && v !== null && v !== "") return v
    }
    return undefined
  }

  const lyrics = pick("lyrics", "letra", "letras")
  if (!lyrics) return null

  let keyMemories = pick("keyMemories", "key memories", "memorias", "memories")
  if (typeof keyMemories === "string") keyMemories = [keyMemories]
  if (!Array.isArray(keyMemories)) keyMemories = []

  return {
    title: pick("title", "titulo") || "Minha Canção",
    artistName: pick("artistName", "artist name", "artista") || "DJ Virtual",
    style: pick("style", "estilo", "genero", "gênero") || "Pop",
    tempo: pick("tempo", "andamento") || "Média",
    vibe: pick("vibe", "tom", "clima") || "Emocionante",
    lyrics: String(lyrics),
    keyMemories,
    dedicatedTo: pick("dedicatedTo", "dedicated to", "dedicadoa", "para") || ""
  } as SongMetadata
}

// Global logger and Brevo notifier
async function logErrorAndNotify(
  error: any,
  req: express.Request,
  errorType: "SAFETY_BLOCK" | "QUOTA_EXCEEDED" | "UNKNOWN",
  userEmail: string | null = null
): Promise<string> {
  const ticketId = crypto.randomUUID()
  const endpoint = `${req.method} ${req.originalUrl}`
  const errorMessage = error.message || String(error)
  const stackTrace = error.stack || ""
  const requestData = {
    error_type: errorType, // stored here because error_logs has no dedicated column
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params
  }

  console.error(
    `[Error Logged - Ticket: ${ticketId}] Endpoint: ${endpoint} | Type: ${errorType} | Msg: ${errorMessage}`
  )

  try {
    // 1. Insert into Supabase error_logs table.
    // NOTE: table has no `error_type` column, so we prefix it into the message
    // and also keep it inside request_data for filtering.
    const { error: insertErr } = await supabase.from("error_logs").insert({
      id: ticketId,
      endpoint,
      user_email: userEmail,
      request_data: requestData,
      error_message: `[${errorType}] ${errorMessage}`,
      stack_trace: stackTrace
    })
    if (insertErr) {
      console.error(
        `[Error Logged] Supabase insert error:`,
        insertErr.message || insertErr
      )
    }
  } catch (dbErr) {
    console.error(`[Error Logged] Failed to save error log in Supabase:`, dbErr)
  }

  // 2. Notify Admin via Brevo
  const adminEmail = "paulmspessoa@gmail.com"
  let subject = `[Ticket ${ticketId.substring(0, 8)}] Erro Crítico no Sistema`
  let alertHeader = "Erro Desconhecido"
  let alertColor = "#dd4b39"
  let actionText = "Verifique os logs no Supabase."

  if (errorType === "SAFETY_BLOCK") {
    subject = `[Ticket ${ticketId.substring(0, 8)}] URGENTE: Bloqueio de Filtro de Segurança (Lyria)`
    alertHeader = "Filtro de Segurança da Google (Lyria) Bloqueou a Geração"
    alertColor = "#ff9800"
    actionText = `O usuário <strong>${userEmail || "desconhecido"}</strong> teve sua letra barrada pela política do Google. O sistema já liberou para que ele edite a letra sem custo adicional.`
  } else if (errorType === "QUOTA_EXCEEDED") {
    subject = `[Ticket ${ticketId.substring(0, 8)}] URGENTE: Cotas de IA Excedidas! Recarregue a Conta!`
    alertHeader = "Cota de Créditos ou Limite do Google/Gemini Atingido"
    alertColor = "#e91e63"
    actionText =
      "<strong>Atenção:</strong> Os limites da API do Google/Gemini foram atingidos. Recarregue a conta do Google Cloud Console o mais rápido possível para reprocessar os pedidos na fila."
  }

  const htmlContent = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #FF5A5F; text-align: center; margin-bottom: 20px;">1Música - Central de Alertas</h2>
      <div style="background: ${alertColor}; color: white; padding: 16px; border-radius: 8px; font-weight: bold; margin-bottom: 20px;">
        ⚠️ ${alertHeader}
      </div>
      <p><strong>ID do Ticket:</strong> <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 4px;">${ticketId}</code></p>
      <p><strong>Endpoint:</strong> <code>${endpoint}</code></p>
      <p><strong>Usuário Afetado:</strong> ${userEmail || "Não especificado"}</p>
      <p><strong>Mensagem do Erro:</strong> <pre style="background: #f9f9f9; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; border: 1px solid #e1e1e1; overflow-x: auto; white-space: pre-wrap;">${errorMessage}</pre></p>
      <p>${actionText}</p>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
      <p style="font-size: 11px; color: #999; text-align: center;">Este é um e-mail automático enviado pela Central de Logs do 1Música.</p>
    </div>
  `

  await sendEmailViaBrevo({
    to: adminEmail,
    subject,
    htmlContent
  })

  return ticketId
}

// Cost per song — used to monitor revenue (R$ 1,00) vs spend (Lyria ~R$ 0,20).
const LYRIA_API_COST = parseFloat(process.env.LYRIA_API_COST || "0.20")

// Lightweight cost logger. Writes to the `cost_logs` table (non-fatal on error).
// Captures token usage from the chat/compose LLM calls and the flat API cost
// of each Lyria music generation so we can compute exact cost-per-song.
async function logCost(params: {
  orderId?: string | null
  email?: string | null
  stage: "chat" | "compose_lyrics" | "music_generation" | "revise"
  provider?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  apiCost?: number | null
  model?: string | null
  notes?: string | null
  entryMode?: string | null
}) {
  try {
    await supabase.from("cost_logs").insert({
      order_id: params.orderId || null,
      email: params.email || null,
      stage: params.stage,
      provider: params.provider || null,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      api_cost: params.apiCost ?? null,
      model: params.model || null,
      notes: params.notes || null,
      entry_mode: params.entryMode || null,
      created_at: new Date().toISOString()
    })
  } catch (e: any) {
    console.error("[CostLog] Insert failed (non-fatal):", e?.message || e)
  }
}

app.use(express.json({ limit: "25mb" }))

// Disable caching for all API responses
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private")
  next()
})

// Simple in-memory rate limiting to prevent email spam & API abuse
const ipLimits: Record<string, { count: number; resetAt: number }> = {}
function rateLimit(limit: number, windowMs: number) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    // Temporarily disabled for testing/feedback phase
    return next()
  }
}

// Initialize Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: { "User-Agent": "aistudio-build" }
  }
})

// Initialize Supabase client (service role — server-only, NEVER expose to frontend)
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)

// Helper to verify session token
async function verifySession(
  req: express.Request,
  res: express.Response
): Promise<{ email: string; userId?: string } | null> {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de sessão ausente ou inválido" })
    return null
  }
  const token = authHeader.split(" ")[1]

  const { data: user, error } = await supabase
    .from("users")
    .select("email, status, id")
    .eq("session_token", token)
    .maybeSingle()

  if (error || !user || user.status !== "active") {
    res.status(401).json({
      error: "Sessão expirada ou inválida. Por favor, faça login novamente."
    })
    return null
  }

  return { email: user.email, userId: user.id }
}

// ============================================================
// AI PROVIDER CONFIG
// ============================================================

// ─── Provider order (provisional) ─────────────────────────────
// Gemini's prepaid credits are depleted, so Groq is the PRIMARY provider for now.
// Flip this back to false when Gemini billing is restored.
const PREFER_GROQ = true

// ─── Google Gemini model (single, good cost-benefit) ─────────
const GEMINI_CHAT_MODEL = "gemini-3.5-flash"

// Legacy/deprecated Gemini names → map to the single current model
const DEPRECATED_GEMINI_MODELS: Record<string, string> = {
  "gemini-1.5-flash": GEMINI_CHAT_MODEL,
  "gemini-1.5-pro": GEMINI_CHAT_MODEL,
  "gemini-2.0-flash": GEMINI_CHAT_MODEL,
  "gemini-2.0-flash-lite": GEMINI_CHAT_MODEL,
  "gemini-flash-latest": GEMINI_CHAT_MODEL,
  "gemini-3.5-flash-latest": GEMINI_CHAT_MODEL,
  "gemini-3.1-flash-lite": GEMINI_CHAT_MODEL
}

// ─── Groq model (single, best cost-benefit for chat) ─────────
const GROQ_CHAT_MODEL = "llama-3.1-8b-instant"

// Normalize: replace any deprecated/legacy model name with the current equivalent
function normalizeGeminiModel(model: string): string {
  return DEPRECATED_GEMINI_MODELS[model] ?? model
}

// ─── Groq call (OpenAI-compatible API) ───────────────────────
async function callGroq(params: {
  model?: string
  contents: any[]
  config?: any
  tools?: any
}): Promise<{
  text: string
  usage: { inputTokens: number | null; outputTokens: number | null }
  toolCalls?: any
}> {
  const groqApiKey = process.env.GROQ_API_KEY
  if (!groqApiKey) throw new Error("GROQ_API_KEY not configured")

  // Convert Gemini-style contents → OpenAI messages
  const messages: any[] = []
  if (params.config?.systemInstruction) {
    messages.push({ role: "system", content: params.config.systemInstruction })
  }
  for (const c of params.contents) {
    // support plain-string contents (used by music generation)
    if (typeof c === "string") {
      messages.push({ role: "user", content: c })
      continue
    }
    const role = c.role === "model" ? "assistant" : "user"
    const text = c.parts?.map((p: any) => p.text || "").join("") || ""
    if (text) messages.push({ role, content: text })
  }

  const model = GROQ_CHAT_MODEL
  const body: any = {
    model,
    messages,
    temperature: params.config?.temperature ?? 0.8,
    max_tokens: 2048
  }
  // If the caller asked for JSON, enable Groq's JSON mode
  if (params.config?.responseMimeType === "application/json") {
    body.response_format = { type: "json_object" }
  }
  // OpenAI-format function calling tools
  if (params.tools) {
    body.tools = params.tools
    body.tool_choice = "auto"
  }

  console.log(`[AI] Trying Groq model: ${model}...`)
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq ${model} error ${res.status}: ${err}`)
  }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ""
  console.log(`[AI] Groq model ${model} succeeded`)
  return {
    text,
    toolCalls: data.choices?.[0]?.message?.tool_calls ?? null,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? null,
      outputTokens: data.usage?.completion_tokens ?? null
    }
  }
}

// ─── Single Gemini attempt ───────────────────────────────────
async function callGemini(params: {
  model: string
  contents: any[]
  config?: any
  tools?: any
}) {
  const modelName = normalizeGeminiModel(params.model)
  console.log(`[AI] Trying Gemini model: ${modelName}...`)
  const result = await ai.models.generateContent({
    model: modelName,
    contents: params.contents,
    config: params.config
  })
  return {
    text: result.text || "",
    functionCalls: (result as any).functionCalls ?? null,
    usage: {
      inputTokens: result.usageMetadata?.promptTokenCount ?? null,
      outputTokens: result.usageMetadata?.candidatesTokenCount ?? null
    }
  }
}

// ─── Main AI dispatcher ───────────────────────────────────────
// Provisional order: Groq first (Gemini credits depleted), Gemini as fallback.
// Flip PREFER_GROQ to false to restore Gemini-first when billing returns.
async function generateContentWithFallback(params: {
  model: string
  contents: any[]
  config?: any
  tools?: any
}) {
  const primary = PREFER_GROQ ? "groq" : "gemini"
  const run = async (p: "groq" | "gemini") => {
    const base =
      p === "groq"
        ? await callGroq(params)
        : await callGemini(params)
    return { ...base, provider: p }
  }

  let primaryError: any = null
  try {
    return await run(primary)
  } catch (error: any) {
    primaryError = error
    console.error(
      `[AI] Primary provider (${primary}) FAILED → status=${error?.status || "n/a"} | ${error?.message?.slice(0, 200) || error}`
    )
    // A safety block should NOT trigger fallback — propagate immediately
    const msg = (error?.message || "").toLowerCase()
    if (
      error?.status === "SAFETY" ||
      msg.includes("safety") ||
      msg.includes("blocked") ||
      msg.includes("prohibited")
    ) {
      throw error
    }
  }

  const secondary = primary === "groq" ? "gemini" : "groq"
  console.warn(`[AI] Falling back to secondary provider (${secondary})...`)
  try {
    return await run(secondary)
  } catch (secondaryError: any) {
    console.error(
      `[AI] Secondary provider (${secondary}) FAILED → ${secondaryError?.message?.slice(0, 200) || secondaryError}`
    )
    const groqErr = primary === "groq" ? primaryError : secondaryError
    const geminiErr = primary === "gemini" ? primaryError : secondaryError
    const agg = new Error(
      `All AI providers failed. Groq: ${groqErr?.message || groqErr}. Gemini: ${geminiErr?.status || "n/a"} ${geminiErr?.message || geminiErr}.`
    )
    ;(agg as any).providerErrors = {
      groq: { message: groqErr?.message || String(groqErr) },
      gemini: { status: geminiErr?.status, message: geminiErr?.message }
    }
    throw agg
  }
}

// Classify an AI provider error into a debuggable type + user-facing message
function classifyAIError(error: any): {
  type: string
  userMessage: string
  technical: string
} {
  const msg = (error?.message || String(error) || "").toLowerCase()
  const status = error?.status
  const providerErrors = error?.providerErrors

  // Quota / billing / credits exhausted (Gemini 429 / RESOURCE_EXHAUSTED)
  if (
    status === "RESOURCE_EXHAUSTED" ||
    msg.includes("quota") ||
    msg.includes("429") ||
    msg.includes("credit") ||
    msg.includes("billing") ||
    msg.includes("depleted")
  ) {
    return {
      type: "QUOTA_EXCEEDED",
      userMessage:
        "Nossos modelos de IA atingiram o limite de uso no momento. Já estamos cientes e ele voltará em breve. Tente novamente em alguns minutos.",
      technical: `Gemini credits/quota exhausted (429). ${providerErrors?.gemini?.message || error?.message || ""}`
    }
  }

  // Safety filter
  if (
    status === "SAFETY" ||
    msg.includes("safety") ||
    msg.includes("blocked") ||
    msg.includes("prohibited")
  ) {
    return {
      type: "SAFETY_BLOCK",
      userMessage:
        "Sua mensagem pode ter violado as diretrizes de conteúdo da IA. Tente reformular sem termos ofensivos.",
      technical: `Safety filter triggered. ${error?.message || ""}`
    }
  }

  // Model removed / not found / decommissioned
  if (
    msg.includes("not found") ||
    msg.includes("404") ||
    msg.includes("decommissioned") ||
    msg.includes("does not exist")
  ) {
    return {
      type: "MODEL_UNAVAILABLE",
      userMessage:
        "Houve um problema de configuração nos modelos de IA. A equipe técnica já foi notificada.",
      technical: `Model unavailable. Gemini: ${providerErrors?.gemini?.message || "n/a"} | Groq: ${providerErrors?.groq?.message || "n/a"}`
    }
  }

  // Auth / invalid key
  if (
    msg.includes("invalid") ||
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("api key") ||
    msg.includes("unauthorized") ||
    msg.includes("permission")
  ) {
    return {
      type: "AUTH_ERROR",
      userMessage:
        "Falha de autenticação com o provedor de IA. Verifique as chaves de API no servidor.",
      technical: `Auth/key error. ${error?.message || ""}`
    }
  }

  return {
    type: "UNKNOWN",
    userMessage:
      "Opa, tive um pequeno problema para responder agora. Pode tentar novamente em alguns instantes?",
    technical: providerErrors
      ? `Gemini: ${JSON.stringify(providerErrors.gemini)} | Groq: ${JSON.stringify(providerErrors.groq)}`
      : error?.message || String(error)
  }
}

// ============================================================
// API ROUTES
// ============================================================

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Referral Info
app.get("/api/invite/:code", async (req, res) => {
  try {
    const { code } = req.params
    if (!code) {
      return res.status(400).json({ error: "Code required" })
    }
    const cleanCode = code.trim().toUpperCase()
    const { data: user, error } = await supabase
      .from("users")
      .select("email")
      .eq("referral_code", cleanCode)
      .single()

    if (error || !user) {
      return res.status(404).json({ error: "Invite not found" })
    }

    // Mask the email for privacy (e.g paul***@gmail.com)
    const emailParts = user.email.split("@")
    if (emailParts.length === 2) {
      const namePart = emailParts[0]
      const domainPart = emailParts[1]

      let maskedName = ""

      // Se tiver 3 ou mais caracteres, mostra o primeiro, asteriscos e o último
      if (namePart.length >= 3) {
        const firstLetter = namePart[0]
        const lastLetter = namePart[namePart.length - 1]
        maskedName = firstLetter + "***" + lastLetter
      } else if (namePart.length === 2) {
        // Se tiver só 2 (ex: pa@gm.com), mostra a primeira e bota asterisco na última
        maskedName = namePart[0] + "*"
      } else {
        // Se tiver só 1 letra (ex: p@gm.com), apenas põe o asterisco
        maskedName = namePart + "*"
      }

      return res.json({ email: `${maskedName}@${domainPart}` })
    }

    return res.json({ email: user.email })
  } catch (error) {
    console.error("Invite error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// ─── Feedback Endpoint ────────────────────────────────────────
app.post("/api/feedback", async (req, res) => {
  try {
    const { email, category, relatedOrderId, reasonCategory, reasonDetails } =
      req.body

    if (!email || !category) {
      return res
        .status(400)
        .json({ error: "Email e categoria são obrigatórios" })
    }

    const { error } = await supabase.from("feedback").insert({
      user_email: email.toLowerCase().trim(),
      category,
      related_order_id: relatedOrderId || null,
      reason_category: reasonCategory || null,
      reason_details: reasonDetails || null
    })

    if (error) {
      console.error("[Feedback] Insert error:", error)
      return res.status(500).json({ error: "Erro ao salvar feedback" })
    }

    console.log(`[Feedback] Recebido de ${email}: ${category}`)
    res.json({ success: true })
  } catch (error: any) {
    console.error("Feedback Error:", error.message || error)
    res.status(500).json({ error: "Erro ao processar feedback" })
  }
})

// ─── Admin: Migrate Orders to User ID ────────────────────────────────
app.post("/api/admin/migrate-orders-userid", async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"]

    // Simple protection: check for admin key
    if (adminKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    console.log("[Migration] Starting order user_id migration...")

    // Get all orders without user_id
    const { data: ordersToMigrate } = await supabase
      .from("orders")
      .select("id, email")
      .is("user_id", null)
      .limit(1000)

    if (!ordersToMigrate || ordersToMigrate.length === 0) {
      return res.json({ success: true, message: "Nenhuma ordem para migrar" })
    }

    let successCount = 0
    for (const order of ordersToMigrate) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", order.email)
        .single()

      if (user?.id) {
        await supabase
          .from("orders")
          .update({ user_id: user.id })
          .eq("id", order.id)
        successCount++
      }
    }

    console.log(
      `[Migration] ✅ ${successCount}/${ordersToMigrate.length} migradas`
    )
    res.json({
      success: true,
      migrated: successCount,
      total: ordersToMigrate.length
    })
  } catch (error: any) {
    console.error("[Migration] Error:", error.message)
    res.status(500).json({ error: "Erro na migração" })
  }
})

// ─── Admin: Cost Logs (revenue vs spend monitor) ───────────
app.get("/api/admin/cost-logs", async (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"]
    const authHeader =
      req.headers["authorization"] || req.headers["Authorization"]
    const bearer =
      typeof authHeader === "string"
        ? authHeader.replace(/^Bearer\s+/i, "").trim()
        : ""

    const validKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.ADMIN_DASHBOARD_KEY ||
      ""
    const adminEmails = (process.env.ADMIN_EMAILS || "paulmspessoa@gmail.com")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

    let authorized = !!adminKey && adminKey === validKey

    if (!authorized && bearer) {
      const { data: adminUser } = await supabase
        .from("users")
        .select("email")
        .eq("session_token", bearer)
        .single()
      if (
        adminUser &&
        adminEmails.includes((adminUser.email || "").toLowerCase())
      ) {
        authorized = true
      }
    }

    if (!authorized) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    const { data: rows, error } = await supabase
      .from("cost_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) {
      return res.status(500).json({ error: "Erro ao ler custos" })
    }

    // Aggregates
    let totalCost = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let musicGenerations = 0
    for (const r of rows || []) {
      totalCost += Number(r.api_cost || 0)
      totalInputTokens += Number(r.input_tokens || 0)
      totalOutputTokens += Number(r.output_tokens || 0)
      if (r.stage === "music_generation") musicGenerations++
    }

    // Revenue = only REAL Mercado Pago payments (numeric payment_id).
    // Coupons, simulated (local) and free-balance orders are 100% off (free).
    const { data: completedOrders, error: coErr } = await supabase
      .from("orders")
      .select("payment_id")
      .eq("status", "completed")

    if (coErr) {
      return res.status(500).json({ error: "Erro ao ler pedidos" })
    }

    const isMercadoPago = (pid?: string | null) => !!pid && /^\d+$/.test(pid)
    const paidOrders = (completedOrders || []).filter((o: any) =>
      isMercadoPago(o.payment_id)
    ).length
    const completedCount = (completedOrders || []).length

    const revenue = paidOrders * 1.0

    res.json({
      summary: {
        totalCost: Number(totalCost.toFixed(4)),
        revenue: Number(revenue.toFixed(2)),
        net: Number((revenue - totalCost).toFixed(2)),
        avgCostPerSong:
          musicGenerations > 0
            ? Number((totalCost / musicGenerations).toFixed(4))
            : 0,
        totalInputTokens,
        totalOutputTokens,
        musicGenerations,
        completedOrders: completedCount || 0,
        paidOrders,
        targetCostPerSong: LYRIA_API_COST
      },
      rows: rows || []
    })
  } catch (error: any) {
    console.error("[Admin Cost Logs] Error:", error?.message || error)
    res.status(500).json({ error: "Erro interno" })
  }
})

// ─── OTP Email Verification ────────────────────────────────
app.post("/api/send-otp", rateLimit(5, 10 * 60 * 1000), async (req, res) => {
  try {
    const { email } = req.body
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email inválido" })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    // Store OTP in Supabase
    await supabase.from("otp_codes").insert({
      email: email.toLowerCase().trim(),
      code,
      expires_at: expiresAt.toISOString()
    })

    // Determine frontend URL for the magic link (same 10-min validity as the code)
    const frontendUrl =
      process.env.FRONTEND_URL ||
      (req.headers.origin as string | undefined) ||
      "https://1musica.com"
    const magicLink = `${frontendUrl}/login?email=${encodeURIComponent(
      email.toLowerCase().trim()
    )}&token=${code}`

    // Send via Brevo API (no IP restrictions!)
    await sendEmailViaBrevo({
      to: email,
      subject: "Código de verificação",
      htmlContent: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; text-align: center;">
          <h2 style="color: #FF5A5F; margin-bottom: 8px;">1Música</h2>
          <p style="color: #555; font-size: 14px;">Seu código de verificação é:</p>
          <div style="background: #FFF0F0; border: 2px solid #FF5A5F; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FF5A5F; font-family: monospace;">${code}</span>
          </div>
          <a href="${magicLink}" style="display: inline-block; background: #FF5A5F; color: #fff; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 12px; font-size: 14px; margin: 8px 0 20px;">Entrar com 1 clique</a>
          <p style="color: #888; font-size: 12px;">Este código expira em 10 minutos.<br/>Se você não solicitou este código, ignore este e-mail.</p>
          ${getEmailFooterHtml()}
        </div>
      `
    })

    res.json({ success: true })
  } catch (error: any) {
    console.error("OTP Send Error:", error.message || error)
    res.status(500).json({ error: "Erro ao enviar código de verificação" })
  }
})

app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body
    if (!email || !code) {
      return res.status(400).json({ error: "Email e código são obrigatórios" })
    }

    const { data, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("code", code)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) {
      return res.status(400).json({ error: "Código inválido ou expirado" })
    }

    // Mark as verified
    await supabase
      .from("otp_codes")
      .update({ verified: true })
      .eq("id", data[0].id)

    const sessionToken = crypto.randomUUID()

    // Check if user exists
    const cleanEmail = email.toLowerCase().trim()
    let user: any = null
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, name, referral_code, free_songs_balance, status")
      .eq("email", cleanEmail)
      .single()

    if (userData) {
      user = userData
    }

    if (user && user.status === "trash") {
      // Reactivate account
      await supabase
        .from("users")
        .update({
          status: "active",
          deleted_at: null,
          session_token: sessionToken
        })
        .eq("id", user.id)
      user.status = "active"
      user.session_token = sessionToken
    } else if (user) {
      // Save session token for existing active user
      await supabase
        .from("users")
        .update({ session_token: sessionToken })
        .eq("id", user.id)
      user.session_token = sessionToken
    }

    if (!user) {
      // Create new user
      const { referralCode } = req.body
      let referredBy = null
      let initialBalance = 0

      if (referralCode) {
        const { data: refUser } = await supabase
          .from("users")
          .select("id, email, free_songs_balance")
          .eq("referral_code", referralCode.trim().toUpperCase())
          .single()
        if (refUser) {
          referredBy = refUser.id
          initialBalance = 1 // Invited user gets 1 free song immediately

          // Check monthly limit for referrer (max 5 friends/songs per month)
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)

          const { count } = await supabase
            .from("users")
            .select("id", { count: "exact" })
            .eq("referred_by", referredBy)
            .gte("created_at", startOfMonth.toISOString())

          if (count === null || count < 5) {
            // Referrer gets 1 free song
            await supabase
              .from("users")
              .update({
                free_songs_balance: (refUser.free_songs_balance || 0) + 1
              })
              .eq("id", referredBy)

            // Send notification email to referrer via Brevo API
            await sendEmailViaBrevo({
              to: refUser.email,
              subject: "Você ganhou 1 música grátis!",
              htmlContent: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; text-align: center;">
                  <h2 style="color: #FF5A5F; margin-bottom: 8px;">1Música</h2>
                  <p style="color: #555; font-size: 14px;">Boas notícias! Um amigo acabou de se cadastrar usando seu link.</p>
                  <div style="background: #FFF0F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
                    <span style="font-size: 24px; font-weight: bold; color: #FF5A5F;">+1 Música Grátis</span>
                  </div>
                  <p style="color: #888; font-size: 12px;">Seu novo saldo já está disponível na sua conta.</p>
                  ${getEmailFooterHtml()}
                </div>
              `
            })
          }
        }
      }

      const newReferralCode = Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()

      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          email: cleanEmail,
          referral_code: newReferralCode,
          referred_by: referredBy,
          free_songs_balance: initialBalance,
          session_token: sessionToken
        })
        .select(
          "id, email, name, referral_code, free_songs_balance, session_token"
        )
        .single()

      if (!createError && newUser) {
        user = newUser
      }
    }

    res.json({ success: true, verified: true, user })
  } catch (error: any) {
    console.error("OTP Verify Error:", error.message || error)
    res.status(500).json({ error: "Erro ao verificar código" })
  }
})

// ─── Get Current User ──────────────────────────────────────
app.get("/api/users/me", async (req, res) => {
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const email = req.query.email as string
    if (!email) {
      return res.status(400).json({ error: "Email obrigatório" })
    }

    if (email.toLowerCase().trim() !== verified.email.toLowerCase().trim()) {
      return res.status(403).json({ error: "Acesso proibido." })
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, name, referral_code, free_songs_balance")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: "Usuário não encontrado" })
    }

    const userId = user.id
    const { data: orders } = await supabase
      .from("orders")
      .select(
        "id, song_metadata, audio_storage_path, payment_id, chat_transcript, status, created_at, user_id"
      )
      .in("status", [
        "completed",
        "paid",
        "pending_payment",
        "processing",
        "failed_safety"
      ])
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    // Fetch referred contacts (masked for privacy)
    const { data: referredUsers } = await supabase
      .from("users")
      .select("id, email, created_at")
      .eq("referred_by", user.id)
      .order("created_at", { ascending: false })

    const maskedReferred = (referredUsers || []).map((u) => ({
      id: u.id,
      email: u.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
      created_at: u.created_at
    }))

    res.json({ user, orders: orders || [], referredUsers: maskedReferred })
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao buscar usuário" })
  }
})

// ─── Chat Interview (Text) ────────────────────────────────
app.post("/api/chat", rateLimit(40, 10 * 60 * 1000), async (req, res) => {
  try {
    const { messages, email, name } = req.body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Mensagens inválidas" })
    }

    // Optional personalized name (used by the agent when relevant)
    const nameLine =
      name && typeof name === "string" && name.trim()
        ? `\nO nome deste usuário (opcional, use apenas se fizer sentido para personalizar a conversa): ${name.trim()}.`
        : ""

    const nameGuidance = name
      ? ""
      : `\nATENÇÃO: Você AINDA NÃO sabe o nome do usuário. Em algum momento natural e amigável da conversa (de preferência no início), pergunte como ele gosta de ser chamado UMA ÚNICA VEZ. Quando ele responder o nome, chame a ferramenta save_user_name com o nome informado e continue a entrevista normalmente. Nunca peça o nome de novo depois de saber.`

    const systemInstruction = `
Você é o Compositor Virtual do 1Música, um assistente caloroso, simpático e super criativo que ajuda pessoas a criarem músicas personalizadas e emocionantes para quem amam. Não mencione em hipótese alguma valores, preços (como R$ 1,00) ou métodos de pagamento.
Seu objetivo é conduzir uma entrevista rápida, calorosa e engajadora com o usuário para capturar todas as informações necessárias para gerar a música: contextos detalhados, apelidos, memórias marcantes, piadas internas e histórias reais.
${nameLine}${nameGuidance}
Instruções:
1. Faça perguntas de forma interativa e amigável. Explore detalhes poéticos e curiosidades.
2. Adapte-se ao estilo do usuário (descontraído com quem usa emojis, polido com quem é formal).
3. Faça apenas uma pergunta clara por vez para manter a conversa dinâmica.
4. Responda sempre em Português do Brasil.
5. Se o usuário usar termos ofensivos ou conteúdo impróprio, advirta educadamente que isso pode impedir a geração da música.
6. Quando tiver informações suficientes e o usuário estiver satisfeito, parabenize-o e diga que ele já pode clicar em "Finalizar e Compor".
7. Sempre que a sua resposta apresentar uma LISTA DE OPÇÕES ou ESCALHAS para o usuário (estilos musicais, homenageados, ocasiões, sentimentos, etc.), ofereça-as como botões clicáveis. Para isso, termine a resposta com exatamente um marcador \`[OPCOES: "Opção A" | "Opção B" | "Opção C"]\` (máximo 4 opções, curtas e diretas, com no máximo ~4 palavras cada). Não use este marcador se não houver escolhas claras.
`

    // ─── Tool: salvar o nome do usuário (function calling) ───
    const SAVE_NAME_PARAMETERS = {
      type: "OBJECT",
      properties: {
        name: {
          type: "STRING",
          description:
            "O nome ou apelido pelo qual o usuário quer ser chamado"
        }
      },
      required: ["name"]
    }
    const geminiTools = [
      {
        functionDeclarations: [
          {
            name: "save_user_name",
            description:
              "Salva o nome de preferência do usuário para personalizar a conversa. Use APENAS quando o usuário informar explicitamente como quer ser chamado.",
            parameters: SAVE_NAME_PARAMETERS
          }
        ]
      }
    ]
    const openaiTools = [
      {
        type: "function",
        function: {
          name: "save_user_name",
          description:
            "Salva o nome de preferência do usuário para personalizar a conversa. Use APENAS quando o usuário informar explicitamente como quer ser chamado.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description:
                  "O nome ou apelido pelo qual o usuário quer ser chamado"
              }
            },
            required: ["name"]
          }
        }
      }
    ]

    const chatContents = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }))

    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: { systemInstruction, temperature: 0.8 },
      tools: PREFER_GROQ ? openaiTools : geminiTools
    })

    let aiText = response.text || "Desculpe, pode repetir?"

    // ─── Handle save_user_name tool call ─────────────────────
    let nameSaved: string | null = null
    const toolCalls: any[] =
      (response as any).functionCalls || (response as any).toolCalls || []
    if (Array.isArray(toolCalls) && toolCalls.length) {
      const call = toolCalls.find(
        (t: any) => (t.name || t.function?.name) === "save_user_name"
      )
      if (call) {
        const rawArgs = call.args || call.function?.arguments
        let args: any = rawArgs
        if (typeof rawArgs === "string") {
          try {
            args = JSON.parse(rawArgs)
          } catch {
            args = {}
          }
        }
        const newName = (args?.name || "").toString().trim().slice(0, 60)
        if (newName && email) {
          try {
            await supabase
              .from("users")
              .update({ name: newName })
              .eq("email", email.toLowerCase().trim())
            nameSaved = newName

            // Second (tool-free) call to get the model's closing reply.
            const followContents = [
              ...chatContents,
              {
                role: "user",
                parts: [
                  {
                    text: `O usuário informou o nome dele: "${newName}". Confirme de forma curta e amigável que você já sabe como chamá-lo e continue a entrevista de composição normalmente.`
                  }
                ]
              }
            ]
            const r2 = await generateContentWithFallback({
              model: "gemini-3.5-flash",
              contents: followContents,
              config: { systemInstruction, temperature: 0.8 }
            })
            if (r2.text) aiText = r2.text
          } catch (e: any) {
            console.error("[Chat] Falha ao salvar nome:", e?.message || e)
          }
        }
      }
    }

    // Cost logging: capture chat composition token usage per message.
    await logCost({
      email: email || null,
      stage: "chat",
      provider: response.provider || "groq",
      inputTokens: response.usage?.inputTokens ?? null,
      outputTokens: response.usage?.outputTokens ?? null,
      model: "gemini-3.5-flash",
      entryMode: "chat"
    })

    res.json({
      text: aiText,
      nameSaved: nameSaved ? true : false,
      name: nameSaved || undefined
    })
  } catch (error: any) {
    const { type, userMessage, technical } = classifyAIError(error)
    console.error(
      `[Chat] Erro ao processar conversa | type=${type} | ${technical}`
    )
    res.status(500).json({
      error: userMessage,
      errorType: type,
      detail: technical
    })
  }
})

// ─── Chat Voice (Audio message — like WhatsApp) ────────────
app.post("/api/chat-voice", rateLimit(25, 10 * 60 * 1000), async (req, res) => {
  try {
    const { audio, mimeType, messages, email } = req.body
    if (!audio) {
      return res.status(400).json({ error: "Áudio é obrigatório" })
    }

    const systemInstruction = `
Você é o Compositor Virtual do 1Música. Você recebeu um áudio do usuário.
Transcreva o áudio e continue a entrevista para coletar informações para a música personalizada.
Responda de forma curta (2-3 frases) e faça uma pergunta por vez.
Responda em Português do Brasil.
Se o usuário usar termos impróprios, advirta educadamente.
Retorne JSON com: userTranscript, aiResponse, triggerCompose (true se tiver tudo).
`

    const chatContents = (messages || [])
      .filter((m: any) => m.text && m.text.trim())
      .map((m: any) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      }))

    chatContents.push({
      role: "user",
      parts: [
        { inlineData: { mimeType: mimeType || "audio/webm", data: audio } },
        {
          text: "Transcreva o áudio acima em português do Brasil e continue a entrevista de composição."
        }
      ]
    })

    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            userTranscript: { type: Type.STRING },
            aiResponse: { type: Type.STRING },
            triggerCompose: { type: Type.BOOLEAN }
          },
          required: ["userTranscript", "aiResponse", "triggerCompose"]
        }
      }
    })

    const dataText = response.text?.trim() || "{}"
    let parsedData: any = {}
    try {
      parsedData = JSON.parse(dataText)
    } catch {
      parsedData = {
        userTranscript: "Áudio enviado",
        aiResponse: dataText || "Interessante! Me conta mais?",
        triggerCompose: false
      }
    }

    res.json({
      userTranscript: parsedData.userTranscript || "Áudio enviado",
      aiResponse: parsedData.aiResponse || "Entendido! Vamos em frente.",
      triggerCompose: !!parsedData.triggerCompose
    })
  } catch (error: any) {
    const { type, userMessage, technical } = classifyAIError(error)
    console.error(
      `[Voice Chat] Erro ao processar áudio | type=${type} | ${technical}`
    )
    res.status(500).json({
      error: userMessage,
      errorType: type,
      detail: technical
    })
  }
})

// ─── Speech-to-Text (Groq Whisper) ───────────────────────────
app.post("/api/speech-to-text", rateLimit(20, 10 * 60 * 1000), async (req, res) => {
  try {
    const { audio, mimeType } = req.body
    if (!audio) {
      return res.status(400).json({ error: "Áudio é obrigatório" })
    }

    const groqApiKey = process.env.GROQ_API_KEY
    if (!groqApiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY não configurada" })
    }

    // Convert base64 to Buffer
    const audioBuffer = Buffer.from(audio, "base64")

    // Build multipart form data for Groq Whisper
    const form = new FormData()
    form.append("file", new Blob([audioBuffer], { type: mimeType || "audio/webm" }), "audio.webm")
    form.append("model", "whisper-large-v3")
    form.append("language", "pt")
    form.append("response_format", "json")

    const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`
      },
      body: form
    })

    if (!whisperRes.ok) {
      const errText = await whisperRes.text()
      console.error("[Whisper] Error:", whisperRes.status, errText)
      return res.status(500).json({ error: "Erro na transcrição de áudio" })
    }

    const whisperData = await whisperRes.json()
    const transcript = whisperData.text?.trim() || ""

    res.json({ transcript })
  } catch (error: any) {
    console.error("[Speech-to-Text] Error:", error?.message || error)
    res.status(500).json({ error: "Erro ao processar áudio" })
  }
})

// ─── Text-to-Speech (OpenAI TTS with SpeechSynthesis fallback) ──
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice } = req.body
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Texto é obrigatório" })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    const provider = (process.env.TTS_PROVIDER || "openai").toLowerCase()

    // If OpenAI key is configured, use OpenAI TTS API
    if (openaiKey && provider === "openai") {
      const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text.trim(),
          voice: voice || "alloy",
          response_format: "mp3"
        })
      })

      if (!ttsRes.ok) {
        const errText = await ttsRes.text()
        console.error("[TTS] OpenAI error:", ttsRes.status, errText)
        return res.status(500).json({ error: "Erro ao gerar áudio TTS" })
      }

      const audioBuffer = await ttsRes.arrayBuffer()
      const base64Audio = Buffer.from(audioBuffer).toString("base64")
      res.json({ audio: base64Audio, mimeType: "audio/mp3", provider: "openai" })
      return
    }

    // Fallback: return text for browser SpeechSynthesis
    res.json({ text: text.trim(), provider: "browser" })
  } catch (error: any) {
    console.error("[TTS] Error:", error?.message || error)
    res.status(500).json({ error: "Erro ao gerar áudio" })
  }
})

// ─── Checkout (MercadoPago Pix) ────────────────────────────
app.post("/api/checkout", async (req, res) => {
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const { email, chatTranscript, structuredPrompt } = req.body
    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório" })
    }

    if (email.toLowerCase().trim() !== verified.email.toLowerCase().trim()) {
      return res.status(403).json({ error: "Acesso proibido." })
    }

    // Build optimized structured prompt
    const optimizedPrompt = buildStructuredPrompt(chatTranscript || [])

    const orderId = "order_" + Math.random().toString(36).substr(2, 9)
    let paymentId = "pay_" + Math.random().toString(36).substr(2, 15)
    let paymentQr = ""
    let paymentCopiaCola = ""
    let status: MusicStatus = "pending_payment"

    const cleanEmail = email.toLowerCase().trim()

    // Check if user has free balance
    const { data: user } = await supabase
      .from("users")
      .select("id, free_songs_balance")
      .eq("email", cleanEmail)
      .single()

    const hasBalance = user && user.free_songs_balance > 0

    if (hasBalance) {
      console.log(
        `[Checkout] User ${cleanEmail} has balance. Using 1 free song.`
      )
      await supabase
        .from("users")
        .update({ free_songs_balance: user.free_songs_balance - 1 })
        .eq("id", user.id)

      paymentId = "bonus_balance_" + Math.random().toString(36).substr(2, 9)
      status = "paid"
    } else {
      // Do NOT call MercadoPago here. Let the user choose to generate the Pix on-demand on the checkout screen.
      paymentId = "pending_mp_" + Math.random().toString(36).substr(2, 9)
    }

    // Save order in Supabase
    const newOrder = {
      id: orderId,
      email: cleanEmail,
      user_id: verified.userId || null,
      chat_transcript: chatTranscript || [],
      structured_prompt: optimizedPrompt, // ✅ Using optimized format
      payment_id: paymentId,
      payment_qr: paymentQr,
      payment_copia_e_cola: paymentCopiaCola,
      status: status
    }

    const { error: insertError } = await supabase
      .from("orders")
      .insert(newOrder)
    if (insertError) {
      console.error("[Supabase] Insert error:", insertError)
    }

    // Strip sensitive/unnecessary data from response
    res.json({
      orderId,
      paymentId: hasBalance ? paymentId : undefined,
      paymentQr: undefined,
      paymentCopiaCola: undefined,
      status
    })
  } catch (error) {
    console.error("Checkout Error:", error)
    res.status(500).json({ error: "Erro ao gerar cobrança Pix" })
  }
})

// ─── Generate Pix On-Demand ─────────────────────────────────
app.post("/api/orders/:id/generate-pix", async (req, res) => {
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const { id } = req.params
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !order) {
      return res.status(404).json({ error: "Pedido não encontrado" })
    }

    // Verify ownership by user_id (preferred) or email (legacy fallback)
    const isOwner =
      (order.user_id && verified.userId && order.user_id === verified.userId) ||
      order.email === verified.email.toLowerCase().trim()

    if (!isOwner) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    if (order.status !== "pending_payment") {
      return res
        .status(400)
        .json({ error: "Este pedido não está pendente de pagamento." })
    }

    // If order already has a valid payment QR code, just return it
    if (
      order.payment_qr &&
      order.payment_copia_e_cola &&
      !order.payment_id.startsWith("pending_mp")
    ) {
      return res.json({
        paymentId: order.payment_id,
        paymentQr: order.payment_qr,
        paymentCopiaCola: order.payment_copia_e_cola
      })
    }

    let paymentId = "pay_" + Math.random().toString(36).substr(2, 15)
    let paymentQr = ""
    let paymentCopiaCola = ""

    const mpToken = process.env.ML_TOKEN || process.env.ML_TOKEN_TEST
    if (mpToken) {
      try {
        console.log(`[MercadoPago] Creating Pix payment for order ${id}...`)
        const mpResponse = await fetch(
          "https://api.mercadopago.com/v1/payments",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${mpToken}`,
              "X-Idempotency-Key": id
            },
            body: JSON.stringify({
              transaction_amount: 1.0,
              description: "Música Personalizada — 1Música",
              payment_method_id: "pix",
              payer: { email: order.email },
              external_reference: id
            })
          }
        )

        if (mpResponse.ok) {
          const mpData: any = await mpResponse.json()
          paymentId = mpData.id?.toString() || paymentId
          paymentQr =
            mpData.point_of_interaction?.transaction_data?.qr_code_base64 || ""
          paymentCopiaCola =
            mpData.point_of_interaction?.transaction_data?.qr_code || ""
          console.log(`[MercadoPago] Pix generated: ${paymentId}`)
        } else {
          const errBody = await mpResponse.text()
          console.warn(`[MercadoPago] Error ${mpResponse.status}:`, errBody)
        }
      } catch (e: any) {
        console.warn("[MercadoPago] Connection failed:", e.message)
      }
    }

    // Fallback QR for testing
    if (!paymentQr) {
      const mockPix = `00020126580014br.gov.bcb.pix0136unamusica-${id}52040000530398654041.005802BR`
      paymentQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mockPix)}`
      paymentCopiaCola = mockPix
    }

    // Update order in Supabase
    await supabase
      .from("orders")
      .update({
        payment_id: paymentId,
        payment_qr: paymentQr,
        payment_copia_e_cola: paymentCopiaCola
      })
      .eq("id", id)

    res.json({
      paymentId,
      paymentQr,
      paymentCopiaCola
    })
  } catch (error) {
    console.error("Generate Pix error:", error)
    res.status(500).json({ error: "Erro ao gerar PIX" })
  }
})

// ─── Logout ──────────────────────────────────────────────
app.post("/api/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1]
      await supabase
        .from("users")
        .update({ session_token: null })
        .eq("session_token", token)
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Erro ao efetuar logout" })
  }
})

// ─── Get Order Status ──────────────────────────────────────
app.get("/api/orders/:id", async (req, res) => {
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, email, user_id, status, song_metadata, audio_storage_path, payment_id, payment_qr, payment_copia_e_cola, created_at"
      )
      .eq("id", req.params.id)
      .single()

    if (error || !order) {
      return res.status(404).json({ error: "Pedido não encontrado" })
    }

    // Verify ownership by user_id (preferred) or email (legacy fallback)
    const isOwner =
      (order.user_id && verified.userId && order.user_id === verified.userId) ||
      order.email === verified.email.toLowerCase().trim()

    if (!isOwner) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    res.json(order)
  } catch (error: any) {
    res.status(500).json({ error: "Erro ao buscar pedido" })
  }
})

// ─── Simulate Payment (Testing) ────────────────────────────
app.post("/api/orders/:id/simulate-payment", async (req, res) => {
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const { id } = req.params
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, email, user_id")
      .eq("id", id)
      .single()

    if (error || !order) {
      return res.status(404).json({ error: "Pedido não encontrado" })
    }

    const isOwner =
      (order.user_id && verified.userId && order.user_id === verified.userId) ||
      order.email === verified.email.toLowerCase().trim()

    if (!isOwner) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updateError) {
      return res.status(404).json({ error: "Pedido não encontrado" })
    }
    res.json({ status: "paid", success: true })
  } catch (error) {
    res.status(500).json({ error: "Erro ao simular pagamento" })
  }
})

// ─── Apply Coupon ──────────────────────────────────────────
app.post("/api/orders/:id/apply-coupon", async (req, res) => {
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const { id } = req.params
    const { coupon } = req.body
    const cleanCoupon = coupon ? coupon.trim().toUpperCase() : ""

    // Check in the coupons table
    const { data: couponData, error: couponError } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", cleanCoupon)
      .single()

    if (!couponData || couponError) {
      return res.status(400).json({ error: "Cupom inválido ou inexistente" })
    }

    if (couponData.current_uses >= couponData.max_uses) {
      return res
        .status(400)
        .json({ error: "O limite de uso deste cupom foi atingido" })
    }

    if (couponData.expires_at && new Date(couponData.expires_at) < new Date()) {
      return res.status(400).json({ error: "Este cupom já expirou" })
    }

    // Fetch current order to verify ownership and see if it has a Mercado Pago payment to cancel
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, email, user_id, payment_id")
      .eq("id", id)
      .single()

    if (orderError || !orderData) {
      return res.status(404).json({ error: "Pedido não encontrado" })
    }

    const isOwner =
      (orderData.user_id && verified.userId && orderData.user_id === verified.userId) ||
      orderData.email === verified.email.toLowerCase().trim()

    if (!isOwner) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    if (orderData && orderData.payment_id) {
      const isMPPayment = /^\d+$/.test(orderData.payment_id) // Mercado Pago payment IDs are purely numeric
      const mpToken = process.env.ML_TOKEN || process.env.ML_TOKEN_TEST
      if (isMPPayment && mpToken) {
        try {
          console.log(
            `[Coupon] Cancelling Mercado Pago payment ${orderData.payment_id} since coupon was applied...`
          )
          await fetch(
            `https://api.mercadopago.com/v1/payments/${orderData.payment_id}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${mpToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ status: "cancelled" })
            }
          )
        } catch (err: any) {
          console.error(
            "[Coupon] Failed to cancel Mercado Pago payment:",
            err.message
          )
        }
      }
    }

    // Apply coupon
    await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_id:
          `coupon_${cleanCoupon}_` + Math.random().toString(36).substr(2, 6),
        updated_at: new Date().toISOString()
      })
      .eq("id", id)

    // Increment usage
    await supabase
      .from("coupons")
      .update({ current_uses: couponData.current_uses + 1 })
      .eq("code", cleanCoupon)

    res.json({
      success: true,
      status: "paid",
      message: "Cupom aplicado com sucesso!"
    })
  } catch (error) {
    res.status(500).json({ error: "Erro ao aplicar cupom" })
  }
})

// ─── MercadoPago Webhook ───────────────────────────────────
app.post("/api/webhook/mercadopago", async (req, res) => {
  try {
    const { action, data: webhookData } = req.body
    console.log("[Webhook MP] Received:", action)

    if (action === "payment.updated" || action === "payment.created") {
      const paymentId = webhookData?.id
      if (!paymentId) return res.json({ received: true })

      // Fetch payment details from MercadoPago
      const mpToken = process.env.ML_TOKEN || process.env.ML_TOKEN_TEST
      if (mpToken) {
        const paymentRes = await fetch(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          {
            headers: { Authorization: `Bearer ${mpToken}` }
          }
        )
        if (paymentRes.ok) {
          const payment: any = await paymentRes.json()
          if (payment.status === "approved") {
            const externalRef = payment.external_reference
            if (externalRef) {
              await supabase
                .from("orders")
                .update({
                  status: "paid",
                  updated_at: new Date().toISOString()
                })
                .eq("id", externalRef)
              console.log(`[Webhook MP] Order ${externalRef} paid!`)
            }
          }
        }
      }
    }
    res.json({ received: true })
  } catch (error) {
    console.error("Webhook Error:", error)
    res.status(500).json({ error: "Webhook failed" })
  }
})

// ─── Generate audio for an order (sandbox demo vs real Lyria) ─
async function generateLyriaForOrder(order: any, metadata: SongMetadata): Promise<string> {
  const isMockPayment =
    !order.payment_id ||
    order.payment_id.startsWith("mock") ||
    order.payment_id.startsWith("simulated")
  let audioStoragePath: string | null = null

  if (isMockPayment) {
    console.log("[Music Generation] Sandbox/Coupon mode: copying local example file...")
    let localFileName = "bodas_de_diamante.mp3"
    const styleLower = (metadata.style || "").toLowerCase()
    if (
      styleLower.includes("sertanejo") ||
      styleLower.includes("paizao") ||
      styleLower.includes("sertanejo-do-paizao")
    ) {
      localFileName = "sertanejo-do-paizao.mp3"
    } else if (
      styleLower.includes("pop") ||
      styleLower.includes("faculdade") ||
      styleLower.includes("amor_de_faculdade")
    ) {
      localFileName = "amor_de_faculdade.mp3"
    }

    const possiblePaths = [
      path.join(process.cwd(), "assets", "examples", localFileName),
      path.join(process.cwd(), "dist", "assets", "examples", localFileName),
      path.join(process.cwd(), "src", "assets", "examples", localFileName)
    ]

    let fileBuffer: Buffer | null = null
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        fileBuffer = fs.readFileSync(p)
        break
      }
    }

    if (fileBuffer) {
      const filePath = `${order.id}.mp3`
      const { error: uploadError } = await supabase.storage
        .from("songs")
        .upload(filePath, fileBuffer, {
          contentType: "audio/mpeg",
          upsert: true
        })
      if (!uploadError) audioStoragePath = filePath
    }
  } else {
    // Real transaction: Call Google Lyria.
    console.log("[Music Generation] Real transaction. Attempting Lyria API call...")
    const cleanLyrics = removeEmojis(metadata.lyrics)
      .replace(
        /\[Intro\]|\[Verso \d+\]|\[Refrão\]|\[Ponte\]|\[Outro\]|\[Pré-Refrão\]/gi,
        ""
      )
      .replace(/\((.*?)\)/g, "")
      .trim()

    const cleanStyle = removeEmojis(metadata.style || "")
    const cleanTempo = removeEmojis(metadata.tempo || "")
    const cleanVibe = removeEmojis(metadata.vibe || "")

    const lyriaPrompt = `Uma canção em português no estilo ${cleanStyle}, andamento ${cleanTempo}, tom ${cleanVibe}. Letra: ${cleanLyrics}`
    console.log(
      `[Music Generation] Submitting cleaned prompt to Lyria: "${lyriaPrompt.substring(0, 150)}..."`
    )

    const lyriaResponse = await (ai as any).interactions.create({
      model: "models/lyria-3-pro-preview",
      input: lyriaPrompt
    })

    if (lyriaResponse?.output_audio?.data) {
      const audioBuffer = Buffer.from(
        lyriaResponse.output_audio.data,
        "base64"
      )
      const filePath = `${order.id}.mp3`
      const { error: uploadError } = await supabase.storage
        .from("songs")
        .upload(filePath, audioBuffer, {
          contentType: lyriaResponse.output_audio.mime_type || "audio/mpeg",
          upsert: true
        })
      if (!uploadError) {
        audioStoragePath = filePath
      } else {
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }
    } else {
      throw new Error("Lyria response audio output is empty")
    }
  }

  if (!audioStoragePath) {
    throw new Error("Audio generation failed: file path is null")
  }
  return audioStoragePath
}

// ─── Draft metadata (lyrics + style) from the interview ────
// Generates the song metadata (title, artist, style, tempo, vibe, lyrics) and
// attaches a stable `seed`, `style_tags` and `instrumental_metadata`. These are
// preserved across lyric edits so that re-generating the audio keeps the exact
// same musical style/identity (consistency guardrail).
async function generateDraftMetadata(order: any): Promise<SongMetadata | null> {
  const transcriptText = (order.chat_transcript || [])
    .map((m: any) => `${m.sender === "user" ? "Cliente" : "IA"}: ${m.text}`)
    .join("\n")

  const analysisPrompt = `
Gere as informações completas para uma música personalizada baseada nesta entrevista:
---
${transcriptText}
---

Retorne APENAS um objeto JSON válido (sem markdown, sem texto extra) com EXATAMENTE estas chaves em minúsculo:
{
  "title": "Título cativante (máx 5 palavras, em português)",
  "artistName": "Nome artístico virtual",
  "style": "Estilo musical",
  "tempo": "Lenta, Média ou Rápida",
  "vibe": "Tom emocional (ex: Emocionante, Romântica)",
  "lyrics": "Letra COMPLETA estruturada em estrofes e versos. Use quebras de linha (\\n) entre os versos e quebras duplas (\\n\\n) entre as seções ([Intro], [Verso 1], [Pré-Refrão], [Refrão], [Verso 2], [Refrão Final], [Outro]). NUNCA um bloco único, sempre bem dividida. NUNCA use emojis.",
  "keyMemories": ["memória 1", "memória 2"],
  "dedicatedTo": "Nome/apelido da pessoa homenageada"
}
`

  const modelResponse = await generateContentWithFallback({
    model: "gemini-3.5-flash",
    contents: [analysisPrompt],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          artistName: { type: Type.STRING },
          style: { type: Type.STRING },
          tempo: { type: Type.STRING },
          vibe: { type: Type.STRING },
          lyrics: {
            type: Type.STRING,
            description:
              "Letra completa da música estruturada de forma clara em estrofes e versos, usando quebras de linha (\\n) entre os versos e quebras de linha duplas (\\n\\n) entre as seções ([Intro], [Verso 1], etc.) para que fique perfeitamente formatada em parágrafos."
          },
          keyMemories: { type: Type.ARRAY, items: { type: Type.STRING } },
          dedicatedTo: { type: Type.STRING }
        },
        required: [
          "title",
          "artistName",
          "style",
          "tempo",
          "vibe",
          "lyrics",
          "keyMemories",
          "dedicatedTo"
        ]
      }
    }
  })

  // Log the composition cost (chat/compose LLM token usage).
  if (modelResponse.usage) {
    await logCost({
      orderId: order.id,
      email: order.email,
      stage: "compose_lyrics",
      provider: modelResponse.provider || "groq",
      inputTokens: modelResponse.usage.inputTokens ?? null,
      outputTokens: modelResponse.usage.outputTokens ?? null,
      model: "gemini-3.5-flash"
    })
  }

  const base = parseSongMetadata(modelResponse.text || "")
  if (!base || !base.lyrics) return null

  return {
    ...base,
    // Stable seed + style tags preserved across lyric edits for consistency.
    seed: Math.floor(Math.random() * 1_000_000_000),
    style_tags: [base.style, base.tempo, base.vibe],
    instrumental_metadata: {
      style: base.style,
      tempo: base.tempo,
      vibe: base.vibe
    }
  }
}

// ─── Compose lyrics only (post-payment draft) ──────────────
// After a successful Pix payment we do NOT generate audio immediately. We
// compose the lyrics draft, persist it and move the order to `lyrics_review`
// so the user can review/edit before we ever call Lyria.
app.post("/api/orders/:id/compose-lyrics", async (req, res) => {
  let order: any = null
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", req.params.id)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Pedido não encontrado" })
    }
    order = data

    const isOwner =
      (order.user_id && verified.userId && order.user_id === verified.userId) ||
      order.email === verified.email.toLowerCase().trim()

    if (!isOwner) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    if (order.status !== "paid") {
      return res
        .status(400)
        .json({ error: "Pedido não está pronto para composição." })
    }

    // Atomic: paid -> lyrics_review
    const { data: locked, error: lockErr } = await supabase
      .from("orders")
      .update({ status: "lyrics_review", updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("status", "paid")
      .select()
    if (lockErr || !locked || locked.length === 0) {
      return res
        .status(400)
        .json({ error: "A composição já foi iniciada por outra requisição." })
    }

    const metadata = await generateDraftMetadata(order)
    if (!metadata) throw new Error("Falha ao compor a letra da música.")

    await supabase
      .from("orders")
      .update({ song_metadata: metadata })
      .eq("id", order.id)

    res.json({ status: "lyrics_review", song_metadata: metadata })
  } catch (error: any) {
    console.error("[Compose Lyrics] Error:", error?.message || error)
    // Revert to paid so the user can retry the composition.
    if (order) {
      await supabase
        .from("orders")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", order.id)
    }
    res.status(500).json({ error: "Erro ao compor a letra. Tente novamente." })
  }
})

// ─── Generate Music ────────────────────────────────────────
app.post("/api/orders/:id/generate", async (req, res) => {
  let fetchedOrder: any = null
  let songMetadata: SongMetadata | null = null
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const { lyrics: customLyrics } = req.body

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", req.params.id)
      .single()

    if (fetchError || !order) {
      return res.status(404).json({ error: "Pedido não encontrado" })
    }
    fetchedOrder = order

    const isOwner =
      (order.user_id && verified.userId && order.user_id === verified.userId) ||
      order.email === verified.email.toLowerCase().trim()

    if (!isOwner) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    // Check current status before starting generation
    if (order.status === "completed") {
      return res.json(order)
    }
    if (order.status === "processing") {
      return res
        .status(400)
        .json({ error: "A música já está sendo gerada. Por favor, aguarde." })
    }
    if (order.status === "failed") {
      return res
        .status(400)
        .json({ error: "Este pedido falhou e já foi estornado." })
    }
    if (
      order.status !== "paid" &&
      order.status !== "failed_safety" &&
      order.status !== "lyrics_review"
    ) {
      return res
        .status(400)
        .json({ error: "O pedido não está pronto para geração." })
    }

    // Set order status to processing conditionally (atomic update)
    const { data: updatedRows, error: updateError } = await supabase
      .from("orders")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .in("status", ["paid", "failed_safety", "lyrics_review"])
      .select()

    if (updateError || !updatedRows || updatedRows.length === 0) {
      return res
        .status(400)
        .json({ error: "A geração já foi iniciada por outra requisição." })
    }

    // Determine metadata and lyrics
    if (
      customLyrics &&
      typeof customLyrics === "string" &&
      customLyrics.trim()
    ) {
      // Bypassing Gemini: User updated lyrics directly
      console.log(
        `[Music Generation] Bypassing Gemini. Using user-supplied edited lyrics.`
      )
      const existingMetadata = (order.song_metadata || {}) as SongMetadata
      songMetadata = {
        title: existingMetadata.title || "Minha Canção",
        artistName: existingMetadata.artistName || "DJ Virtual",
        style: existingMetadata.style || "Pop",
        tempo: existingMetadata.tempo || "Média",
        vibe: existingMetadata.vibe || "Feliz",
        keyMemories: existingMetadata.keyMemories || [],
        dedicatedTo: existingMetadata.dedicatedTo || "",
        // Consistency guardrail: keep the same seed, style_tags and
        // instrumental_metadata from the initial draft so the music style
        // stays identical — only the words change.
        seed: existingMetadata.seed,
        style_tags: existingMetadata.style_tags,
        instrumental_metadata: existingMetadata.instrumental_metadata,
        lyrics: customLyrics
      }
    } else {
      // Compose lyrics + style directly from the interview transcript.
      // generateDraftMetadata also logs the composition cost.
      songMetadata = await generateDraftMetadata(order)
    }

    if (!songMetadata || !songMetadata.lyrics) {
      throw new Error("Falha ao estruturar os metadados ou letras da música.")
    }

    const audioStoragePath = await generateLyriaForOrder(order, songMetadata)

    // Cost logging: flat API cost per Lyria music generation (~R$ 0,20).
    await logCost({
      orderId: order.id,
      email: order.email,
      stage: "music_generation",
      provider: "lyria",
      apiCost: LYRIA_API_COST,
      model: "lyria-3-pro-preview"
    })

    // Save metadata and path, set status to completed
    await supabase
      .from("orders")
      .update({
        song_metadata: songMetadata,
        audio_storage_path: audioStoragePath,
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id)

    // Send email with download link via Brevo API
    const isProduction = process.env.NODE_ENV === "production"
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      (isProduction
        ? "https://umamusica.vercel.app"
        : `http://localhost:${PORT}`)
    const apiUrl =
      process.env.API_URL ||
      process.env.APP_URL ||
      (isProduction
        ? "https://umamusica-369350924489.us-east1.run.app"
        : `http://localhost:${PORT}`)

    await sendEmailViaBrevo({
      to: order.email,
      subject: `Sua música "${songMetadata.title}" está pronta!`,
      htmlContent: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px;">
          <h2 style="color: #FF5A5F; text-align: center;">1Música</h2>
          <p>Olá!</p>
          <p>Sua música personalizada <strong>"${songMetadata.title}"</strong> ficou pronta!</p>
          <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="margin: 0; color: #333;">${songMetadata.title}</h3>
            <p style="margin: 5px 0; color: #666; font-size: 14px;">Estilo: ${songMetadata.style} • Por: ${songMetadata.artistName}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/musica/${order.id}" style="background: #FF5A5F; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ouvir e Baixar Música</a>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${apiUrl}/api/orders/${order.id}/download" style="color: #666; font-size: 13px;">Download direto do MP3 →</a>
          </div>
          ${getEmailFooterHtml()}
        </div>
      `
    })

    const { data: updatedOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order.id)
      .single()

    res.json(
      updatedOrder || {
        ...order,
        song_metadata: songMetadata,
        status: "completed"
      }
    )
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    let errorType: "SAFETY_BLOCK" | "QUOTA_EXCEEDED" | "UNKNOWN" = "UNKNOWN"

    if (
      errorMsg.toLowerCase().includes("blocked") ||
      errorMsg.toLowerCase().includes("prohibited") ||
      errorMsg.toLowerCase().includes("safety") ||
      (error.status === 400 && errorMsg.toLowerCase().includes("input"))
    ) {
      errorType = "SAFETY_BLOCK"
    } else if (
      errorMsg.toLowerCase().includes("quota") ||
      errorMsg.toLowerCase().includes("429") ||
      errorMsg.toLowerCase().includes("limit") ||
      error.status === 429
    ) {
      errorType = "QUOTA_EXCEEDED"
    }

    const ticketId = await logErrorAndNotify(
      error,
      req,
      errorType,
      fetchedOrder?.email
    )

    if (fetchedOrder) {
      if (errorType === "SAFETY_BLOCK") {
        // If safety block: save the metadata so they can edit the lyrics, set status to failed_safety (DO NOT REFUND PIX)
        await supabase
          .from("orders")
          .update({
            status: "failed_safety",
            song_metadata: songMetadata || fetchedOrder.song_metadata,
            updated_at: new Date().toISOString()
          })
          .eq("id", fetchedOrder.id)

        return res.status(400).json({
          error:
            "A letra foi bloqueada pelo filtro de segurança da IA. Você pode ajustá-la e tentar novamente.",
          errorType: "SAFETY_BLOCK",
          ticketId,
          songMetadata: songMetadata || fetchedOrder.song_metadata
        })
      }

      // For quota or unknown issues: Mark as failed and trigger standard refund process
      const { data: updatedRows, error: updateError } = await supabase
        .from("orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", fetchedOrder.id)
        .eq("status", "processing")
        .select()

      if (updateError || !updatedRows || updatedRows.length === 0) {
        console.log(
          `[Refund] Order ${fetchedOrder.id} status was already updated. Skipping refund to prevent duplicates.`
        )
        return res.status(500).json({
          error: "Erro ao compor a música. Estorno já processado.",
          ticketId
        })
      }

      // A real Mercado Pago payment id is purely numeric. Everything else
      // (pay_, mock, simulated, coupon_, bonus_balance_, pending_mp_) is internal
      // and must NOT be sent to the refund API.
      const isRealPayment =
        !!fetchedOrder.payment_id && /^\d+$/.test(fetchedOrder.payment_id)

      const mpToken = process.env.ML_TOKEN || process.env.ML_TOKEN_TEST

      if (isRealPayment && mpToken) {
        console.log(
          `[Refund] Processing refund for order ${fetchedOrder.id} (payment: ${fetchedOrder.payment_id})...`
        )
        try {
          const refundRes = await fetch(
            `https://api.mercadopago.com/v1/payments/${fetchedOrder.payment_id}/refunds`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${mpToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({})
            }
          )

          if (refundRes.ok) {
            console.log(
              `[Refund] MercadoPago refund successful for payment ${fetchedOrder.payment_id}`
            )
          } else {
            const refundErrText = await refundRes.text()
            console.error(`[Refund] MercadoPago refund failed:`, refundErrText)
          }
        } catch (refundErr: any) {
          console.error(
            `[Refund] Connection error trying to refund:`,
            refundErr.message || refundErr
          )
        }
      }

      // Send email explaining the refund/cancellation via Brevo API
      const emailSubject = isRealPayment
        ? "⚠️ Estorno efetuado — Falha na geração da sua música"
        : "⚠️ Pedido cancelado — Falha na geração da sua música"

      const emailHtml = isRealPayment
        ? `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px;">
          <h2 style="color: #FF5A5F; text-align: center;">1Música</h2>
          <h3 style="color: #dd4b39; text-align: center; margin-top: 0;">Infelizmente ocorreu um erro de processamento</h3>
          <p>Olá,</p>
          <p>Pedimos imensas desculpas. Devido a uma instabilidade temporária no nosso motor de composição de inteligência artificial, não foi possível gerar a sua canção personalizada.</p>
          <p>Para sua total segurança e conforme prometido, <strong>um estorno integral do valor de R$ 1,00 já foi processado automaticamente</strong> de volta para a sua conta Pix no Mercado Pago.</p>
          <p>O valor deve constar na sua conta em alguns minutos (Ticket: ${ticketId.substring(0, 8)}).</p>
          <p>Se tiver qualquer dúvida, entre em contato respondendo a este e-mail ou enviando mensagem para <strong>contato@qisites.com.br</strong>.</p>
          <br/>
          ${getEmailFooterHtml()}
        </div>
      `
        : `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px;">
          <h2 style="color: #FF5A5F; text-align: center;">1Música</h2>
          <h3 style="color: #dd4b39; text-align: center; margin-top: 0;">Infelizmente ocorreu um erro de processamento</h3>
          <p>Olá,</p>
          <p>Pedimos imensas desculpas. Devido a uma instabilidade temporária no nosso motor de composição de inteligência artificial, não foi possível gerar a sua canção personalizada.</p>
          <p>Como este pedido foi iniciado de forma gratuita (via cupom ou testes), nenhuma cobrança foi realizada e sua compra foi cancelada com sucesso (Ticket: ${ticketId.substring(0, 8)}).</p>
          <p>Se tiver qualquer dúvida, entre em contato respondendo a este e-mail ou enviando mensagem para <strong>contato@qisites.com.br</strong>.</p>
          <br/>
          ${getEmailFooterHtml()}
        </div>
      `

      await sendEmailViaBrevo({
        to: fetchedOrder.email,
        subject: emailSubject,
        htmlContent: emailHtml
      })
    }

    res.status(500).json({
      error: "Erro ao compor a música. Estorno processado automaticamente.",
      errorType,
      ticketId
    })
  }
})

// ─── Revise Lyrics with AI (clean content flagged by safety) ─
app.post("/api/orders/:id/revise", async (req, res) => {
  let fetchedOrder: any = null
  let songMetadata: SongMetadata | null = null
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", req.params.id)
      .single()

    if (fetchError || !order) {
      return res.status(404).json({ error: "Pedido não encontrado" })
    }
    fetchedOrder = order

    const isOwner =
      (order.user_id && verified.userId && order.user_id === verified.userId) ||
      order.email === verified.email.toLowerCase().trim()

    if (!isOwner) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    if (!["paid", "completed", "failed_safety"].includes(order.status)) {
      return res
        .status(400)
        .json({ error: "Este pedido não pode ser revisado agora." })
    }

    // Lock to processing
    const { data: updatedRows, error: updateError } = await supabase
      .from("orders")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .in("status", ["paid", "completed", "failed_safety"])
      .select()
    if (updateError || !updatedRows || updatedRows.length === 0) {
      return res
        .status(400)
        .json({ error: "A revisão já foi iniciada por outra requisição." })
    }

    const transcriptText = (order.chat_transcript || [])
      .map((m: any) => `${m.sender === "user" ? "Cliente" : "IA"}: ${m.text}`)
      .join("\n")
    const currentLyrics = order.song_metadata?.lyrics || ""

    const revisePrompt = `
Você é o editor do 1Música. A letra abaixo (gerada a partir da entrevista) pode ter sido parcialmente recusada pelo filtro de segurança do Google AI Studio / Lyria. Reescreva a letra mantendo EXATAMENTE o mesmo tema, estilo, homenageado, memórias e tom emocional, mas removendo/reenquadrando qualquer conteúdo que viole as diretrizes do Lyria.

REGRAS DO LYRIA (Google AI Studio) — conteúdo seguro e familiar-friendly:
- Sem sexualidade explícita, violência gráfica, discurso de ódio ou drogas.
- Sem difamação de marcas ou pessoas reais.
- Linguagem respeitosa; mantenha poesia e emoção com palavras permitidas.

CONTEXTO DA ENTREVISTA COM O CLIENTE:
---
${transcriptText}
---

LETRA ATUAL (que pode ter reprovado):
---
${currentLyrics}
---

Retorne APENAS um objeto JSON válido (sem markdown) com EXATAMENTE estas chaves em minúsculo:
{
  "title": "Título cativante (máx 5 palavras, em português)",
  "artistName": "Nome artístico virtual",
  "style": "Estilo musical",
  "tempo": "Lenta, Média ou Rápida",
  "vibe": "Tom emocional (ex: Emocionante, Romântica)",
  "lyrics": "Letra COMPLETA limpa e segura, estruturada em estrofes e versos com quebras de linha (\\n) entre versos e quebras duplas (\\n\\n) entre seções ([Intro], [Verso 1], [Refrão], [Verso 2], [Refrão Final], [Outro]). NUNCA em bloco único. NUNCA use emojis.",
  "keyMemories": ["memória 1", "memória 2"],
  "dedicatedTo": "Nome/apelido da pessoa homenageada"
}
`

    const modelResponse = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: [revisePrompt],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artistName: { type: Type.STRING },
            style: { type: Type.STRING },
            tempo: { type: Type.STRING },
            vibe: { type: Type.STRING },
            lyrics: { type: Type.STRING },
            keyMemories: { type: Type.ARRAY, items: { type: Type.STRING } },
            dedicatedTo: { type: Type.STRING }
          },
          required: [
            "title",
            "artistName",
            "style",
            "tempo",
            "vibe",
            "lyrics",
            "keyMemories",
            "dedicatedTo"
          ]
        }
      }
    })

    const songMetadata = parseSongMetadata(modelResponse.text || "")
    if (!songMetadata || !songMetadata.lyrics) {
      throw new Error("Falha ao reestruturar a letra revisada.")
    }

    const audioStoragePath = await generateLyriaForOrder(order, songMetadata)

    await logCost({
      orderId: order.id,
      email: order.email,
      stage: "music_generation",
      provider: "lyria",
      apiCost: LYRIA_API_COST,
      model: "lyria-3-pro-preview"
    })

    const { data: updatedOrder } = await supabase
      .from("orders")
      .update({
        song_metadata: songMetadata,
        audio_storage_path: audioStoragePath,
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id)
      .select()
      .single()

    res.json(updatedOrder || { ...order, song_metadata: songMetadata, status: "completed" })
  } catch (error: any) {
    const { type, userMessage, technical } = classifyAIError(error)
    console.error(
      `[Revise] ❌ Erro ao revisar (order ${fetchedOrder?.id}) | type=${type} | ${technical}`
    )
    if (fetchedOrder) {
      await supabase
        .from("orders")
        .update({ status: "failed_safety", updated_at: new Date().toISOString() })
        .eq("id", fetchedOrder.id)
    }
    res.status(500).json({ error: userMessage, errorType: type, detail: technical })
  }
})

// ─── Download (Signed URL — never expose Supabase directly) ─
app.get("/api/orders/:id/download", async (req, res) => {
  try {
    let verified = await verifySession(req, res)
    let verifiedByToken = false

    if (!verified) {
      const tokenFromQuery = (req.query.token as string | undefined) || ""
      if (tokenFromQuery) {
        const { data: tokenUser, error: tokenError } = await supabase
          .from("users")
          .select("email, status, id")
          .eq("session_token", tokenFromQuery)
          .maybeSingle()

        if (!tokenError && tokenUser && tokenUser.status === "active") {
          verified = { email: tokenUser.email, userId: tokenUser.id }
          verifiedByToken = true
        }
      }
    }

    if (!verified) return

    const { data: order } = await supabase
      .from("orders")
      .select("audio_storage_path, song_metadata, status, email, user_id")
      .eq("id", req.params.id)
      .single()

    if (!order || order.status !== "completed") {
      return res
        .status(404)
        .json({ error: "Música não encontrada ou ainda em processamento" })
    }

    const isOwner =
      (order.user_id && verified.userId && order.user_id === verified.userId) ||
      order.email === verified.email.toLowerCase().trim()

    if (!isOwner) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    if (!order.audio_storage_path) {
      return res.status(404).json({ error: "Arquivo de áudio não disponível" })
    }

    // Generate signed URL (expires in 60 minutes)
    const { data: signedUrl, error } = await supabase.storage
      .from("songs")
      .createSignedUrl(order.audio_storage_path, 3600)

    if (error || !signedUrl) {
      return res.status(500).json({ error: "Erro ao gerar link de download" })
    }

    res.redirect(signedUrl.signedUrl)
  } catch (error) {
    console.error("Download Error:", error)
    res.status(500).json({ error: "Erro no download" })
  }
})

// ─── Delete Current User (Soft Delete to Trash Bin) ──────────
app.post("/api/users/me/delete", async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: "Email obrigatório" })
    }

    const { error } = await supabase
      .from("users")
      .update({
        status: "trash",
        deleted_at: new Date().toISOString()
      })
      .eq("email", email.toLowerCase().trim())

    if (error) {
      return res
        .status(400)
        .json({ error: "Erro ao agendar exclusão da conta" })
    }

    res.json({
      success: true,
      message: "Conta agendada para exclusão com sucesso."
    })
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Erro interno no servidor ao deletar usuário" })
  }
})

// ─── Update current user profile (optional name) ───────────
app.post("/api/users/me/update", async (req, res) => {
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const { name } = req.body
    const cleanName =
      typeof name === "string" && name.trim().length <= 60
        ? name.trim()
        : null

    const { data: updated, error } = await supabase
      .from("users")
      .update({ name: cleanName })
      .eq("email", verified.email.toLowerCase().trim())
      .select("id, email, name, referral_code, free_songs_balance")
      .single()

    if (error || !updated) {
      return res.status(500).json({ error: "Erro ao atualizar perfil" })
    }

    res.json({ success: true, user: updated })
  } catch (error: any) {
    console.error("Update profile error:", error.message || error)
    res.status(500).json({ error: "Erro ao atualizar perfil" })
  }
})

// ─── Delete Order (Soft Delete) ────────────────────────────────
app.delete("/api/orders/:id", async (req, res) => {
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const { id } = req.params
    const { reasonCategory, reasonDetails } = req.body

    // Get order to verify ownership
    const { data: order, error: queryError } = await supabase
      .from("orders")
      .select("id, email, user_id")
      .eq("id", id)
      .single()

    if (queryError || !order) {
      return res.status(404).json({ error: "Pedido não encontrado" })
    }

    // Verify user owns this order by user_id (preferred) or email (legacy)
    const isOwner =
      (order.user_id && verified.userId && order.user_id === verified.userId) ||
      order.email === verified.email.toLowerCase().trim()

    if (!isOwner) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    // Save feedback (required for deletion)
    await supabase.from("feedback").insert({
      user_email: verified.email.toLowerCase().trim(),
      category: "deletion",
      related_order_id: id,
      reason_category: reasonCategory || null,
      reason_details: reasonDetails || null
    })

    // Soft delete: mark status as 'deleted'
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "deleted" })
      .eq("id", id)

    if (updateError) {
      console.error("[Delete Order] Update error:", updateError)
      return res.status(500).json({ error: "Erro ao deletar música" })
    }

    console.log(
      `[Delete Order] Order ${id} marked as deleted by ${verified.email}`
    )
    res.json({ success: true, message: "Música removida com sucesso" })
  } catch (error: any) {
    console.error("Delete Order Error:", error.message || error)
    res.status(500).json({ error: "Erro ao processar exclusão" })
  }
})

// ─── Delete Chat Transcript ──────────────────────────────────
app.delete("/api/orders/:id/chat", async (req, res) => {
  try {
    const verified = await verifySession(req, res)
    if (!verified) return

    const { id } = req.params
    const { reasonCategory, reasonDetails } = req.body

    const { data: order, error: queryError } = await supabase
      .from("orders")
      .select("id, email, user_id")
      .eq("id", id)
      .single()

    if (queryError || !order) {
      return res.status(404).json({ error: "Pedido não encontrado" })
    }

    const isOwner =
      (order.user_id && verified.userId && order.user_id === verified.userId) ||
      order.email === verified.email.toLowerCase().trim()

    if (!isOwner) {
      return res.status(403).json({ error: "Acesso proibido" })
    }

    await supabase.from("feedback").insert({
      user_email: verified.email.toLowerCase().trim(),
      category: "chat_deletion",
      related_order_id: id,
      reason_category: reasonCategory || null,
      reason_details: reasonDetails || null
    })

    const { error: updateError } = await supabase
      .from("orders")
      .update({ chat_transcript: [] })
      .eq("id", id)

    if (updateError) {
      console.error("[Delete Chat] Update error:", updateError)
      return res.status(500).json({ error: "Erro ao excluir chat" })
    }

    res.json({ success: true, message: "Chat excluído com sucesso" })
  } catch (error: any) {
    console.error("Delete Chat Error:", error.message || error)
    res.status(500).json({ error: "Erro ao processar exclusão" })
  }
})

// Daily Cleanup Cron Simulation for virtual trash (accounts deleted > 30 days ago)
async function performHardDeleteCleanup() {
  try {
    console.log("[Trash Cleanup] Running daily hard delete cleanup...")
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get users in trash for more than 30 days
    const { data: usersToDelete } = await supabase
      .from("users")
      .select("id, email")
      .eq("status", "trash")
      .lte("deleted_at", thirtyDaysAgo.toISOString())

    if (usersToDelete && usersToDelete.length > 0) {
      for (const u of usersToDelete) {
        console.log(`[Trash Cleanup] Hard deleting user: ${u.email}`)

        // Delete user's songs/audios from storage first
        const { data: orders } = await supabase
          .from("orders")
          .select("id, audio_storage_path")
          .eq("email", u.email)

        if (orders) {
          for (const o of orders) {
            if (o.audio_storage_path) {
              await supabase.storage
                .from("songs")
                .remove([o.audio_storage_path])
            }
          }
        }

        // Delete user's orders
        await supabase.from("orders").delete().eq("email", u.email)

        // Delete user's OTP codes
        await supabase.from("otp_codes").delete().eq("email", u.email)

        // Finally delete the user
        await supabase.from("users").delete().eq("id", u.id)
      }
    }
    console.log("[Trash Cleanup] Cleanup finished.")
  } catch (err) {
    console.error("[Trash Cleanup] Error during cleanup:", err)
  }
}

// Run cleanup on startup and then every 24 hours
performHardDeleteCleanup()
setInterval(performHardDeleteCleanup, 24 * 60 * 60 * 1000)

// ============================================================
// VITE DEV / PRODUCTION SERVING
// ============================================================

// ============================================================
// VOICE AGENT WEBSOCKET PROXY (Live API)
// ============================================================

interface AgentSession {
  session_token: string
  draft: Record<string, any>
  ws: WebSocket | null
  geminiWs: WebSocket | null
}

const agentSessions = new Map<string, AgentSession>()

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite")
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(process.cwd(), "dist")
    app.use("/assets", express.static(path.join(process.cwd(), "assets")))
    app.use(express.static(distPath))
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"))
    })
  }

  const server = http.createServer(app)

  const wss = new WebSocketServer({ server, path: "/api/voice/ws" })

  wss.on("connection", (clientWs, req) => {
    const url = new URL(req.url || "", `http://localhost:${PORT}`)
    const sessionToken = url.searchParams.get("session_token") || ""
    const sessionId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const session: AgentSession = {
      session_token: sessionToken,
      draft: {},
      ws: clientWs,
      geminiWs: null
    }
    agentSessions.set(sessionId, session)

    clientWs.send(JSON.stringify({ type: "connected", sessionId }))

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      clientWs.send(JSON.stringify({ type: "error", message: "GEMINI_API_KEY não configurada" }))
      clientWs.close()
      return
    }

    const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`

    const geminiWs = new WebSocket(geminiUrl, { headers: { "User-Agent": "1musica-agent" } })
    session.geminiWs = geminiWs

    geminiWs.on("open", () => {
      const setupMsg = {
        setup: {
          model: "models/gemini-2.0-flash-exp",
          systemInstruction: {
            parts: [
              {
                text: `Você é o Compositor Virtual do 1Música em modo voz. Conduza uma entrevista curta e calorosa em português do Brasil para coletar informações para uma música personalizada. Pergunte sobre: tipo de homenagem, nome da pessoa, memória principal, estilo musical preferido. Quando tiver informações suficientes, chame a ferramenta finish_interview. NÃO mencione valores.`
              }
            ]
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: "save_song_info",
                  description: "Salva um campo da música",
                  parameters: {
                    type: "object",
                    properties: {
                      field: { type: "string", description: "Campo (ex: tipo, nome, memoria, estilo)" },
                      value: { type: "string", description: "Valor do campo" }
                    },
                    required: ["field", "value"]
                  }
                },
                {
                  name: "finish_interview",
                  description: "Finaliza a entrevista quando tiver informações suficientes",
                  parameters: { type: "object", properties: {} }
                }
              ]
            }
          ]
        }
      }
      geminiWs.send(JSON.stringify(setupMsg))
    })

    geminiWs.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString())
        clientWs.send(JSON.stringify({ type: "gemini", data: msg }))
      } catch {
        clientWs.send(data.toString())
      }
    })

    geminiWs.on("error", (err) => {
      clientWs.send(JSON.stringify({ type: "error", message: "Erro na conexão com Gemini" }))
    })

    clientWs.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === "audio" && geminiWs.readyState === WebSocket.OPEN) {
          geminiWs.send(JSON.stringify({ realtimeInput: { mediaChunks: [{ mimeType: msg.mimeType || "audio/webm", data: msg.data }] } }))
        } else if (msg.type === "text" && geminiWs.readyState === WebSocket.OPEN) {
          geminiWs.send(JSON.stringify({ clientContent: { turns: [{ role: "user", parts: [{ text: msg.text }] }] } }))
        } else if (msg.type === "tool_response" && geminiWs.readyState === WebSocket.OPEN) {
          const toolResponse = { toolResponse: { functionResponses: msg.responses } }
          geminiWs.send(JSON.stringify(toolResponse))
        }
      } catch {
        // ignore parse errors
      }
    })

    clientWs.on("close", () => {
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.close()
      }
      agentSessions.delete(sessionId)
    })
  })

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`1Música server running on http://localhost:${PORT}`)
  })
}

startServer()
