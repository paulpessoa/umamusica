import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { ChatMessage, Order, MusicStatus, SongMetadata } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "25mb" }));

// Disable caching for all API responses
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

// Initialize Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: { "User-Agent": "aistudio-build" },
  },
});

// Initialize Supabase client (service role — server-only, NEVER expose to frontend)
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Helper to call generateContent with automatic fallback on quota errors
async function generateContentWithFallback(params: {
  model: string;
  contents: any[];
  config?: any;
}) {
  const modelsToTry = [params.model, "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI] Trying model: ${modelName}...`);
      return await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: params.config,
      });
    } catch (error: any) {
      lastError = error;
      const isQuotaOrUnavailable =
        error?.status === "RESOURCE_EXHAUSTED" ||
        error?.status === "UNAVAILABLE" ||
        error?.message?.includes("quota") ||
        error?.message?.includes("429") ||
        error?.message?.includes("503");
      if (isQuotaOrUnavailable) {
        console.warn(`[AI] Model ${modelName} quota exceeded, trying next...`);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// ============================================================
// API ROUTES
// ============================================================

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── OTP Email Verification ────────────────────────────────
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email inválido" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Store OTP in Supabase
    await supabase.from("otp_codes").insert({
      email: email.toLowerCase().trim(),
      code,
      expires_at: expiresAt.toISOString(),
    });

    // Send via Resend
    const resendKey = process.env.RESEND_KEY;
    const fromEmail = process.env.RESEND_FROM || "UnaMusica <onboarding@resend.dev>";
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: `UnaMusica <${fromEmail}>`,
          to: email,
          subject: "🎵 Seu código de verificação — UnaMusica",
          html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; text-align: center;">
              <h2 style="color: #FF5A5F; margin-bottom: 8px;">UnaMusica.com.br</h2>
              <p style="color: #555; font-size: 14px;">Seu código de verificação é:</p>
              <div style="background: #FFF0F0; border: 2px solid #FF5A5F; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FF5A5F; font-family: monospace;">${code}</span>
              </div>
              <p style="color: #888; font-size: 12px;">Este código expira em 10 minutos.<br/>Se você não solicitou este código, ignore este e-mail.</p>
            </div>
          `,
        }),
      });
      console.log(`[OTP] Code sent to ${email}`);
    } else {
      console.log(`[OTP] RESEND_KEY not set. Code for ${email}: ${code}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("OTP Send Error:", error.message || error);
    res.status(500).json({ error: "Erro ao enviar código de verificação" });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email e código são obrigatórios" });
    }

    const { data, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("code", code)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return res.status(400).json({ error: "Código inválido ou expirado" });
    }

    // Mark as verified
    await supabase
      .from("otp_codes")
      .update({ verified: true })
      .eq("id", data[0].id);

    res.json({ success: true, verified: true });
  } catch (error: any) {
    console.error("OTP Verify Error:", error.message || error);
    res.status(500).json({ error: "Erro ao verificar código" });
  }
});

// ─── Chat Interview (Text) ────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, email } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Mensagens inválidas" });
    }

    const systemInstruction = `
Você é o Compositor Virtual do UnaMusica.com.br, um assistente caloroso, simpático e super criativo que ajuda pessoas a criarem músicas personalizadas e emocionantes para quem amam, por apenas R$ 1,00 via Pix.
Seu objetivo é conduzir uma entrevista rápida, calorosa e engajadora com o usuário para capturar todas as informações necessárias para gerar a música: contextos detalhados, apelidos, memórias marcantes, piadas internas e histórias reais.

Instruções:
1. Faça perguntas de forma interativa e amigável. Explore detalhes poéticos e curiosidades.
2. Adapte-se ao estilo do usuário (descontraído com quem usa emojis, polido com quem é formal).
3. Faça apenas uma pergunta clara por vez para manter a conversa dinâmica.
4. Responda sempre em Português do Brasil.
5. Se o usuário usar termos ofensivos ou conteúdo impróprio, advirta educadamente que isso pode impedir a geração da música.
6. Quando tiver informações suficientes e o usuário estiver satisfeito, parabenize-o e diga que ele já pode clicar em "Finalizar e Compor".
`;

    const chatContents = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: { systemInstruction, temperature: 0.8 },
    });

    const aiText = response.text || "Desculpe, pode repetir?";
    res.json({ text: aiText });
  } catch (error: any) {
    console.warn("Chat Error:", error.message || error);
    res.status(500).json({ error: "Erro ao processar conversa" });
  }
});

