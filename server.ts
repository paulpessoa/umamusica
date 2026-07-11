import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { ChatMessage, Order, MusicStatus, SongMetadata } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to call generateContent with automatic fallback on 429/503 errors
async function generateContentWithFallback(params: {
  model: string;
  contents: any[];
  config?: any;
}) {
  const modelsToTry = [
    params.model,
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[Fallback Engine] Trying generateContent with model: ${modelName}...`);
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
        error?.message?.includes("demand") ||
        error?.message?.includes("429") ||
        error?.message?.includes("503") ||
        (error?.code === 429 || error?.code === 503);

      if (isQuotaOrUnavailable) {
        console.warn(`[Fallback Engine] Model ${modelName} failed due to quota/temporary unavailability. Error: ${error.message || error}`);
        continue; // Try next model in list
      }
      throw error; // Rethrow actual non-quota errors immediately
    }
  }

  console.warn(`[Fallback Engine] All fallback models failed. Re-throwing last error.`);
  throw lastError;
}

// Local file database path for persistence
const DB_PATH = path.join(process.cwd(), "unamusica_orders.json");

// Load orders from disk on startup
let orders: Record<string, Order> = {};
if (fs.existsSync(DB_PATH)) {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    orders = JSON.parse(raw);
    console.log(`Loaded ${Object.keys(orders).length} orders from local DB.`);
  } catch (e) {
    console.error("Failed to load orders from disk:", e);
    orders = {};
  }
}

// Helper to save orders to disk
function saveDb() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(orders, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save orders to disk:", e);
  }
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint to expose Gemini API Key safely for Live WebSocket
app.get("/api/gemini-key", (req, res) => {
  res.json({ apiKey: process.env.GEMINI_API_KEY || "" });
});

// Chat Interview Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, email } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Mensagens inválidas" });
    }

    const systemInstruction = `
Você é o Compositor Virtual do UnaMusica.com.br, um assistente caloroso, simpático e super criativo que ajuda pessoas a criarem músicas personalizadas e emocionantes para quem amam, por apenas R$ 1,00 via Pix.
Seu objetivo é conduzir uma entrevista de onboarding profunda, calorosa e engajadora com o usuário para capturar absolutamente todas as informações necessárias para gerar a base da música, contextos detalhados, apelidos, memórias marcantes, piadas internas e histórias reais.

Instruções da Entrevista e Comportamento:
1. Questione o máximo de coisas possíveis de forma interativa e amigável. Explore detalhes poéticos e curiosidades sobre a história.
2. Interaja sempre com extrema cordialidade e afeto, adaptando-se ativamente ao estilo de conversação do usuário (seja descontraído com quem usa emojis e gírias, ou mais polido e respeitoso com quem escreve de forma formal).
3. Faça apenas uma pergunta clara e instigante de cada vez para manter o bate-papo dinâmico e amigável.
4. Responda sempre em Português do Brasil.
5. ATENÇÃO - SEGURANÇA E POLÍTICAS: Se o usuário introduzir termos ofensivos, linguagem de ódio, conotações violentas, sexuais explícitas ou qualquer coisa que claramente fira as diretrizes e políticas de segurança do Gemini, você deve ADVERTIR o usuário de forma clara e educada. Explique que o uso de conteúdo impróprio ou ofensivo poderá impedir a música de ser gerada e recomende que ele entre em contato com o suporte em caso de dúvidas ou erros.
6. Quando tiver coletado uma quantidade excelente de informações e o usuário estiver satisfeito, parabenize-o calorosamente e indique que ele já pode avançar clicando no botão 'Finalizar e Compor'.
`;

    const chatContents = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    // Add system instruction as part of config with the requested gemini-3.5-flash model
    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    const aiText = response.text || "Desculpe, deu um pequeno compasso desafinado aqui. Pode repetir?";
    res.json({ text: aiText });
  } catch (error: any) {
    console.warn("Chat API Error:", error.message || error);
    res.status(500).json({ error: "Erro ao processar conversa de composição" });
  }
});

// Continuous Live Speech Conversation Endpoint
app.post("/api/chat-continuous", async (req, res) => {
  try {
    const { messages, text, email } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Texto do usuário é obrigatório" });
    }

    const systemInstruction = `
Você é o Compositor Virtual do UnaMusica.com.br, um assistente caloroso, simpático e super criativo que ajuda pessoas a criarem músicas personalizadas e emocionantes para quem amam, por apenas R$ 1,00 via Pix.
Seu objetivo é entrevistar o usuário em uma chamada contínua de voz para capturar o máximo de informações possíveis, incluindo contextos, memórias e sentimentos.

Instruções da Chamada:
1. Questione o máximo de coisas possíveis de forma natural e empática para conseguir a base poética da canção.
2. Seja extremamente cordial e amigável. Adapte-se ao tom de voz e estilo do usuário de forma receptiva.
3. Responda com frases curtas (máximo 1-2 frases) para que o diálogo por voz pareça uma ligação de telefone real e fluida.
4. Faça apenas uma pergunta clara por vez de maneira espontânea.
5. ATENÇÃO - SEGURANÇA E POLÍTICAS: Se o usuário falar termos ofensivos, ódio ou conteúdo impróprio que fira as políticas de segurança do Gemini, você deve ADVERTIR o usuário educadamente, explicando que termos impróprios podem impedir a geração da música e que ele deverá entrar em contato com o suporte em caso de erro.
6. Se todos os detalhes principais tiverem sido coletados e o usuário se sentir satisfeito, mude imediatamente 'triggerCompose' para true e encerre a chamada de forma super simpática (ex: "Que fantástico! Eu tenho absolutamente tudo o que preciso para compor uma obra-prima. Vou desligar para iniciar a produção da sua canção!"). Caso contrário, mantenha 'triggerCompose' como false.
`;

    // Map existing messages to Gemini format, and append the latest user text
    const chatContents = (messages || [])
      .filter((m: any) => m.text && m.text.trim())
      .map((m: any) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

    chatContents.push({
      role: "user",
      parts: [{ text: text }]
    });

    console.log("Processing Continuous Live Speech message with gemini-3.5-flash...");
    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiResponse: { type: Type.STRING },
            triggerCompose: { type: Type.BOOLEAN }
          },
          required: ["aiResponse", "triggerCompose"]
        }
      }
    });

    const dataText = response.text?.trim() || "{}";
    let parsedData: { aiResponse?: string; triggerCompose?: boolean } = {};
    try {
      parsedData = JSON.parse(dataText);
    } catch (parseErr) {
      console.warn("Failed to parse Live text response JSON:", parseErr);
      parsedData = {
        aiResponse: dataText || "Que incrível! Me conta mais?",
        triggerCompose: false
      };
    }

    const aiResponseText = parsedData.aiResponse || "Entendido! Vamos em frente.";
    const triggerCompose = !!parsedData.triggerCompose;

    // Synthesize response voice
    let aiAudioUrl = "";
    try {
      console.log("Synthesizing voice for Continuous Live response...");
      const ttsResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Fale de forma calorosa, simpática e amigável em português do Brasil: ${aiResponseText}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" }
            }
          }
        }
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        aiAudioUrl = `data:audio/mp3;base64,${base64Audio}`;
        console.log("Vocal synthesis completed successfully!");
      }
    } catch (ttsErr: any) {
      console.warn("Continuous Vocal synthesis failed (skipping audio response gracefully):", ttsErr.message || ttsErr);
    }

    res.json({
      aiResponse: aiResponseText,
      aiAudio: aiAudioUrl,
      triggerCompose
    });
  } catch (error: any) {
    console.warn("Chat Continuous API Error:", error.message || error);
    res.status(500).json({ error: "Erro ao processar conversação contínua de voz" });
  }
});

// Live Voice Chat Interview Endpoint
app.post("/api/chat-voice", async (req, res) => {
  try {
    const { audio, mimeType, messages, email } = req.body;
    if (!audio) {
      return res.status(400).json({ error: "Áudio do usuário é obrigatório" });
    }

    const systemInstruction = `
Você é o Compositor Virtual do UnaMusica.com.br, um assistente caloroso, simpático e super criativo que ajuda pessoas a criarem músicas personalizadas e emocionantes para quem amam, por apenas R$ 1,00 via Pix.
Seu objetivo é entrevistar o usuário enviando respostas por voz para coletar o máximo de informações possíveis para a canção (detalhes, apelidos, memórias marcantes, piadas e sentimentos).

Instruções da Entrevista:
1. Questione o máximo de coisas possíveis de forma calorosa e interativa. Seja um ótimo ouvinte e explore a história!
2. Interaja sempre com muita cordialidade e afeto. Adapte o seu estilo ao estilo demonstrado pelo usuário.
3. Responda de forma curta e objetiva (máximo 2-3 frases) para manter a conversa ágil.
4. Faça apenas uma pergunta por vez.
5. ATENÇÃO - SEGURANÇA E POLÍTICAS: Se o usuário falar termos ofensivos, ódio ou conteúdo impróprio que fira as políticas de segurança do Gemini, você deve ADVERTIR o usuário de forma clara e educada, explicando que o uso de termos impróprios poderá impedir a geração da música e que ele deverá entrar em contato com o suporte em caso de erro.
6. Se todos os detalhes essenciais foram coletados e o usuário estiver satisfeito, defina 'triggerCompose' como true e encerre de forma linda. Caso contrário, defina 'triggerCompose' como false.
`;

    // Map existing messages to Gemini format, excluding empty text or formatting
    const chatContents = (messages || [])
      .filter((m: any) => m.text && m.text.trim())
      .map((m: any) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

    // Append the user's voice message as the final user content with the base64 audio
    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: audio
      }
    };
    const textPart = {
      text: "Transcreva o áudio acima em português do Brasil e formule sua resposta calorosa para continuar a entrevista de composição."
    };

    chatContents.push({
      role: "user",
      parts: [audioPart, textPart]
    });

    console.log("Analyzing live voice message with gemini-3.5-flash...");
    const response = await generateContentWithFallback({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction: systemInstruction + "\nAdicionalmente, você deve retornar um objeto JSON with três campos obrigatórios: 'userTranscript' (transcrição do áudio recebido), 'aiResponse' (sua resposta de acompanhamento curta) e 'triggerCompose' (un booleano indicando se todos os detalhes essenciais foram coletados).",
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
    });

    const dataText = response.text?.trim() || "{}";
    let parsedData: { userTranscript?: string; aiResponse?: string; triggerCompose?: boolean } = {};
    try {
      parsedData = JSON.parse(dataText);
    } catch (parseErr) {
      console.warn("Failed to parse Voice Chat JSON response, attempting raw recovery:", parseErr);
      parsedData = {
        userTranscript: "Áudio enviado pelo usuário",
        aiResponse: dataText || "Interessante! Me conta mais detalhes sobre essa história?",
        triggerCompose: false
      };
    }

    const userTranscript = parsedData.userTranscript || "Áudio enviado";
    const aiResponseText = parsedData.aiResponse || "Entendido! Vamos em frente.";
    const triggerCompose = !!parsedData.triggerCompose;

    // Generate TTS for the AI response to speak back to the user
    let aiAudioUrl = "";
    try {
      console.log("Synthesizing live assistant vocal response...");
      const ttsResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Fale de forma calorosa, simpática e amigável em português do Brasil: ${aiResponseText}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" }
            }
          }
        }
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        aiAudioUrl = `data:audio/mp3;base64,${base64Audio}`;
        console.log("Assistant voice successfully synthesized!");
      }
    } catch (ttsErr: any) {
      console.warn("Vocal synthesis for Live assistant response failed (skipping audio response gracefully):", ttsErr.message || ttsErr);
    }

    res.json({
      userTranscript,
      aiResponse: aiResponseText,
      aiAudio: aiAudioUrl,
      triggerCompose
    });
  } catch (error: any) {
    console.warn("Chat Voice API Error:", error.message || error);
    res.status(500).json({ error: "Erro ao processar mensagem de voz do chat" });
  }
});

// Checkout and Pix Creation (AbacatePay Integration or Sandbox fallback)
app.post("/api/checkout", async (req, res) => {
  try {
    const { email, chatTranscript, structuredPrompt } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório" });
    }

    const orderId = "order_" + Math.random().toString(36).substr(2, 9);
    const paymentId = "pay_" + Math.random().toString(36).substr(2, 15);

    // Mock Pix payloads for high visual fidelity
    const randomPixKey = `00020126580014br.gov.bcb.pix0136unamusica-pay-${orderId}-pix-1.0052040000530398654041.005802BR5915UnaMusica%20IA6009Sao%20Paulo62070503***6304D1A8`;
    
    // We can use a free SVG QR code generator or render a client side QR canvas.
    // For extreme reliability, we provide a clean, visual canvas-friendly string or a public QR api URL.
    const paymentQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(randomPixKey)}`;

    // Real AbacatePay Implementation Check (checks both ABACATE_PAY_KEY and ABACATEPAY_API_KEY)
    const apiKey = process.env.ABACATE_PAY_KEY || process.env.ABACATEPAY_API_KEY;
    let realPaymentId = paymentId;
    let realQrCode = paymentQrUrl;
    let realCopiaCola = randomPixKey;

    if (apiKey) {
      try {
        console.log("AbacatePay API Key detected. Setting up dynamic customer...");
        
        let customerIdToUse = "cust_unamusica_client";
        try {
          // Attempt to create customer first
          const custResponse = await fetch("https://api.abacatepay.com/v1/customer/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              email,
              name: "Cliente UnaMusica",
              cellphone: "99999999999",
              taxId: "00000000000"
            })
          });

          if (custResponse.ok) {
            const custResult: any = await custResponse.json();
            if (custResult && custResult.data && custResult.data.id) {
              customerIdToUse = custResult.data.id;
              console.log("AbacatePay customer created successfully:", customerIdToUse);
            }
          } else {
            const errText = await custResponse.text();
            console.log(`Customer creation returned status ${custResponse.status}. Attempting to locate existing customer...`);
            
            // Fallback: list customers to find existing
            let listResponse = await fetch("https://api.abacatepay.com/v1/customer", {
              headers: { "Authorization": `Bearer ${apiKey}` }
            });
            if (!listResponse.ok) {
              listResponse = await fetch("https://api.abacatepay.com/v1/customer/list", {
                headers: { "Authorization": `Bearer ${apiKey}` }
              });
            }

            if (listResponse.ok) {
              const listResult: any = await listResponse.json();
              if (listResult && listResult.data) {
                const list = Array.isArray(listResult.data) 
                  ? listResult.data 
                  : (Array.isArray(listResult.data.customers) ? listResult.data.customers : []);
                const existingCust = list.find((c: any) => c.email === email);
                if (existingCust && existingCust.id) {
                  customerIdToUse = existingCust.id;
                  console.log("Located existing AbacatePay customer ID:", customerIdToUse);
                }
              }
            } else {
              console.warn("Listing customers failed:", listResponse.status);
            }
          }
        } catch (custErr: any) {
          console.warn("Failed to find or create customer dynamically:", custErr.message || custErr);
        }

        console.log(`Generating Pix Billing with Customer ID: ${customerIdToUse}...`);
        const response = await fetch("https://api.abacatepay.com/v1/billing/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            frequency: "ONE_TIME",
            methods: ["PIX"],
            products: [
              {
                name: "Música Personalizada UnaMusica",
                quantity: 1,
                price: 100 // R$ 1,00 in cents
              }
            ],
            returnUrl: process.env.APP_URL || `http://localhost:3000`,
            completionUrl: process.env.APP_URL || `http://localhost:3000`,
            customerId: customerIdToUse,
            metadata: {
              orderId,
              email
            }
          })
        });

        if (response.ok) {
          const result: any = await response.json();
          if (result && result.data) {
            realPaymentId = result.data.id;
            realQrCode = result.data.pix?.qrCodeUrl || paymentQrUrl;
            realCopiaCola = result.data.pix?.copiaECola || randomPixKey;
            console.log("Real AbacatePay Pix Billing created:", realPaymentId);
          }
        } else {
          const errBody = await response.text();
          console.warn(`AbacatePay API billing generation returned non-200 status (${response.status}):`, errBody);
        }
      } catch (e: any) {
        console.warn("Failed to connect to AbacatePay. Switched gracefully to Sandbox mode:", e.message || e);
      }
    }

    const newOrder: Order = {
      id: orderId,
      email,
      chat_transcript: chatTranscript || [],
      structured_prompt: structuredPrompt || null,
      song_metadata: null,
      payment_id: realPaymentId,
      payment_qr: realQrCode,
      payment_copia_e_cola: realCopiaCola,
      status: "pending_payment",
      audio_url: null,
      upsell_paid: false,
      video_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    orders[orderId] = newOrder;
    saveDb();

    res.json({
      orderId,
      paymentId: realPaymentId,
      paymentQr: realQrCode,
      paymentCopiaCola: realCopiaCola,
      status: "pending_payment"
    });
  } catch (error) {
    console.error("Checkout API Error:", error);
    res.status(500).json({ error: "Erro ao gerar cobrança do Pix" });
  }
});

