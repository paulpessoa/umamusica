import React, { useState, useEffect } from "react";
import { CheckCircle2, Mail, Headphones, Radio, Zap, Volume2, Waves, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Order } from "../types";
import AudioPlayer from "./AudioPlayer";

interface SuccessSectionProps {
  orderId: string;
  onRestart: () => void;
  isSharedView?: boolean;
}

export default function SuccessSection({ orderId, onRestart, isSharedView = false }: SuccessSectionProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentInstrumentIndex, setCurrentInstrumentIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const instruments = [
    { icon: <Headphones className="w-8 h-8" />, label: "Headphones" },
    { icon: <Volume2 className="w-8 h-8" />, label: "Speaker" },
    { icon: <Waves className="w-8 h-8" />, label: "Waves" },
    { icon: <Radio className="w-8 h-8" />, label: "Radio" },
    { icon: <Zap className="w-8 h-8" />, label: "Electric" },
  ];
  const loadingPhrases = [
    "Analisando memórias e sentimentos... 🧠",
    "Compondo versos rimados... ✍️",
    "Estruturando refrões e harmonias... 🎵",
    "Ajustando arranjo e ritmo... 🎸",
    "Sintetizando vocais... 🎙️",
    "Preparando seu presente... 🎁",
  ];

  // Auto-rotate instruments every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentInstrumentIndex((prev: number) => (prev + 1) % instruments.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch order and trigger composition
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}`);
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
      setLoadingStep((prev: number) => (prev + 1) % loadingPhrases.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [order, loadingPhrases.length]);

  const triggerComposition = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      setErrorMessage(null);
      await fetch(`${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}/generate`, {
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
              <h3 className="font-bold text-lg text-gray-900">Sua canção está sendo composta!</h3>
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
              <h2 className="font-extrabold text-xl text-gray-900">
                {order.payment_id && !order.payment_id.startsWith("mock") && !order.payment_id.startsWith("simulated") && !order.payment_id.startsWith("coupon")
                  ? "Estorno Efetuado! 💸"
                  : "Erro ao Compor! ⚠️"}
              </h2>
              <p className="text-xs text-rose-600 font-bold font-mono tracking-wide">
                Geração de música indisponível
              </p>
              <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
                Lamentamos muito! Devido a uma instabilidade no nosso motor de composição de IA, não foi possível gerar a sua música personalizada.
              </p>

              {order.payment_id && !order.payment_id.startsWith("mock") && !order.payment_id.startsWith("simulated") && !order.payment_id.startsWith("coupon") ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4.5 text-left text-xs text-emerald-800 space-y-1.5 max-w-xs mx-auto shadow-sm">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Estorno Automático Processado!
                  </span>
                  <p className="leading-relaxed text-emerald-700">
                    Um estorno automático e integral de <strong>R$ 1,00</strong> foi devolvido para a sua conta Pix no Mercado Pago. Você não precisa fazer nada – o reembolso chegará automaticamente em sua conta. Em caso de dúvidas, entre em contato conosco em <span className="font-bold">contato@qisites.com.br</span>.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4.5 text-left text-xs text-gray-700 space-y-1.5 max-w-xs mx-auto shadow-sm">
                  <span className="font-bold flex items-center gap-1.5 text-gray-900">
                    <CheckCircle2 className="w-4 h-4 text-gray-500" />
                    Pedido Cancelado
                  </span>
                  <p className="leading-relaxed text-gray-600">
                    Como este pedido foi iniciado via cupom ou ambiente de testes, nenhuma cobrança financeira foi realizada. Em caso de dúvidas, fale conosco em <span className="font-bold text-[#FF5A5F]">contato@qisites.com.br</span>.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onRestart}
              className="bg-[#FF5A5F] hover:bg-[#e04f53] text-white font-bold py-3 px-6 rounded-2xl transition-all duration-200 text-xs shadow-sm cursor-pointer"
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

              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="font-bold text-xl text-gray-900">
                {isSharedView ? "Uma Homenagem para Você!" : "Sua música ficou pronta!"}
              </h2>
              {isSharedView ? (
                <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
                  Ouça a canção personalizada composta especialmente para você!
                </p>
              ) : (
                <>
                  <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
                    Enviamos o link de download para: <span className="text-[#FF5A5F] font-semibold">{order.email}</span>
                  </p>
                </>
              )}
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
                className="inline-flex items-center gap-1.5 bg-[#FF5A5F] hover:bg-[#e04f53] text-white text-xs font-bold py-3 px-6 rounded-full shadow-md shadow-[#FF5A5F]/15 transition-all cursor-pointer"
              >
                {isSharedView ? "Quero criar uma música personalizada também! " : "Compor mais uma música?"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