// ─── Chat Voice (Audio message — like WhatsApp) ────────────
app.post("/api/chat-voice", async (req, res) => {
  try {
    const { audio, mimeType, messages, email } = req.body;
    if (!audio) {
      return res.status(400).json({ error: "Áudio é obrigatório" });
    }

    const systemInstruction = `
Você é o Compositor Virtual do UnaMusica.com.br. Você recebeu um áudio do usuário.
Transcreva o áudio e continue a entrevista para coletar informações para a música personalizada.
Responda de forma curta (2-3 frases) e faça uma pergunta por vez.
Responda em Português do Brasil.
Se o usuário usar termos impróprios, advirta educadamente.
Retorne JSON com: userTranscript, aiResponse, triggerCompose (true se tiver tudo).
`;

    const chatContents = (messages || [])
      .filter((m: any) => m.text && m.text.trim())
      .map((m: any) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

    chatContents.push({
      role: "user",
      parts: [
        { inlineData: { mimeType: mimeType || "audio/webm", data: audio } },
        { text: "Transcreva o áudio acima em português do Brasil e continue a entrevista de composição." },
      ],
    });

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
            triggerCompose: { type: Type.BOOLEAN },
          },
          required: ["userTranscript", "aiResponse", "triggerCompose"],
        },
      },
    });

    const dataText = response.text?.trim() || "{}";
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(dataText);
    } catch {
      parsedData = {
        userTranscript: "Áudio enviado",
        aiResponse: dataText || "Interessante! Me conta mais?",
        triggerCompose: false,
      };
    }

    res.json({
      userTranscript: parsedData.userTranscript || "Áudio enviado",
      aiResponse: parsedData.aiResponse || "Entendido! Vamos em frente.",
      triggerCompose: !!parsedData.triggerCompose,
    });
  } catch (error: any) {
    console.warn("Voice Chat Error:", error.message || error);
    res.status(500).json({ error: "Erro ao processar áudio" });
  }
});

// ─── Checkout (MercadoPago Pix) ────────────────────────────
app.post("/api/checkout", async (req, res) => {
  try {
    const { email, chatTranscript, structuredPrompt } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório" });
    }

    const orderId = "order_" + Math.random().toString(36).substr(2, 9);
    let paymentId = "pay_" + Math.random().toString(36).substr(2, 15);
    let paymentQr = "";
    let paymentCopiaCola = "";

    // Try MercadoPago Pix
    const mpToken = process.env.ML_TOKEN || process.env.ML_TOKEN_TEST;
    if (mpToken) {
      try {
        console.log("[MercadoPago] Creating Pix payment...");
        const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mpToken}`,
            "X-Idempotency-Key": orderId,
          },
          body: JSON.stringify({
            transaction_amount: 1.0,
            description: "Música Personalizada — UnaMusica.com.br",
            payment_method_id: "pix",
            payer: { email },
            external_reference: orderId,
          }),
        });

        if (mpResponse.ok) {
          const mpData: any = await mpResponse.json();
          paymentId = mpData.id?.toString() || paymentId;
          paymentQr = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || "";
          paymentCopiaCola = mpData.point_of_interaction?.transaction_data?.qr_code || "";
          console.log(`[MercadoPago] Pix created: ${paymentId}`);
        } else {
          const errBody = await mpResponse.text();
          console.warn(`[MercadoPago] Error ${mpResponse.status}:`, errBody);
        }
      } catch (e: any) {
        console.warn("[MercadoPago] Connection failed:", e.message);
      }
    }

    // Fallback QR for testing
    if (!paymentQr) {
      const mockPix = `00020126580014br.gov.bcb.pix0136unamusica-${orderId}52040000530398654041.005802BR`;
      paymentQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mockPix)}`;
      paymentCopiaCola = mockPix;
    }

    // Save order in Supabase
    const newOrder = {
      id: orderId,
      email,
      chat_transcript: chatTranscript || [],
      structured_prompt: structuredPrompt || null,
      payment_id: paymentId,
      payment_qr: paymentQr,
      payment_copia_e_cola: paymentCopiaCola,
      status: "pending_payment" as MusicStatus,
    };

    const { error: insertError } = await supabase.from("orders").insert(newOrder);
    if (insertError) {
      console.error("[Supabase] Insert error:", insertError);
    }

    res.json({
      orderId,
      paymentId,
      paymentQr,
      paymentCopiaCola,
      status: "pending_payment",
    });
  } catch (error) {
    console.error("Checkout Error:", error);
    res.status(500).json({ error: "Erro ao gerar cobrança Pix" });
  }
});

