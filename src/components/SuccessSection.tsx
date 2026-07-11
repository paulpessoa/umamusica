import React, { useState, useEffect } from "react";
import { Sparkles, Music, CheckCircle2, ChevronRight, RefreshCw, VolumeX, Mail, Star, Play, Pause, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Order, SongMetadata } from "../types";
import AudioPlayer from "./AudioPlayer";
import UpsellSection from "./UpsellSection";

const exampleSongs = [
  {
    id: 1,
    title: "Bodas de Diamante",
    genre: "Bossa Nova Acústica",
    story: "Homenagem aos avós Alzira e Francisco pelos 60 anos de união. Conta sobre o início simples no interior e a grande família que criaram.",
    comment: "Emocionante! Colocamos para tocar no almoço de Bodas e todos choraram. A letra capturou perfeitamente as memórias que contamos para o robô!",
    author: "Marina Lima",
    likes: 42
  },
  {
    id: 2,
    title: "Amor de Faculdade",
    genre: "Pop Rock Leve",
    story: "Canção para o namorado Lucas, celebrando a formatura e o início da vida juntos na cidade. Cita as noites estudando e o primeiro beijo no ônibus.",
    comment: "Melhor presente! O Lucas não acreditou que foi feita especialmente para ele. O refrão chiclete não sai da nossa cabeça desde ontem.",
    author: "Ana Beatriz",
    likes: 29
  },
  {
    id: 3,
    title: "O Sertanejo do Paizão",
    genre: "Sertanejo Universitário",
    story: "Música animada para o Seu José pelos 60 anos. Recheada de causos engraçados sobre pescarias e sua paixão por churrasco com os amigos.",
    comment: "Sensacional! Ritmo contagiante e as piadas sobre pescaria ficaram ótimas. Meu pai ficou orgulhoso demais e já mandou no grupo da família.",
    author: "Rodrigo Santos",
    likes: 56
  }
];

interface SuccessSectionProps {
  orderId: string;
  onRestart: () => void;
}

