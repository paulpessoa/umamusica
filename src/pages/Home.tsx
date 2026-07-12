import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, Play, Pause, Lock, FileText, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import MobileFrame from "../components/MobileFrame";
import { useAuth } from "../contexts/AuthContext";

const IllustrationChat = () => (
  <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
    <rect x="4" y="6" width="28" height="20" rx="6" fill="#FFE4E4" />
    <rect x="4" y="6" width="28" height="20" rx="6" stroke="#FF5A5F" strokeWidth="1.5" />
    <path d="M10 26 L6 32 L14 29" fill="#FFE4E4" stroke="#FF5A5F" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M20 11 L20 19 M20 19 C20 20.1 19.1 21 18 21 C16.9 21 16 20.1 16 19 C16 17.9 16.9 17 18 17 C18.7 17 19.4 17.4 19.8 18" stroke="#FF5A5F" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M20 11 L26 9 L26 14 L20 16" stroke="#FF5A5F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="34" cy="8" r="2.5" fill="#FF5A5F" opacity="0.3" />
    <circle cx="38" cy="14" r="1.5" fill="#FF5A5F" opacity="0.5" />
    <path d="M34 3 L34 5 M31.5 5.5 L33 7 M36.5 5.5 L35 7" stroke="#FF5A5F" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
  </svg>
);