// ─── Get Order Status ──────────────────────────────────────
app.get("/api/orders/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Pedido não encontrado" });
  }
  res.json(data);
});

// ─── Simulate Payment (Testing) ────────────────────────────
app.post("/api/orders/:id/simulate-payment", async (req, res) => {
  try {
    const { error } = await supabase
      .from("orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", req.params.id);

    if (error) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }
    res.json({ status: "paid", success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao simular pagamento" });
  }
});

// ─── Apply Coupon ──────────────────────────────────────────
app.post("/api/orders/:id/apply-coupon", async (req, res) => {
  try {
    const { coupon } = req.body;
    if (coupon && coupon.trim().toUpperCase() === "CUPOM-PRESENTE") {
      await supabase
        .from("orders")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", req.params.id);
      res.json({ success: true, status: "paid", message: "Cupom aplicado com sucesso!" });
    } else {
      res.status(400).json({ error: "Cupom inválido ou expirado" });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao aplicar cupom" });
  }
});

// ─── MercadoPago Webhook ───────────────────────────────────
app.post("/api/webhook/mercadopago", async (req, res) => {
  try {
    const { action, data: webhookData } = req.body;
    console.log("[Webhook MP] Received:", action);

    if (action === "payment.updated" || action === "payment.created") {
      const paymentId = webhookData?.id;
      if (!paymentId) return res.json({ received: true });

      // Fetch payment details from MercadoPago
      const mpToken = process.env.ML_TOKEN || process.env.ML_TOKEN_TEST;
      if (mpToken) {
        const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${mpToken}` },
        });
        if (paymentRes.ok) {
          const payment: any = await paymentRes.json();
          if (payment.status === "approved") {
            const externalRef = payment.external_reference;
            if (externalRef) {
              await supabase
                .from("orders")
                .update({ status: "paid", updated_at: new Date().toISOString() })
                .eq("id", externalRef);
              console.log(`[Webhook MP] Order ${externalRef} paid!`);
            }
          }
        }
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ error: "Webhook failed" });
  }
});

// ─── Generate Music ────────────────────────────────────────
app.post("/api/orders/:id/generate", async (req, res) => {
  try {
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (fetchError || !order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    await supabase
      .from("orders")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    // Analyze transcript
    const transcriptText = (order.chat_transcript || [])
      .map((m: any) => `${m.sender === "user" ? "Cliente" : "IA"}: ${m.text}`)
      .join("\n");

    const analysisPrompt = `
Gere as informações completas para uma música personalizada baseada nesta entrevista:
---
${transcriptText}
---

Campos obrigatórios:
1. Title: Título cativante (máx 5 palavras, português).
2. Artist Name: Nome artístico virtual.
3. Style: Estilo musical.
4. Tempo: Lenta, Média ou Rápida.
5. Vibe: Tom emocional (ex: "Emocionante", "Romântica").
6. Lyrics: Letra COMPLETA com [Intro], [Verso 1], [Pré-Refrão], [Refrão], [Verso 2], [Refrão Final], [Outro].
7. Key Memories: Lista das memórias utilizadas.
8. Dedicated To: Nome/apelido da pessoa homenageada.

Retorne JSON válido.
`;

    const modelResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: analysisPrompt,
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
            dedicatedTo: { type: Type.STRING },
          },
          required: ["title", "artistName", "style", "tempo", "vibe", "lyrics", "keyMemories", "dedicatedTo"],
        },
      },
    });

    let songMetadata: SongMetadata;
    try {
      songMetadata = JSON.parse(modelResponse.text?.trim() || "{}");
    } catch {
      songMetadata = {
        title: "Sua Canção Especial",
        artistName: "Cantor Virtual UnaMusica",
        style: "Acústico / MPB",
        tempo: "Média",
        vibe: "Emocionante",
        lyrics: "[Intro]\n(Sons suaves de violão)\n\n[Verso 1]\nLembro daquele dia em que rimos tanto\nSua voz encheu a sala com encanto...\n\n[Refrão]\nVocê é luz, você é meu abrigo\nO melhor da vida é estar contigo...\n\n[Outro]\n(Acordes suaves)",
        keyMemories: ["Sua risada", "Seu carinho"],
        dedicatedTo: "Alguém Especial",
      };
    }

    // Try generating music with Lyria
    let audioStoragePath: string | null = null;
    try {
      const cleanLyrics = songMetadata.lyrics
        .replace(/\[Intro\]|\[Verso \d+\]|\[Refrão\]|\[Ponte\]|\[Outro\]|\[Pré-Refrão\]/gi, "")
        .replace(/\((.*?)\)/g, "")
        .trim();

      const lyriaPrompt = `Uma canção cantada em português no estilo ${songMetadata.style}, andamento ${songMetadata.tempo}, tom ${songMetadata.vibe}. Dedicada a ${songMetadata.dedicatedTo}. Letra: ${cleanLyrics}`;

      console.log("[Lyria] Generating music...");
      const lyriaResponse = await (ai as any).interactions.create({
        model: "models/lyria-3-pro-preview",
        input: lyriaPrompt,
      });

      if (lyriaResponse?.output_audio?.data) {
        // Upload to Supabase Storage
        const audioBuffer = Buffer.from(lyriaResponse.output_audio.data, "base64");
        const filePath = `${order.id}.mp3`;

        const { error: uploadError } = await supabase.storage
          .from("songs")
          .upload(filePath, audioBuffer, {
            contentType: lyriaResponse.output_audio.mime_type || "audio/mpeg",
            upsert: true,
          });

        if (!uploadError) {
          audioStoragePath = filePath;
          console.log(`[Lyria] Audio uploaded to storage: ${filePath}`);
        } else {
          console.error("[Storage] Upload error:", uploadError);
        }
      }
    } catch (lyriaErr) {
      console.warn("[Lyria] Music generation failed:", lyriaErr);
    }

    // Update order as completed
    await supabase
      .from("orders")
      .update({
        song_metadata: songMetadata,
        audio_storage_path: audioStoragePath,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // Send email with download link (via our API, never expose Supabase URL)
    const resendKey = process.env.RESEND_KEY;
    const fromEmail = process.env.RESEND_FROM || "onboarding@resend.dev";
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: `UnaMusica <${fromEmail}>`,
            to: order.email,
            subject: `🎵 Sua música "${songMetadata.title}" está pronta!`,
            html: `
              <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px;">
                <h2 style="color: #FF5A5F; text-align: center;">UnaMusica.com.br</h2>
                <p>Olá!</p>
                <p>Sua música personalizada <strong>"${songMetadata.title}"</strong> ficou pronta!</p>
                <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <h3 style="margin: 0; color: #333;">${songMetadata.title}</h3>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">Estilo: ${songMetadata.style} • Por: ${songMetadata.artistName}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${appUrl}/api/orders/${order.id}/download" style="background: #FF5A5F; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Baixar Música 🎵</a>
                </div>
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${appUrl}/?orderId=${order.id}" style="color: #FF5A5F; font-size: 14px;">Ver letra e detalhes →</a>
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 11px; color: #999; text-align: center;">UnaMusica.com.br — Transformando memórias em música por R$ 1,00</p>
              </div>
            `,
          }),
        });
        console.log("[Email] Confirmation sent to", order.email);
      } catch (emailErr) {
        console.error("[Email] Failed:", emailErr);
      }
    }

    // Re-fetch updated order for response
    const { data: updatedOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order.id)
      .single();

    res.json(updatedOrder || { ...order, song_metadata: songMetadata, status: "completed" });
  } catch (error) {
    console.error("Generate Error:", error);
    res.status(500).json({ error: "Erro ao compor a música" });
  }
});

// ─── Download (Signed URL — never expose Supabase directly) ─
app.get("/api/orders/:id/download", async (req, res) => {
  try {
    const { data: order } = await supabase
      .from("orders")
      .select("audio_storage_path, song_metadata, status")
      .eq("id", req.params.id)
      .single();

    if (!order || order.status !== "completed") {
      return res.status(404).json({ error: "Música não encontrada ou ainda em processamento" });
    }

    if (!order.audio_storage_path) {
      return res.status(404).json({ error: "Arquivo de áudio não disponível" });
    }

    // Generate signed URL (expires in 60 minutes)
    const { data: signedUrl, error } = await supabase.storage
      .from("songs")
      .createSignedUrl(order.audio_storage_path, 3600);

    if (error || !signedUrl) {
      return res.status(500).json({ error: "Erro ao gerar link de download" });
    }

    res.redirect(signedUrl.signedUrl);
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ error: "Erro no download" });
  }
});

// ============================================================
// VITE DEV / PRODUCTION SERVING
// ============================================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UnaMusica server running on http://localhost:${PORT}`);
  });
}

startServer();
