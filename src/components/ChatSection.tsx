import React, { useState, useEffect, useRef } from "react"
import { Send, Mic, MicOff, Loader2 } from "lucide-react"
import { motion } from "motion/react"
import { ChatMessage } from "../types"
import { useAuth } from "../contexts/AuthContext"
import { apiFetch } from "../lib/api"

interface ChatSectionProps {
  // email é mantido para compatibilidade; o backend agora usa o e-mail do token.
  email?: string
  name?: string
  onFinishChat: (transcript: ChatMessage[]) => void
  initialMessages?: ChatMessage[]
}

export default function ChatSection({
  name,
  onFinishChat,
  initialMessages
}: ChatSectionProps) {
  const { updateUser } = useAuth()

  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages && initialMessages.length > 0
      ? initialMessages
      : [
          {
            sender: "ai",
            text: `Oi! Vou te ajudar a transformar essa história em uma música inesquecível!\n\nEscolha abaixo ou descreva com suas palavras:`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            }),
            options: [
              "💑 Homenagem romântica",
              "👩‍👦 Presente para a mãe",
              "🎂 Aniversário especial",
              "🤝 Agradecimento a amigo",
              "👨 Música para o pai",
              "🎓 Formatura / conquista",
              "👶 Nascimento de bebê / Boas-vindas",
              "💼 Colega de trabalho / Despedida",
              "⚽ Paixão pelo time de futebol",
              "🏍️ Clube de moto / Irmandade",
              "⛪ Amigos da igreja / Fé"
            ]
          }
        ]
  )
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  // Quando o usuário atinge o teto diário de IA, bloqueamos os inputs.
  const [rateLimited, setRateLimited] = useState(false)

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessingAudio, setIsProcessingAudio] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // ─── Parse quick options from AI text ─────────────────
  // The AI may emit the marker with or without accents/quotes, e.g.
  //   [OPCOES: "Opção A" | "Opção B"]
  //   [OPÇÕES: Descontraído | Polido | Outro]
  const OPTIONS_MARKER = /\[\s*OP[ÇC][OÕ]ES\s*:\s*(.+?)\s*\]\.?\s*/is

  const parseAiResponse = (
    text: string
  ): { cleanText: string; options?: string[] } => {
    const markerMatch = text.match(OPTIONS_MARKER)
    if (!markerMatch) return { cleanText: text }

    const raw = markerMatch[1].trim()
    // Split on "|", respecting optional quotes so inner " | " is preserved.
    const options: string[] = []
    const segmentRegex = /"([^"]*)"|'([^']*)'|([^|]+)/g
    let m: RegExpExecArray | null
    while ((m = segmentRegex.exec(raw)) !== null) {
      const opt = (m[1] ?? m[2] ?? m[3] ?? "")
        .trim()
        .replace(/^["']|["']$/g, "")
      if (opt) options.push(opt)
    }

    const cleanText = text
      .replace(OPTIONS_MARKER, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    return { cleanText, options: options.length ? options : undefined }
  }

  // ─── Send Text Message ──────────────────────────────────
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return

    const userMsg: ChatMessage = {
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInputValue("")
    setIsTyping(true)

    try {
      const response = await apiFetch(`/api/chat`, {
        method: "POST",
        body: JSON.stringify({ messages: updatedMessages, name })
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        const { cleanText, options } = parseAiResponse(data.text)
        if (data.nameSaved && data.name) {
          updateUser({ name: data.name })
        }
        setMessages((prev: ChatMessage[]) => [
          ...prev,
          {
            sender: "ai",
            text: cleanText,
            options,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })
          }
        ])
      } else {
        // Limite diário atingido: bloqueia os inputs e mostra aviso amigável.
        if (data.errorType === "RATE_LIMIT_DAILY") {
          setRateLimited(true)
        }
        // Show specific rate limit or server error message directly in chat
        setMessages((prev: ChatMessage[]) => [
          ...prev,
          {
            sender: "ai",
            text:
              data.error ||
              "Opa, tive um pequeno problema para responder agora. Pode tentar novamente em alguns instantes?",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })
          }
        ])
      }
    } catch {
      setMessages((prev: ChatMessage[]) => [
        ...prev,
        {
          sender: "ai",
          text: "Não consegui contato com o compositor virtual. Verifique se o servidor está online ou sua internet ativa.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })
        }
      ])
    } finally {
      setIsTyping(false)
    }
  }

  // ─── Voice Recording (WhatsApp-style) ───────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm"
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm"
        })
        stream.getTracks().forEach((track) => track.stop())
        await sendVoiceMessage(audioBlob)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      alert("Não foi possível acessar seu microfone. Verifique as permissões.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const toggleRecord = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const sendVoiceMessage = async (audioBlob: Blob) => {
    setIsProcessingAudio(true)
    setIsTyping(true)

    try {
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      reader.onloadend = async () => {
        if (!reader.result) return
        const base64data = (reader.result as string).split(",")[1]

        try {
          const response = await apiFetch(`/api/speech-to-text`, {
            method: "POST",
            body: JSON.stringify({
              audio: base64data,
              mimeType: "audio/webm"
            })
          })

          const data = await response.json().catch(() => ({}))
          const transcript = data.transcript || ""

          if (!response.ok && data.errorType === "RATE_LIMIT_DAILY") {
            setRateLimited(true)
            setMessages((prev) => [
              ...prev,
              {
                sender: "ai",
                text: data.error,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })
              }
            ])
          } else if (transcript) {
            await handleSendMessage(transcript)
          } else {
            setMessages((prev) => [
              ...prev,
              {
                sender: "ai",
                text: "Não consegui entender o áudio. Pode digitar ou tentar gravar novamente?",
                timestamp: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })
              }
            ])
          }
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              sender: "ai",
              text: "Não consegui contato com o servidor para enviar o áudio. Verifique sua conexão de rede.",
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })
            }
          ])
        } finally {
          setIsProcessingAudio(false)
          setIsTyping(false)
        }
      }
    } catch {
      setIsProcessingAudio(false)
      setIsTyping(false)
    }
  }

  // ─── Compose Trigger ────────────────────────────────────
  const triggerCompose = () => {
    onFinishChat(messages)
  }

  const lastMsg = messages[messages.length - 1]?.text || ""
  const isReadyToCompose =
    lastMsg.toLowerCase().includes("finalizar") ||
    lastMsg.toLowerCase().includes("compor") ||
    messages.filter((m) => m.sender === "user").length >= 3

  return (
    <div
      id="chat-container"
      className="flex-1 flex flex-col min-h-0 relative bg-white"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col min-h-0"
      >
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 bg-white">
              {messages.map((msg: ChatMessage, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      msg.sender === "user"
                        ? "bg-[#FF5A5F] text-white rounded-br-none"
                        : "bg-gray-50 text-gray-800 rounded-bl-none border border-gray-100"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <span className="block text-[10px] opacity-60 text-right mt-1.5 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                  {/* Quick-reply option buttons (only on latest AI message) */}
                  {msg.sender === "ai" &&
                    msg.options &&
                    msg.options.length > 0 &&
                    index === messages.length - 1 && (
                      <div className="flex flex-wrap gap-2 mt-2 max-w-[90%]">
                        {msg.options.map((opt, oi) => (
                          <button
                            key={oi}
                            onClick={() => handleSendMessage(opt)}
                            disabled={isTyping || isRecording}
                            className="text-xs bg-white border border-[#FF5A5F]/30 text-[#FF5A5F] font-semibold px-3 py-1.5 rounded-full hover:bg-[#FFF0F0] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                </motion.div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 text-gray-400 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 border border-gray-100">
                    <span
                      className="w-2 h-2 bg-[#FF5A5F] rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-[#FF5A5F] rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-[#FF5A5F] rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Controls */}
            <div className="p-4 bg-white border-t border-gray-100 space-y-3">
              {isReadyToCompose && (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={triggerCompose}
                  className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-[#FF5A5F]/15 flex items-center justify-center gap-2 text-sm tracking-wide transition-all cursor-pointer"
                >
                  Concluir e Compor Música
                </motion.button>
              )}

              {/* Input Row: Text + morphing Mic/Send button */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSendMessage(inputValue)
                  }
                  placeholder={
                    rateLimited
                      ? "Limite diário atingido — volte amanhã 🌙"
                      : isRecording
                        ? "🔴 Gravando áudio..."
                        : "Digite sua mensagem..."
                  }
                  disabled={isTyping || isRecording || rateLimited}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15 disabled:opacity-55"
                />

                <button
                  onClick={() =>
                    isRecording
                      ? toggleRecord()
                      : inputValue.trim()
                        ? handleSendMessage(inputValue)
                        : toggleRecord()
                  }
                  disabled={isTyping || isProcessingAudio || rateLimited}
                  className={`p-3 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer shrink-0 ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse scale-110"
                      : inputValue.trim()
                        ? "bg-[#FF5A5F] hover:bg-[#e04f53] text-white"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200"
                  }`}
                  title={
                    isRecording
                      ? "Clique para parar de gravar"
                      : inputValue.trim()
                        ? "Enviar mensagem"
                        : "Gravar áudio"
                  }
                >
                  {isRecording ? (
                    <MicOff className="w-5 h-5" />
                  ) : isProcessingAudio ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : inputValue.trim() ? (
                    <Send className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
    </div>
  )
}