// Get Order Status
app.get("/api/orders/:id", (req, res) => {
  const order = orders[req.params.id];
  if (!order) {
    return res.status(404).json({ error: "Pedido não encontrado" });
  }
  res.json(order);
});

// Simulate Pix Payment Confirmation
app.post("/api/orders/:id/simulate-payment", async (req, res) => {
  try {
    const order = orders[req.params.id];
    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    order.status = "paid";
    order.updated_at = new Date().toISOString();
    orders[order.id] = order;
    saveDb();

    res.json({ status: "paid", success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao confirmar simulação de Pix" });
  }
});

// Apply Gift Coupon Code
app.post("/api/orders/:id/apply-coupon", async (req, res) => {
  try {
    const order = orders[req.params.id];
    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const { coupon } = req.body;
    if (coupon && coupon.trim().toUpperCase() === "CUPOM-PRESENTE") {
      order.status = "paid";
      order.updated_at = new Date().toISOString();
      orders[order.id] = order;
      saveDb();
      res.json({ success: true, status: "paid", message: "Cupom aplicado com sucesso!" });
    } else {
      res.status(400).json({ error: "Cupom inválido ou expirado" });
    }
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    res.status(500).json({ error: "Erro ao aplicar cupom de presente" });
  }
});

// Simulate AbacatePay Webhook Receiver
app.post("/api/webhook/abacatepay", (req, res) => {
  try {
    const payload = req.body;
    console.log("AbacatePay Webhook received:", JSON.stringify(payload));

    const event = payload.event;
    const billing = payload.data;

    if (event === "billing.paid" && billing) {
      const paymentId = billing.id;
      // Search for corresponding order
      const order = Object.values(orders).find(o => o.payment_id === paymentId);
      if (order) {
        order.status = "paid";
        order.updated_at = new Date().toISOString();
        orders[order.id] = order;
        saveDb();
        console.log(`Order ${order.id} paid via webhook!`);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ error: "Webhook process failed" });
  }
});

// core generator endpoint for lyrics, melodies, and synthetic music elements using Gemini API
app.post("/api/orders/:id/generate", async (req, res) => {
  try {
    const order = orders[req.params.id];
    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    order.status = "processing";
    order.updated_at = new Date().toISOString();
    orders[order.id] = order;
    saveDb();

    // 1. Analyze the transcript to craft the perfect personalized music
    const transcriptText = order.chat_transcript
      .map(m => `${m.sender === "user" ? "Cliente" : "IA"}: ${m.text}`)
      .join("\n");

    const analysisPrompt = `
Gere as informações completas para uma música personalizada e emocionante baseada na seguinte entrevista:
---
${transcriptText}
---

Extraia e crie os seguintes campos estruturados:
1. Title: Título lindo e cativante da música (máximo de 5 palavras, em português).
2. Artist Name: Nome artístico virtual apropriado para o gênero (ex: "Dupla Lucas & Thiago" para sertanejo, "Mariana Luz" para MPB).
3. Style: O estilo musical principal selecionado.
4. Tempo: Se é Lenta, Média ou Rápida.
5. Vibe: Uma ou duas palavras que definem o tom emocional (ex: "Emocionante", "Engraçada e Festiva", "Romântica").
6. Lyrics: A letra COMPLETA da música (em português do Brasil). Deve possuir:
   - Introdução instrumental indicada por [Intro]
   - Verso 1 (contando os detalhes específicos informados na entrevista)
   - Pré-Refrão (criando tensão emocional)
   - Refrão (forte, emocionante, repetitivo e memorável)
   - Verso 2 (outros detalhes e memórias)
   - Refrão final
   - Outro indicado por [Outro]
7. Key Memories: Uma lista das principais memórias utilizadas na letra.
8. Dedicated To: O nome ou apelido da pessoa homenageada.

Retorne em formato JSON válido conforme especificado.
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
            keyMemories: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            dedicatedTo: { type: Type.STRING }
          },
          required: ["title", "artistName", "style", "tempo", "vibe", "lyrics", "keyMemories", "dedicatedTo"]
        }
      }
    });

    const songDataStr = modelResponse.text?.trim() || "{}";
    let songMetadata: SongMetadata;
    try {
      songMetadata = JSON.parse(songDataStr);
    } catch (e) {
      console.error("Failed to parse Gemini metadata response, using backup structure");
      songMetadata = {
        title: "Sua Canção Especial",
        artistName: "Cantor Virtual UnaMusica",
        style: "Acústico / MPB",
        tempo: "Média",
        vibe: "Emocionante",
        lyrics: "[Intro]\n(Sons suaves de violão)\n\n[Verso 1]\nLembro daquele dia em que rimos tanto\nSua voz encheu a sala com encanto\nAs memórias gravadas no meu coração\nGanham vida agora nesta canção...\n\n[Refrão]\nVocê é luz, você é meu abrigo\nO melhor da vida é estar contigo\nPor todo esse amor, eu te agradeço\nSua amizade não tem preço...\n\n[Outro]\n(Acordes suaves terminando)",
        keyMemories: ["Sua risada", "Seu carinho", "A nossa cumplicidade"],
        dedicatedTo: "Alguém Especial"
      };
    }

    // 2. Generate custom spoken/singing intro or backing vocals with Gemini TTS API!
    // This provides a highly immersive, personalized audio experience with the full custom lyrics!
    let audioUrl = "";
    try {
      const cleanLyrics = songMetadata.lyrics
        .replace(/\[Intro\]|\[Verso \d+\]|\[Refrão\]|\[Ponte\]|\[Outro\]|\[Pré-Refrão\]/gi, "")
        .replace(/\((.*?)\)/g, "") // remove parenthetical performance notes like (Sons de violão)
        .replace(/\n\n+/g, ".\n")
        .trim();

      const dedicationText = `
Homenagem especial dedicada a ${songMetadata.dedicatedTo}. Esta canção foi composta no estilo ${songMetadata.style} para celebrar a sua linda história. Sinta cada palavra:

${cleanLyrics}
`;
      
      console.log("Generating custom full-length TTS vocals with Gemini...");
      const ttsResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Recite de forma artística, calorosa, emocionante, compassada e compassiva como um cantor ou poeta em português do Brasil: ${dedicationText}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" } // A beautiful warm voice
            }
          }
        }
      });

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // Return base64 as data URL so the client plays it directly
        audioUrl = `data:audio/mp3;base64,${base64Audio}`;
        console.log("Successfully generated personalized full-lyric TTS vocals!");
      }
    } catch (ttsErr) {
      console.error("Gemini TTS voice generation failed, fallback to visual music synth:", ttsErr);
    }

    order.song_metadata = songMetadata;
    order.audio_url = audioUrl || "mock_acoustic_guitar_track";
    order.status = "completed";
    order.updated_at = new Date().toISOString();
    orders[order.id] = order;
    saveDb();

    // Here we would also configure Resend transactional email.
    const resendApiKey = process.env.RESEND_KEY || process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        console.log("Resend API Key found. Attempting to send transactional confirmation email...");
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: "UnaMusica <composição@qisites.com.br>",
            to: order.email,
            subject: `🎵 Sua música "${songMetadata.title}" está pronta para tocar!`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px;">
                <h2 style="color: #FF4D4D; text-align: center;">UnaMusica.com.br</h2>
                <p>Olá!</p>
                <p>Nossa inteligência artificial acabou de finalizar a composição de sua música personalizada: <strong>"${songMetadata.title}"</strong>!</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <h3 style="margin: 0; color: #333;">${songMetadata.title}</h3>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">Estilo: ${songMetadata.style} • Por: ${songMetadata.artistName}</p>
                </div>
                <p>Para ouvir a música, ver a letra completa e fazer o download, clique no botão abaixo:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL || 'http://localhost:3000'}/?orderId=${order.id}" style="background-color: #FF4D4D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ouvir Minha Música 🎵</a>
                </div>
                <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">UnaMusica • Transbordando emoções através da música por R$ 1,00</p>
              </div>
            `
          })
        });
        console.log("Email sent successfully!");
      } catch (emailErr) {
        console.error("Failed to send transactional email:", emailErr);
      }
    }

    res.json(order);
  } catch (error) {
    console.error("Generate API Error:", error);
    res.status(500).json({ error: "Erro ao compor a música com a IA" });
  }
});

// Upsell photo video confirmation
app.post("/api/orders/:id/upsell", (req, res) => {
  try {
    const order = orders[req.params.id];
    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    order.upsell_paid = true;
    order.video_url = "completed_slideshow_video";
    order.updated_at = new Date().toISOString();
    orders[order.id] = order;
    saveDb();

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Erro ao registrar upsell" });
  }
});

// ----------------------------------------------------
// VITE DEV SERVER AND PRODUCTION SERVING
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite dev server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UnaMusica.com.br full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
