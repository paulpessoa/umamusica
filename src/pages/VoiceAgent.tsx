import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import MobileFrame from "../components/MobileFrame"
import { MicOff, Phone, PhoneOff } from "lucide-react"

export default function VoiceAgent() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<"idle" | "connecting" | "listening" | "processing" | "speaking" | "error">("idle")
  const [transcript, setTranscript] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (!user) {
      navigate("/login")
      return
    }
  }, [user, navigate])

  const connectAgent = async () => {
    setStatus("connecting")
    try {
      const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
      const wsHost = apiBase || window.location.host
      const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${wsHost}/api/voice/ws?session_token=${user?.session_token || ""}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus("listening")
      }

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === "gemini") {
            const data = msg.data
            if (data.serverContent?.modelTurn?.parts) {
              const text = data.serverContent.modelTurn.parts.map((p: any) => p.text || "").join(" ")
              if (text) {
                setTranscript((prev) => [...prev, `IA: ${text}`])
                setStatus("speaking")
                const utterance = new SpeechSynthesisUtterance(text)
                utterance.lang = "pt-BR"
                speechSynthesis.speak(utterance)
                utterance.onend = () => {
                  setStatus("listening")
                }
              }
            }
            if (data.toolCall) {
              const calls = data.toolCall.functionCalls || []
              const responses = calls.map((call: any) => ({
                id: call.id,
                name: call.name,
                response: { result: "ok" }
              }))
              ws.send(JSON.stringify({ type: "tool_response", responses }))
              if (calls.some((c: any) => c.name === "finish_interview")) {
                setStatus("idle")
                ws.close()
                navigate("/chat", { state: { initialMessages: transcript.map((t, i) => ({ sender: i % 2 === 0 ? "user" : "ai", text: t.split(": ")[1] || t, timestamp: new Date().toLocaleTimeString() })) } })
              }
            }
          } else if (msg.type === "error") {
            setStatus("error")
            ws.close()
          }
        } catch {
          // ignore
        }
      }

      ws.onerror = () => {
        setStatus("error")
      }

      ws.onclose = () => {
        setStatus("idle")
      }

      startRecording()
    } catch {
      setStatus("error")
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())
        await sendAudioChunk(blob)
      }
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
    } catch {
      alert("Não foi possível acessar o microfone.")
      setStatus("idle")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === "listening") {
      mediaRecorderRef.current.stop()
    }
  }

  const sendAudioChunk = async (blob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    setStatus("processing")
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onloadend = () => {
      if (!reader.result) return
      const base64 = (reader.result as string).split(",")[1]
      wsRef.current?.send(JSON.stringify({ type: "audio", data: base64, mimeType: "audio/webm" }))
      setStatus("listening")
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && status === "listening") {
          stopRecording()
        }
      }, 2000)
    }
  }

  const disconnect = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    wsRef.current?.close()
    setStatus("idle")
    navigate("/menu")
  }

  if (!user) return null

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button
            onClick={() => navigate("/menu")}
            className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors"
          >
            <PhoneOff className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2">
            Agente de Voz
          </h1>
        </div>

        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              {status === "idle" && "Toque no botão abaixo para iniciar a entrevista com o agente."}
              {status === "connecting" && "Conectando ao agente..."}
              {status === "listening" && "🎙️ Ouvindo... Fale naturalmente."}
              {status === "processing" && "Processando seu áudio..."}
              {status === "speaking" && "🔊 O agente está falando..."}
              {status === "error" && "Erro na conexão. Tente novamente."}
            </p>
          </div>

          <div className="space-y-2">
            {transcript.map((line, i) => (
              <p key={i} className="text-xs text-gray-600 bg-white border border-gray-100 rounded-xl p-3">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-center">
          {status === "idle" || status === "error" ? (
            <button
              onClick={connectAgent}
              className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#FF5A5F]/15"
            >
              <Phone className="w-5 h-5" />
              Iniciar Entrevista por Voz
            </button>
          ) : status === "listening" || status === "processing" ? (
            <button
              onClick={stopRecording}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 animate-pulse"
            >
              <MicOff className="w-5 h-5" />
              Parar de Falar
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              Encerrar
            </button>
          )}
        </div>
      </div>
    </MobileFrame>
  )
}
