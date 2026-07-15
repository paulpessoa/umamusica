import React, { useState, useEffect } from "react"
import {
  CheckCircle2,
  Headphones,
  Radio,
  Zap,
  Volume2,
  Waves,
  AlertCircle,
  RefreshCw,
  ChevronRight
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useNavigate, useLocation } from "react-router-dom"
import { Order } from "../types"
import AudioPlayer from "./AudioPlayer"
import { useAuth } from "../contexts/AuthContext"

interface SuccessSectionProps {
  orderId: string
  onRestart: () => void
  isSharedView?: boolean
}

export default function SuccessSection({
  orderId,
  onRestart,
  isSharedView = false
}: SuccessSectionProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [order, setOrder] = useState<Order | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentInstrumentIndex, setCurrentInstrumentIndex] = useState(0)

  const instruments = [
    { icon: <Headphones className="w-8 h-8" />, label: "Headphones" },
    { icon: <Volume2 className="w-8 h-8" />, label: "Speaker" },
    { icon: <Waves className="w-8 h-8" />, label: "Waves" },
    { icon: <Radio className="w-8 h-8" />, label: "Radio" },
    { icon: <Zap className="w-8 h-8" />, label: "Electric" }
  ]
  const loadingPhrases = [
    "Analisando memórias e sentimentos... 🧠",
    "Compondo versos rimados... ✍️",
    "Estruturando refrões e harmonias... 🎵",
    "Ajustando arranjo e ritmo... 🎸",
    "Sintetizando vocais... 🎙️",
    "Preparando seu presente... 🎁"
  ]

  // Auto-rotate instruments every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentInstrumentIndex(
        (prev: number) => (prev + 1) % instruments.length
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const [editedLyrics, setEditedLyrics] = useState("")

  // Check if user came from "Minhas Músicas"
  const cameFromMySongs = location.state?.from === "my-songs"

  // Smart navigation: go back to origin or restart
  const handleBackNavigation = () => {
    if (cameFromMySongs && user) {
      navigate("/minhas-musicas")
    } else {
      onRestart()
    }
  }

  // Initialize edited lyrics when order data loads
  useEffect(() => {
    if (order && order.song_metadata && !editedLyrics) {
      setEditedLyrics(order.song_metadata.lyrics || "")
    }
  }, [order])

  // Manage isGenerating state reactively based on order status
  useEffect(() => {
    if (order) {
      if (
        order.status === "completed" ||
        order.status === "failed" ||
        order.status === "failed_safety"
      ) {
        setIsGenerating(false)
      }
    }
  }, [order?.status])

  // Fetch order periodically when in paid or processing state
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const headers: Record<string, string> = {}
        if (user?.session_token) {
          headers["Authorization"] = `Bearer ${user.session_token}`
        }
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}`,
          { headers }
        )
        if (res.ok) {
          const data: Order = await res.json()
          setOrder(data)
        }
      } catch {
        console.error("Failed to load order")
      }
    }

    fetchOrder()

    let intervalId: NodeJS.Timeout | null = null
    if (
      !order ||
      order.status === "paid" ||
      order.status === "processing" ||
      order.status === "lyrics_review"
    ) {
      intervalId = setInterval(fetchOrder, 4000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [orderId, order?.status])

  // After a successful payment we compose the lyrics draft (no audio yet).
  // Runs once when the order reaches the `paid` state.
  const composedRef = React.useRef(false)
  useEffect(() => {
    if (order && order.status === "paid" && !composedRef.current) {
      composedRef.current = true
      composeLyrics()
    }
  }, [order])

  useEffect(() => {
    if (!order || order.status !== "processing") return
    const timer = setInterval(() => {
      setLoadingStep((prev: number) => (prev + 1) % loadingPhrases.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [order, loadingPhrases.length])

  // Step 1 (post-payment): compose the lyrics draft WITHOUT generating audio.
  const composeLyrics = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    try {
      setErrorMessage(null)
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (user?.session_token) {
        headers["Authorization"] = `Bearer ${user.session_token}`
      }
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}/compose-lyrics`,
        {
          method: "POST",
          headers
        }
      )
      if (res.ok) {
        const data = await res.json()
        if (data.song_metadata?.lyrics) {
          setEditedLyrics(data.song_metadata.lyrics)
        }
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: data.status,
                song_metadata: data.song_metadata
              }
            : prev
        )
        setIsGenerating(false)
      } else {
        setErrorMessage("Erro ao compor a letra. Tente novamente.")
        setIsGenerating(false)
      }
    } catch {
      setErrorMessage("Erro de conexão ao compor a letra.")
      setIsGenerating(false)
    }
  }

  const handleRetryCompose = async () => {
    composedRef.current = false
    await composeLyrics()
  }

  const handleRecompose = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setErrorMessage(null)

    // Set status to processing locally for immediate loader response
    setOrder((prev) => (prev ? { ...prev, status: "processing" } : null))

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (user?.session_token) {
        headers["Authorization"] = `Bearer ${user.session_token}`
      }
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}/generate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ lyrics: editedLyrics })
        }
      )
      if (!res.ok) {
        const data = await res.json()
        if (data.error) {
          setErrorMessage(data.error)
        }
        setIsGenerating(false)
        // Force status fetch to sync state
        const refetchHeaders: Record<string, string> = {}
        if (user?.session_token) {
          refetchHeaders["Authorization"] = `Bearer ${user.session_token}`
        }
        const refetch = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}`,
          { headers: refetchHeaders }
        )
        if (refetch.ok) {
          const freshData = await refetch.json()
          setOrder(freshData)
        }
      }
    } catch {
      setErrorMessage("Erro ao conectar ao servidor. Tente novamente.")
      setIsGenerating(false)
      setOrder((prev) => (prev ? { ...prev, status: "failed_safety" } : null))
    }
  }

  if (!order) {
    return (
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 bg-white animate-pulse">
        {/* Skeleton Vinyl Disk */}
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div className="w-40 h-40 bg-gray-100 rounded-full flex items-center justify-center relative shadow-sm">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
            </div>
          </div>
          <div className="h-4 bg-gray-200 rounded-md w-3/4 mx-auto"></div>
          <div className="h-3 bg-gray-200 rounded-md w-1/2 mx-auto"></div>
          <div className="flex gap-1.5 justify-center pt-2">
            <div className="h-5 bg-gray-100 rounded-full w-16"></div>
            <div className="h-5 bg-gray-100 rounded-full w-20"></div>
          </div>
        </div>

        {/* Skeleton Progress */}
        <div className="space-y-2.5 px-2">
          <div className="h-1.5 bg-gray-100 rounded-full w-full"></div>
          <div className="flex justify-between">
            <div className="h-3 bg-gray-100 rounded-md w-10"></div>
            <div className="h-3 bg-gray-100 rounded-md w-10"></div>
          </div>
        </div>

        {/* Skeleton Controls */}
        <div className="flex items-center justify-between gap-4 px-2 pt-2">
          <div className="h-6 bg-gray-100 rounded-md w-20"></div>
          <div className="w-14 h-14 bg-gray-200 rounded-full shrink-0"></div>
          <div className="w-9 h-9 bg-gray-100 rounded-xl shrink-0"></div>
        </div>

        {/* Skeleton Lyrics Box */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3.5">
          <div className="h-4 bg-gray-200 rounded-md w-1/4"></div>
          <div className="space-y-2 pt-1">
            <div className="h-3.5 bg-gray-200 rounded-md w-full"></div>
            <div className="h-3.5 bg-gray-200 rounded-md w-5/6"></div>
            <div className="h-3.5 bg-gray-200 rounded-md w-11/12"></div>
            <div className="h-3.5 bg-gray-200 rounded-md w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 bg-white">
      <AnimatePresence mode="wait">
        {order.status === "processing" || order.status === "paid" ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full flex flex-col justify-center items-center text-center space-y-8 py-12 px-2"
          >
            {/* Rotating square with random instruments */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Rotating square */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                className="absolute inset-0 rounded-2xl bg-[#FF5A5F] shadow-md shadow-[#FF5A5F]/20"
              />

              {/* Static instrument icon in center */}
              <div className="relative z-10 w-16 h-16 flex items-center justify-center text-white">
                {instruments[currentInstrumentIndex].icon}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-lg text-gray-900">
                Sua canção está sendo composta!
              </h3>
              <p className="text-xs text-[#FF5A5F] font-semibold font-mono tracking-wide">
                {loadingPhrases[loadingStep]}
              </p>
              <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                Em menos de um minuto...
              </p>
            </div>

            <div className="w-full max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
              <motion.div
                className="h-full bg-[#FF5A5F] rounded-full"
                animate={{ width: ["10%", "30%", "65%", "85%", "98%"] }}
                transition={{ duration: 25, ease: "easeInOut" }}
              />
            </div>

            {errorMessage && (
              <p className="text-[10px] text-amber-600 font-mono italic max-w-xs">
                {errorMessage}
              </p>
            )}
            {errorMessage && (
              <button
                onClick={handleRetryCompose}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 bg-white border border-[#FF5A5F]/30 text-[#FF5A5F] font-bold py-2.5 px-5 rounded-xl hover:bg-[#FFF0F0] transition-all text-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </button>
            )}
          </motion.div>
        ) : order.status === "lyrics_review" ? (
          <motion.div
            key="lyrics_review"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col justify-center items-center text-center space-y-5 py-6 px-4"
          >
            <div className="w-14 h-14 rounded-full bg-[#FFF0F0] border border-[#FF5A5F]/20 flex items-center justify-center text-[#FF5A5F] shadow-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2.5 max-w-md w-full">
              <h2 className="font-extrabold text-xl text-gray-900">
                Revise sua letra
              </h2>
              <p className="text-xs text-[#FF5A5F] font-bold font-mono tracking-wide">
                Quase lá! Confira o que compusemos
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Leia a letra abaixo. Você pode ajustar as palavras livremente —
                o <strong>estilo musical será mantido</strong> exatamente igual
                quando gerarmos o áudio.
              </p>

              <div className="mt-4 text-left space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  Letra da Música
                </label>
                <textarea
                  value={editedLyrics}
                  onChange={(e) => setEditedLyrics(e.target.value)}
                  rows={10}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] transition-all resize-none scrollbar-thin"
                />
              </div>

              {errorMessage && (
                <p className="text-[10px] text-rose-500 font-mono italic mt-2">
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-2 w-full max-w-md">
              <button
                onClick={handleRecompose}
                disabled={isGenerating || !editedLyrics.trim()}
                className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
              >
                {isGenerating ? "Gerando sua música..." : "Gerar minha música"}
                {!isGenerating && <ChevronRight className="w-4 h-4" />}
              </button>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Ao gerar, você receberá o link por e-mail e poderá compartilhar.
              </p>
            </div>
          </motion.div>
        ) : order.status === "failed_safety" ? (
          <motion.div
            key="failed_safety"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col justify-center items-center text-center space-y-5 py-6 px-4"
          >
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2.5 max-w-md w-full">
              <h2 className="font-extrabold text-xl text-gray-900">
                Ajuste sua letra!
              </h2>
              <p className="text-xs text-amber-600 font-bold font-mono tracking-wide">
                Filtro de segurança da IA acionado
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Algumas palavras ou combinações poéticas na sua letra acionaram
                as diretrizes de moderação do Google. Não se preocupe! Seu
                crédito foi preservado. Ajuste o texto abaixo (dica: simplifique
                metáforas muito intensas ou substitua termos com duplo sentido)
                e tente novamente.
              </p>

              <div className="mt-4 text-left space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  Letra da Música
                </label>
                <textarea
                  value={editedLyrics}
                  onChange={(e) => setEditedLyrics(e.target.value)}
                  rows={10}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] transition-all resize-none scrollbar-thin"
                />
              </div>

              {errorMessage && (
                <p className="text-[10px] text-rose-500 font-mono italic mt-2">
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBackNavigation}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-2xl transition-all duration-200 text-xs shadow-sm cursor-pointer"
              >
                {cameFromMySongs
                  ? "Voltar às Minhas Músicas"
                  : "Voltar ao Início"}
              </button>
              <button
                onClick={handleRecompose}
                disabled={isGenerating || !editedLyrics.trim()}
                className="bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-200 text-xs shadow-sm cursor-pointer"
              >
                {isGenerating ? "Compondo..." : "Re-compor Manual"}
              </button>
            </div>
          </motion.div>
        ) : order.status === "failed" ? (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col justify-center items-center text-center space-y-6 py-8 px-4"
          >
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>

            <div className="space-y-3">
              <h2 className="font-extrabold text-xl text-gray-900">
                {order.payment_id &&
                !order.payment_id.startsWith("mock") &&
                !order.payment_id.startsWith("simulated") &&
                !order.payment_id.startsWith("coupon")
                  ? "Estorno Efetuado! 💸"
                  : "Erro ao Compor! ⚠️"}
              </h2>
              <p className="text-xs text-rose-600 font-bold font-mono tracking-wide">
                Geração de música indisponível
              </p>
              <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
                Lamentamos muito! Devido a uma instabilidade no nosso motor de
                composição de IA, não foi possível gerar a sua música
                personalizada.
              </p>

              {order.payment_id &&
              !order.payment_id.startsWith("mock") &&
              !order.payment_id.startsWith("simulated") &&
              !order.payment_id.startsWith("coupon") ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4.5 text-left text-xs text-emerald-800 space-y-1.5 max-w-xs mx-auto shadow-sm">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Estorno Automático Processado!
                  </span>
                  <p className="leading-relaxed text-emerald-700">
                    Um estorno automático e integral de <strong>R$ 1,00</strong>{" "}
                    foi devolvido para a sua conta Pix no Mercado Pago. Você não
                    precisa fazer nada – o reembolso chegará automaticamente em
                    sua conta. Em caso de dúvidas, entre em contato conosco em{" "}
                    <span className="font-bold">contato@qisites.com.br</span>.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4.5 text-left text-xs text-gray-700 space-y-1.5 max-w-xs mx-auto shadow-sm">
                  <span className="font-bold flex items-center gap-1.5 text-gray-900">
                    <CheckCircle2 className="w-4 h-4 text-gray-500" />
                    Pedido Cancelado
                  </span>
                  <p className="leading-relaxed text-gray-600">
                    Como este pedido foi iniciado via cupom ou ambiente de
                    testes, nenhuma cobrança financeira foi realizada. Em caso
                    de dúvidas, fale conosco em{" "}
                    <span className="font-bold text-[#FF5A5F]">
                      contato@qisites.com.br
                    </span>
                    .
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleBackNavigation}
              className="bg-[#FF5A5F] hover:bg-[#e04f53] text-white font-bold py-3 px-6 rounded-2xl transition-all duration-200 text-xs shadow-sm cursor-pointer"
            >
              {cameFromMySongs
                ? "Voltar às Minhas Músicas"
                : "Voltar ao Início"}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="completed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Audio Player */}
            {order.song_metadata && (
              <AudioPlayer
                orderId={order.id}
                metadata={order.song_metadata}
                hasAudio={!!order.audio_storage_path}
                onDeleted={() => navigate("/minhas-musicas")}
              />
            )}

            {/* CTA */}
            <div className="pt-2 text-center space-y-2">
              {cameFromMySongs ? (
                <button
                  onClick={() => navigate("/minhas-musicas")}
                  className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-3 px-6 rounded-full shadow-sm transition-all cursor-pointer"
                >
                  Voltar às Minhas Músicas
                </button>
              ) : (
                <button
                  onClick={onRestart}
                  className="inline-flex items-center gap-1.5 bg-[#FF5A5F] hover:bg-[#e04f53] text-white text-xs font-bold py-3 px-6 rounded-full shadow-md shadow-[#FF5A5F]/15 transition-all cursor-pointer"
                >
                  {isSharedView
                    ? "Quero criar uma música personalizada também! "
                    : "Compor mais uma música?"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
