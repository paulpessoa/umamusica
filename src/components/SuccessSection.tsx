import React, { useState, useEffect } from "react";
import { Music, CheckCircle2, ChevronRight, RefreshCw, Mail } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Order, SongMetadata } from "../types";
import AudioPlayer from "./AudioPlayer";

interface SuccessSectionProps {
  orderId: string;
  onRestart: () => void;
}

export default function SuccessSection({ orderId, onRestart }: SuccessSectionProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadingPhrases = [
    "Analisando memórias e sentimentos... 🧠",
    "Compondo versos rimados... ✍️",
    "Estruturando refrões e harmonias... 🎵",
    "Ajustando arranjo e ritmo... 🎸",
    "Sintetizando vocais... 🎙️",
    "Preparando seu presente... 🎁",
  ];

  // Fetch order and trigger composition
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data: Order = await res.json();
          setOrder(data);

          if (data.status === "paid" && !isGenerating) {
            triggerComposition();
          }

          if (data.status === "completed" || data.status === "failed") {
            clearInterval(intervalId);
          }
        }
      } catch {
        console.error("Failed to load order");
      }
    };

    fetchOrder();
    intervalId = setInterval(fetchOrder, 4000);
    return () => clearInterval(intervalId);
  }, [orderId]);

  useEffect(() => {
    if (!order || order.status !== "processing") return;
    const timer = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingPhrases.length - 1 ? prev + 1 : prev));
    }, 4500);
    return () => clearInterval(timer);
  }, [order]);

  const triggerComposition = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      setErrorMessage(null);
      await fetch(`/api/orders/${orderId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      setErrorMessage("Ocorreu um atraso. Tentando novamente...");
      setIsGenerating(false);
    }
  };

  if (!order) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-gray-400 bg-white">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#FF5A5F] mx-auto" />
          <p className="text-sm">Carregando...</p>
        </div>
      </div>
    );
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
            <div className="relative flex items-center justify-center">
              <div className="absolute w-28 h-28 bg-[#FFF0F0] rounded-full animate-ping"></div>
              <div className="absolute w-24 h-24 bg-[#FFF0F0] rounded-full animate-pulse"></div>
              <div className="w-20 h-20 bg-[#FF5A5F] rounded-full flex items-center justify-center shadow-lg shadow-[#FF5A5F]/20 z-10">
                <Music className="w-9 h-9 text-white animate-bounce" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-lg text-gray-900">Sua canção está sendo composta!</h3>
              <p className="text-xs text-[#FF5A5F] font-semibold font-mono tracking-wide">
                {loadingPhrases[loadingStep]}
              </p>
              <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                Isso leva de 15 a 30 segundos...
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
              <p className="text-[10px] text-amber-600 font-mono italic max-w-xs">{errorMessage}</p>
            )}
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
              <h2 className="font-extrabold text-xl text-gray-900">Estorno Efetuado! 💸</h2>
              <p className="text-xs text-rose-600 font-bold font-mono tracking-wide">
                Geração de música indisponível
              </p>
              <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
                Lamentamos muito! Devido a uma instabilidade no nosso motor de composição, não foi possível gerar a sua música personalizada.
              </p>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4.5 text-left text-xs text-emerald-800 space-y-1.5 max-w-xs mx-auto shadow-sm">
                <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Dinheiro Devolvido!
                </span>
                <p className="leading-relaxed text-emerald-700">
                  Um estorno automático e integral de <strong>R$ 1,00</strong> foi enviado de volta para a sua conta Pix no Mercado Pago. Detalhes também foram enviados para o seu e-mail.
                </p>
              </div>
            </div>

            <button
              onClick={onRestart}
              className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-6 rounded-2xl transition-all duration-200 text-xs shadow-sm cursor-pointer"
            >
              Voltar ao Início
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="completed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Success Header */}
            <div className="text-center space-y-2 bg-[#FFF4F2]/80 p-5 rounded-3xl border border-[#FF5A5F]/10 shadow-sm relative overflow-hidden">
              <div className="absolute -top-4 left-6 w-8 h-8 text-amber-400 opacity-60 rotate-12">✨</div>
              <div className="absolute top-2 right-8 w-6 h-6 text-[#FF5A5F] opacity-40 -rotate-12">🎉</div>

              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="font-bold text-xl text-gray-900">Sua música ficou pronta! 🎵</h2>
              <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
                Enviamos o link de download para <span className="text-[#FF5A5F] font-semibold">{order.email}</span>.
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 mt-2">
                <Mail className="w-3.5 h-3.5" />
                <span>Verifique sua caixa de entrada e SPAM</span>
              </div>
            </div>

            {/* Audio Player */}
            {order.song_metadata && (
              <AudioPlayer
                orderId={order.id}
                metadata={order.song_metadata}
                hasAudio={!!order.audio_storage_path}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                currentTime={currentTime}
                setCurrentTime={setCurrentTime}
                duration={duration}
                setDuration={setDuration}
              />
            )}

            {/* CTA */}
            <div className="pt-2 text-center">
              <button
                onClick={onRestart}
                className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 hover:text-gray-900 font-semibold py-2.5 px-5 rounded-full border border-gray-200 transition-all cursor-pointer"
              >
                Compor mais uma música por R$ 1,00
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