export default function SuccessSection({ orderId, onRestart }: SuccessSectionProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playingExampleId, setPlayingExampleId] = useState<number | null>(null);

  // Shared audio state for synchronizing slideshow
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadingPhrases = [
    "Analisando memórias e sentimentos da entrevista... 🧠",
    "Compondo versos rimados e rimas poéticas... ✍️",
    "Estruturando os refrões e pontes harmônicas... 🎵",
    "Ajustando o arranjo acústico e ritmo... 🎸",
    "Sintetizando os vocais no estúdio de IA... 🎙️",
    "Embalando e preparando seu presente de R$ 1,00... 🎁"
  ];

  // Fetch order and trigger composition once if order is "paid"
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchOrderData = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data: Order = await res.json();
          setOrder(data);

          // If payment was confirmed but song is not generated yet, trigger composition
          if (data.status === "paid") {
            triggerComposition();
          }

          // If completed, clear polling
          if (data.status === "completed" || data.status === "failed") {
            clearInterval(intervalId);
          }
        }
      } catch (e) {
        console.error("Failed to load order:", e);
      }
    };

    fetchOrderData();
    intervalId = setInterval(fetchOrderData, 4000);

    return () => clearInterval(intervalId);
  }, [orderId]);

  // Handle loading steps animation
  useEffect(() => {
    if (!order || order.status !== "processing") return;

    const timer = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingPhrases.length - 1 ? prev + 1 : prev));
    }, 4500);

    return () => clearInterval(timer);
  }, [order]);

  const triggerComposition = async () => {
    try {
      setErrorMessage(null);
      await fetch(`/api/orders/${orderId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      setErrorMessage("Ocorreu um pequeno atraso na composição. Estamos tentando novamente...");
    }
  };

  const handleUpsellCompleted = () => {
    setOrder((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        upsell_paid: true,
        video_url: "completed_slideshow_video",
      };
    });
  };

  if (!order) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-gray-400 bg-white">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#FF5A5F] mx-auto" />
          <p className="text-sm">Carregando estúdio musical...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="success-screen" className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent bg-white">
      
      <AnimatePresence mode="wait">
        {order.status === "processing" || order.status === "paid" ? (
          /* PROCESSING / LOADING STATE */
          <motion.div
            key="processing-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full flex flex-col justify-center items-center text-center space-y-8 py-12 px-2 bg-white"
          >
            {/* Pulsing Studio Circle */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-28 h-28 bg-[#FFF0F0] rounded-full animate-ping"></div>
              <div className="absolute w-24 h-24 bg-[#FFF0F0] rounded-full animate-pulse"></div>
              <div className="w-20 h-20 bg-[#FF5A5F] rounded-full flex items-center justify-center shadow-lg shadow-[#FF5A5F]/20 border border-white/10 z-10">
                <Music className="w-9 h-9 text-white animate-bounce" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-lg text-gray-900">
                Sua canção está sendo composta!
              </h3>
              <p className="text-xs text-[#FF5A5F] font-semibold font-mono tracking-wide">
                Status: {loadingPhrases[loadingStep]}
              </p>
              <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                Nossa IA está trabalhando as rimas e melodias baseadas na sua história. Isso leva aproximadamente de 15 a 30 segundos...
              </p>
            </div>

            {/* Custom Micro Progress Indicator */}
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
          </motion.div>
        ) : (
          /* COMPLETED SONG STATE */
          <motion.div
            key="completed-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Celebration Confetti Header */}
            <div className="text-center space-y-2 bg-[#FFF4F2]/80 p-5 rounded-3xl border border-[#FF5A5F]/10 shadow-sm relative overflow-hidden">
              {/* Confetti simulation keyframe sparkles */}
              <div className="absolute -top-4 left-6 w-8 h-8 text-amber-400 opacity-60 rotate-12">✨</div>
              <div className="absolute top-2 right-8 w-6 h-6 text-[#FF5A5F] opacity-40 -rotate-12">🎉</div>
              
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="font-bold text-xl text-gray-900">
                Sua música ficou pronta! 🎵
              </h2>
              <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
                Pix confirmado e canção produzida com sucesso! Enviamos também o link de acesso exclusivo para o seu e-mail <span className="text-[#FF5A5F] font-semibold">{order.email}</span>.
              </p>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 mt-2">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>Verifique sua caixa de entrada e SPAM</span>
              </div>
            </div>

            {/* Embedded custom polished audio player */}
            {order.song_metadata && (
              <AudioPlayer 
                audioUrl={order.audio_url} 
                metadata={order.song_metadata}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                currentTime={currentTime}
                setCurrentTime={setCurrentTime}
                duration={duration}
                setDuration={setDuration}
              />
            )}

            {/* Dynamic visual upsell section */}
            <UpsellSection 
              orderId={order.id} 
              isPaid={order.upsell_paid} 
              onUpsellCompleted={handleUpsellCompleted}
              audioIsPlaying={isPlaying}
              audioCurrentTime={currentTime}
            />

            {/* Inspirations & Fictional Customer Reviews Section */}
            <div className="border-t border-gray-100 pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-[#FFF0F0] text-[#FF5A5F]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wider">
                  Inspirações de Sucesso 🌟
                </h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Veja exemplos de músicas criadas por outros clientes e as reações emocionantes que elas geraram:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {exampleSongs.map((song) => (
                  <div 
                    key={song.id} 
                    className="bg-gray-50 border border-gray-100/70 p-4.5 rounded-2xl flex flex-col justify-between space-y-3.5 transition-all duration-200 hover:shadow-xs"
                  >
                    {/* Header */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] bg-white border border-gray-200/50 text-[#FF5A5F] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {song.genre}
                        </span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          ))}
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5 pt-1">
                        <Music className="w-4 h-4 text-[#FF5A5F] shrink-0" />
                        {song.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 italic leading-relaxed line-clamp-3">
                        "{song.story}"
                      </p>
                    </div>

                    {/* Interactive mini player simulation */}
                    <div className="bg-white border border-gray-100 p-2.5 rounded-xl flex items-center justify-between gap-3">
                      <button
                        onClick={() => setPlayingExampleId(playingExampleId === song.id ? null : song.id)}
                        className="w-8 h-8 rounded-full bg-[#FF5A5F] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                      >
                        {playingExampleId === song.id ? (
                          <Pause className="w-3.5 h-3.5 fill-white text-white" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[9px] text-gray-400 font-medium mb-1">
                          <span>Amostra de Áudio</span>
                          <span>{playingExampleId === song.id ? "0:15" : "0:00"}</span>
                        </div>
                        {playingExampleId === song.id ? (
                          /* Pulsing equalizer bars */
                          <div className="flex items-end gap-0.5 h-3.5 pt-1.5 overflow-hidden">
                            {[...Array(14)].map((_, i) => (
                              <span 
                                key={i} 
                                className="w-1 bg-[#FF5A5F] rounded-xs animate-pulse"
                                style={{ 
                                  height: `${[80, 40, 95, 60, 100, 30, 85, 45, 90, 70, 50, 80, 60, 40][i % 14]}%`,
                                  animationDuration: `${[0.6, 0.4, 0.7, 0.5, 0.8, 0.3, 0.6, 0.45, 0.75, 0.55, 0.4, 0.65, 0.5, 0.35][i % 14]}s`
                                }}
                              ></span>
                            ))}
                          </div>
                        ) : (
                          /* Flat static bar */
                          <div className="w-full h-1 bg-gray-100 rounded-full"></div>
                        )}
                      </div>
                    </div>

                    {/* Customer Review Bubble */}
                    <div className="bg-white border border-gray-100/60 p-3 rounded-xl space-y-1.5 text-left">
                      <p className="text-[11px] text-gray-600 leading-relaxed italic">
                        "{song.comment}"
                      </p>
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100/50 text-[10px] text-gray-400">
                        <span className="font-bold text-gray-500">{song.author}</span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-[#FF5A5F] fill-[#FF5A5F]" /> {song.likes}
                        </span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* CTA to compose another one */}
            <div className="pt-2 text-center">
              <button
                onClick={onRestart}
                className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 hover:text-gray-900 font-semibold py-2.5 px-5 rounded-full border border-gray-200 transition-all duration-200 cursor-pointer"
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
