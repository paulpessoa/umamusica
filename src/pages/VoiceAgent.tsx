import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import MobileFrame from "../components/MobileFrame"
import { PhoneOff, Mic, MicOff, ChevronDown, ChevronUp } from "lucide-react"
import { ChatMessage } from "../types"

type CallStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "ended"
  | "error"

const OUTPUT_SAMPLE_RATE = 24000
const INPUT_SAMPLE_RATE = 16000

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function VoiceAgent() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [status, setStatus] = useState<CallStatus>("idle")
  const [muted, setMuted] = useState(false)
  const [callSeconds, setCallSeconds] = useState(0)
  const [transcript, setTranscript] = useState<ChatMessage[]>([])
  const [showTranscript, setShowTranscript] = useState(true)
  const [micLevel, setMicLevel] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const audioCtxInRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioCtxOutRef = useRef<AudioContext | null>(null)
  const nextPlayTimeRef = useRef<number>(0)
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const micLevelRef = useRef<number>(0)
  const lastLevelPaintRef = useRef<number>(0)
  const mutedRef = useRef<boolean>(false)
  const statusRef = useRef<CallStatus>("idle")

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  useEffect(() => {
    return () => {
      cleanupCall()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Transcript merge (consecutive same-sender) ─────────
  const appendTranscript = (
    list: ChatMessage[],
    sender: "user" | "ai",
    text: string
  ): ChatMessage[] => {
    const trimmed = text.trim()
    if (!trimmed) return list
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
    const last = list[list.length - 1]
    if (last && last.sender === sender) {
      return [
        ...list.slice(0, -1),
        { sender, text: `${last.text} ${trimmed}`, timestamp: now }
      ]
    }
    return [...list, { sender, text: trimmed, timestamp: now }]
  }

  // ─── Native audio playback (Gemini -> 24kHz PCM) ───────
  const playAudio = (base64: string) => {
    let ctx = audioCtxOutRef.current
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE
      })
      audioCtxOutRef.current = ctx
    }
    if (ctx.state === "suspended") ctx.resume()

    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const int16 = new Int16Array(bytes.buffer)
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768

    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE)
    buffer.getChannelData(0).set(float32)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    activeSourcesRef.current.add(source)

    source.onended = () => {
      activeSourcesRef.current.delete(source)
    }

    if (nextPlayTimeRef.current < ctx.currentTime) {
      nextPlayTimeRef.current = ctx.currentTime + 0.05
    }
    source.start(nextPlayTimeRef.current)
    nextPlayTimeRef.current += buffer.duration

    setStatus("speaking")
  }

  const stopQueuedAudio = () => {
    for (const source of activeSourcesRef.current) {
      try {
        source.stop()
      } catch {
        // already stopped
      }
    }
    activeSourcesRef.current.clear()
    const ctx = audioCtxOutRef.current
    if (ctx) nextPlayTimeRef.current = ctx.currentTime
  }

  // ─── Mic capture (PCM 16k -> base64) ──────────────────
  const startMic = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: INPUT_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      micStreamRef.current = stream

      const ctxIn = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE
      })
      audioCtxInRef.current = ctxIn

      const source = ctxIn.createMediaStreamSource(stream)
      const processor = ctxIn.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (event) => {
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        if (mutedRef.current) return

        const input = event.inputBuffer.getChannelData(0)

        let sumSquares = 0
        for (let i = 0; i < input.length; i++) {
          const s = input[i]
          sumSquares += s * s
        }
        const rms = Math.sqrt(sumSquares / Math.max(1, input.length))
        micLevelRef.current = rms
        const now = performance.now()
        if (now - lastLevelPaintRef.current > 80) {
          lastLevelPaintRef.current = now
          setMicLevel(rms)
        }

        if (statusRef.current === "listening" && rms >= 0.012) {
          setStatus("processing")
        }

        const pcm16 = new Int16Array(input.length)
        for (let i = 0; i < input.length; i++) {
          const sample = Math.max(-1, Math.min(1, input[i]))
          pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        }

        let binary = ""
        const bytes = new Uint8Array(pcm16.buffer)
        for (let i = 0; i < bytes.byteLength; i++)
          binary += String.fromCharCode(bytes[i])

        ws.send(
          JSON.stringify({
            type: "audio",
            data: btoa(binary),
            mimeType: "audio/pcm;rate=16000"
          })
        )
      }

      const silentGain = ctxIn.createGain()
      silentGain.gain.value = 0
      source.connect(processor)
      processor.connect(silentGain)
      silentGain.connect(ctxIn.destination)

      return true
    } catch {
      alert("Não foi possível acessar o microfone. Verifique as permissões.")
      return false
    }
  }

  const stopMic = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
      } catch {
        // ignore
      }
    }
    processorRef.current?.disconnect()
    processorRef.current = null
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current = null
    audioCtxInRef.current?.close().catch(() => {})
    audioCtxInRef.current = null
  }

  const cleanupCall = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
    stopMic()
    stopQueuedAudio()
    audioCtxOutRef.current?.close().catch(() => {})
    audioCtxOutRef.current = null
    if (wsRef.current) {
      try {
        wsRef.current.close()
      } catch {
        // ignore
      }
      wsRef.current = null
    }
  }

  // ─── Checkout handoff (mirrors App.tsx ChatRoute) ───────
  const goToCheckout = async (finalTranscript: ChatMessage[]) => {
    if (!user) return
    setStatus("ended")
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.session_token}`
          },
          body: JSON.stringify({
            email: user.email,
            chatTranscript: finalTranscript,
            structuredPrompt: JSON.stringify(finalTranscript)
          })
        }
      )
      if (response.ok) {
        const data = await response.json()
        cleanupCall()
        navigate(`/checkout/${data.orderId}`, {
          state: {
            paymentQr: data.paymentQr,
            paymentCopiaCola: data.paymentCopiaCola,
            paymentId: data.paymentId
          }
        })
      } else {
        throw new Error("Checkout falhou")
      }
    } catch {
      setStatus("error")
      alert("Erro ao ir para o pagamento. Voltando ao menu.")
      cleanupCall()
      navigate("/menu")
    }
  }

  // ─── Connect / start call ───────────────────────────────
  const startCall = async () => {
    if (!user) {
      navigate("/login")
      return
    }
    setStatus("connecting")
    setTranscript([])
    setCallSeconds(0)
    setMicLevel(0)

    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
    const wsHost = apiBase || window.location.host
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${proto}//${wsHost}/api/voice/ws?session_token=${user.session_token || ""}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: OUTPUT_SAMPLE_RATE
    })
    audioCtxOutRef.current = ctx
    nextPlayTimeRef.current = ctx.currentTime
    await ctx.resume().catch(() => {})

    ws.onopen = () => {
      setStatus("listening")
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)

        if (msg.type === "connected") {
          startMic()
          return
        }

        if (msg.type === "error") {
          setStatus("error")
          alert(msg.message || "Erro na conexão com o agente.")
          cleanupCall()
          navigate("/menu")
          return
        }

        if (msg.type === "interview_complete") {
          goToCheckout(msg.transcript || transcript)
          return
        }

        if (msg.type === "gemini") {
          const data = msg.data

          if (data.serverContent?.interrupted) {
            stopQueuedAudio()
            setStatus("processing")
          }

          if (data.serverContent?.modelTurn?.parts) {
            data.serverContent.modelTurn.parts.forEach((part: any) => {
              if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
                playAudio(part.inlineData.data)
              }
            })
          }

          if (data.serverContent?.inputTranscription?.text) {
            setTranscript((prev) =>
              appendTranscript(prev, "user", data.serverContent.inputTranscription.text)
            )
          }

          if (data.serverContent?.outputTranscription?.text) {
            setStatus("speaking")
            setTranscript((prev) =>
              appendTranscript(prev, "ai", data.serverContent.outputTranscription.text)
            )
          }

          if (
            data.serverContent?.generationComplete ||
            data.serverContent?.turnComplete
          ) {
            if (activeSourcesRef.current.size === 0) setStatus("listening")
          }

          if (data.toolCall?.functionCalls) {
            const calls = data.toolCall.functionCalls as any[]
            const responses = calls.map((call) => ({
              id: call.id,
              name: call.name,
              response: { result: "ok" }
            }))
            ws.send(JSON.stringify({ type: "tool_response", responses }))
            if (calls.some((c) => c.name === "finish_interview")) {
              setStatus("processing")
            }
          }
        }
      } catch {
        // ignore malformed
      }
    }

    ws.onerror = () => {
      setStatus("error")
    }

    ws.onclose = () => {
      if (statusRef.current !== "ended") {
        setStatus("idle")
      }
    }

    callTimerRef.current = setInterval(() => {
      setCallSeconds((s) => s + 1)
    }, 1000)
  }

  const hangUp = () => {
    cleanupCall()
    navigate("/menu")
  }

  const toggleMute = () => {
    setMuted((m) => !m)
  }

  if (!user) {
    navigate("/login")
    return null
  }

  const isActive =
    status === "connecting" ||
    status === "listening" ||
    status === "processing" ||
    status === "speaking"

  const userActive = status === "listening" || status === "processing"
  const aiActive = status === "speaking"

  const orbColor = (active: boolean, base: string) =>
    active ? base : "rgba(148,163,184,0.18)"

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button
            onClick={hangUp}
            className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors"
            aria-label="Voltar"
          >
            <PhoneOff className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2 flex-1">Ligação</h1>
          <span className="text-xs font-mono text-gray-500 tabular-nums">
            {formatTime(callSeconds)}
          </span>
        </div>

        {/* Conversation orbs */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-8 bg-gradient-to-b from-white to-gray-50">
          <div className="flex items-center gap-10">
            {/* User orb */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-300"
                style={{
                  background: orbColor(userActive, "#FF5A5F"),
                  boxShadow: userActive
                    ? "0 0 0 6px rgba(255,90,95,0.15), 0 0 30px rgba(255,90,95,0.35)"
                    : "none"
                }}
              >
                <span className="text-white font-bold text-2xl">Você</span>
                <div className="absolute -bottom-1 flex items-end gap-1 h-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full bg-[#FF5A5F] transition-all"
                      style={{
                        height: userActive ? `${8 + micLevel * 220 + (i % 2) * 6}px` : "6px",
                        opacity: userActive ? 1 : 0.3,
                        animation: userActive ? "va-bounce 0.6s ease-in-out infinite alternate" : "none",
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-500">Você</span>
            </div>

            {/* AI orb */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-300"
                style={{
                  background: orbColor(aiActive, "#6366F1"),
                  boxShadow: aiActive
                    ? "0 0 0 6px rgba(99,102,241,0.15), 0 0 30px rgba(99,102,241,0.35)"
                    : "none"
                }}
              >
                <span className="text-white font-bold text-xs text-center px-2 leading-tight">
                Compositor
                <br />
                1Música
              </span>
                <div className="absolute -bottom-1 flex items-end gap-1 h-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full bg-[#6366F1] transition-all"
                      style={{
                        height: aiActive ? `${10 + (i % 3) * 6}px` : "6px",
                        opacity: aiActive ? 1 : 0.3,
                        animation: aiActive ? "va-bounce 0.5s ease-in-out infinite alternate" : "none",
                        animationDelay: `${i * 0.12}s`
                      }}
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-500">Compositor 1Música</span>
            </div>
          </div>

          <p className="text-sm text-center text-gray-500 max-w-[16rem]">
            {status === "idle" && "Toque em “Ligar” para iniciar a entrevista por voz."}
            {status === "connecting" && "Conectando ao compositor..."}
            {status === "listening" && "🎙️ Ouvindo... fale naturalmente."}
            {status === "processing" && "Processando sua fala..."}
            {status === "speaking" && "🔊 O compositor está falando..."}
            {status === "ended" && "Finalizando e levando ao pagamento..."}
            {status === "error" && "Erro na conexão. Tente novamente."}
          </p>
        </div>

        {/* Live transcript (collapsible) */}
        <div className="border-t border-gray-100 bg-white">
          <button
            onClick={() => setShowTranscript((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500"
          >
            <span>Transcrição ao vivo</span>
            {showTranscript ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
          {showTranscript && (
            <div className="max-h-40 overflow-y-auto px-4 pb-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-200">
              {transcript.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">
                  A conversa aparece aqui em tempo real.
                </p>
              ) : (
                transcript.map((m, i) => (
                  <div
                    key={i}
                    className={`text-xs leading-relaxed ${
                      m.sender === "user" ? "text-right text-gray-700" : "text-left text-[#6366F1]"
                    }`}
                  >
                    <span className="font-semibold">
                      {m.sender === "user" ? "Você" : "Compositor"}:
                    </span>{" "}
                    {m.text}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-center gap-4">
          {status === "idle" || status === "error" ? (
            <button
              onClick={startCall}
              className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#FF5A5F]/15"
            >
              Ligar para o Compositor
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors ${
                  muted
                    ? "bg-gray-100 text-gray-400"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
                aria-label={muted ? "Desmutar" : "Mutar"}
              >
                {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={hangUp}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg"
              >
                <PhoneOff className="w-6 h-6" />
                Desligar
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes va-bounce {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1.3); }
        }
      `}</style>
    </MobileFrame>
  )
}