const IllustrationPix = () => (
  <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
    <path d="M22 4 L36 10 L36 24 C36 31 29 38 22 40 C15 38 8 31 8 24 L8 10 Z" fill="#E8F5E9" stroke="#4CAF50" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M22 14 L26 18 L22 22 L18 18 Z" fill="#4CAF50" opacity="0.8" />
    <path d="M16 18 L18 16 L20 18 L18 20 Z" fill="#4CAF50" opacity="0.5" />
    <path d="M24 18 L26 16 L28 18 L26 20 Z" fill="#4CAF50" opacity="0.5" />
    <path d="M22 22 L24 24 L22 26 L20 24 Z" fill="#4CAF50" opacity="0.5" />
    <path d="M17 30 L20 33 L27 26" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IllustrationDownload = () => (
  <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
    <rect x="10" y="4" width="24" height="36" rx="5" fill="#FFF0F0" stroke="#FF5A5F" strokeWidth="1.5" />
    <rect x="14" y="8" width="16" height="20" rx="3" fill="white" stroke="#FFD0D0" strokeWidth="1" />
    <path d="M22 13 L22 20 M22 20 C22 21.1 21.1 22 20 22 C18.9 22 18 21.1 18 20 C18 18.9 18.9 18 20 18 C20.7 18 21.4 18.4 21.8 19" stroke="#FF5A5F" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M22 13 L26 12 L26 16 L22 17" stroke="#FF5A5F" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 31 L22 36 M19 33.5 L22 36 L25 33.5" stroke="#FF5A5F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="22" cy="38.5" r="1" fill="#FFB0B2" />
  </svg>
);

const featureItems = [
  {
    icon: <IllustrationChat />,
    title: "Compositor Inteligente",
    sub1: "Conte a sua história",
    sub2: "Perguntas fáceis no chat para guiar sua homenagem",
  },
  {
    icon: <IllustrationPix />,
    title: "Liberação Pix Imediata",
    sub1: "Pague via Pix",
    sub2: "Pagamento seguro via MercadoPago",
  },
  {
    icon: <IllustrationDownload />,
    title: "Receba sua música",
    sub1: "Baixe, ouça e compartilhe",
    sub2: "Receba no e-mail ou compartilhe o link com quem quiser",
  },
];

const exampleSongs = [
  {
    id: 1,
    title: "Bodas de Diamante",
    genre: "Bossa Nova",
    story: "Homenagem aos avós pelos 60 anos de união",
    author: "Marina L.",
    avatar: "https://i.pravatar.cc/150?img=47",
    audioUrl: "/assets/examples/bodas_de_diamante.mp3"
  },
  {
    id: 2,
    title: "Amor de Faculdade",
    genre: "Pop Rock",
    story: "Canção para o namorado, celebrando a formatura",
    author: "Ana B.",
    avatar: "https://i.pravatar.cc/150?img=32",
    audioUrl: "/assets/examples/amor_de_faculdade.mp3"
  },
  {
    id: 3,
    title: "O Sertanejo do Paizão",
    genre: "Sertanejo",
    story: "Música animada para o pai pelos 60 anos",
    author: "Rodrigo S.",
    avatar: "https://i.pravatar.cc/150?img=12",
    audioUrl: "/assets/examples/sertanejo-do-paizao.mp3"
  },
];

export default function Home() {
  const [playingExampleId, setPlayingExampleId] = useState<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const exampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!exampleAudioRef.current) return;
    if (playingExampleId === null) {
      exampleAudioRef.current.pause();
    } else {
      const selected = exampleSongs.find(s => s.id === playingExampleId);
      if (selected) {
        exampleAudioRef.current.src = selected.audioUrl;
        exampleAudioRef.current.play().catch(e => console.log("Failed to play example:", e));
      }
    }
  }, [playingExampleId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    if (user) {
      navigate("/chat");
    } else {
      navigate("/login");
    }
  };

  return (
    <MobileFrame>
      <motion.div
        key="landing"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        className="flex-1 flex flex-col min-h-0 bg-white"
      >
        <div className="flex-1 overflow-y-auto scrollbar-none px-5 pb-2 space-y-6 lg:space-y-4 flex flex-col justify-center lg:justify-start lg:pt-5">
          <div className="lg:hidden px-2">
            <div className="relative h-48 rounded-3xl p-6 flex flex-col items-center justify-center overflow-hidden">
              <motion.div
                animate={{
                  opacity: [0.15, 0.25, 0.15],
                  scale: [1, 1.05, 1]
                }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-br from-[#FF5A5F]/5 via-purple-200/5 to-blue-200/5 blur-3xl"
              />
              <div className="relative z-10">
                <AnimatePresence mode="wait">
                  {[0, 1, 2].map((index) => (
                    currentStepIndex === index && (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.35 }}
                        className="flex flex-col items-center justify-center px-6 py-6 text-center"
                      >
                        <motion.div
                          animate={
                            index === 0
                              ? { y: [0, -4, 0] }
                              : index === 1
                                ? { scale: [1, 1.12, 1] }
                                : { y: [0, -3, 0], opacity: [0.85, 1, 0.85] }
                          }
                          transition={
                            index === 0
                              ? { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
                              : index === 1
                                ? { repeat: Infinity, duration: 2, ease: "easeInOut" }
                                : { repeat: Infinity, duration: 3, ease: "easeInOut" }
                          }
                          className="mb-4"
                        >
                          {featureItems[index].icon}
                        </motion.div>
                        <p className="text-lg font-bold text-gray-900 leading-tight mb-2">{featureItems[index].title}</p>
                        <p className={`text-sm font-semibold mb-2 ${index === 1 ? "text-emerald-600" : index === 2 ? "text-orange-600" : "text-[#FF5A5F]"
                          }`}>{featureItems[index].sub1}</p>
                        <p className="text-xs text-gray-500 leading-relaxed px-2">{featureItems[index].sub2}</p>
                      </motion.div>
                    )
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] pt-30 font-semibold text-gray-400 tracking-wide text-center">
              Escuta estas criações:
            </p>
            <div className="space-y-2.5">
              {exampleSongs.map((song) => (
                <div key={song.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                  <button
                    onClick={() => setPlayingExampleId(playingExampleId === song.id ? null : song.id)}
                    className="w-10 h-10 rounded-full bg-[#FF5A5F] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    {playingExampleId === song.id
                      ? <Pause className="w-3.5 h-3.5 fill-white" />
                      : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-gray-900 truncate">{song.title}</p>
                    <p className="text-[10px] text-gray-400">{song.genre} · {song.story}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <img
                      src={song.avatar}
                      alt={song.author}
                      className="w-6 h-6 rounded-full border border-gray-200"
                    />
                    <span className="text-[10px] text-gray-500 font-medium">{song.author}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0 px-6 pt-3 pb-5 space-y-4 lg:space-y-6 border-t border-gray-100 bg-white flex justify-center">
          <button
            onClick={handleStart}
            className="w-full max-w-xs bg-[#FF5A5F] hover:bg-[#e04f53] text-white font-bold py-4 px-4 rounded-2xl shadow-lg shadow-[#FF5A5F]/15 flex items-center justify-center gap-2 text-sm tracking-wide transition-all cursor-pointer"
          >
            {user ? "Continuar Criação" : "Entrar / Criar Conta"}
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="text-center space-y-0.5 pt-2 lg:pt-8">
            <p className="text-[10px] text-gray-400">© 2026 1Música · Estúdio Virtual Autônomo ❤️</p>
            <div className="flex items-center justify-center gap-3 text-[10px] text-gray-400">
              <a href="/faq" className="underline hover:text-gray-600 transition-colors cursor-pointer">
                Perguntas Frequentes
              </a>
              <span>·</span>
              <a href="/termos" className="underline hover:text-gray-600 transition-colors cursor-pointer">
                Termos de Uso
              </a>
              <span>·</span>
              <a href="/privacidade" className="underline hover:text-gray-600 transition-colors cursor-pointer">
                Política de Privacidade
              </a>
            </div>
          </div>
        </div>
      </motion.div>
      <audio
        ref={exampleAudioRef}
        onEnded={() => setPlayingExampleId(null)}
        style={{ display: "none" }}
      />
    </MobileFrame>
  );
}
