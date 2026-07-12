import React from 'react';
import { Music } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─── Inline SVG illustrations (clean modern flat, no weird shapes) ───────────

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

// Typing effect words for headline
const typingWords = [
  "música",
  "memória",
  "arte",
  "canção",
  "presente",
  "homenagem",
];

// Typing effect component
function TypingHeadline() {
  const [displayedText, setDisplayedText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = typingWords[wordIndex];
    const typingSpeed = isDeleting ? 50 : 100;
    const delayBeforeDelete = 2500;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (charIndex < currentWord.length) {
          setDisplayedText(currentWord.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          // Wait before deleting
          setTimeout(() => setIsDeleting(true), delayBeforeDelete);
        }
      } else {
        // Deleting
        if (charIndex > 0) {
          setDisplayedText(currentWord.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          // Move to next word
          setIsDeleting(false);
          setWordIndex((wordIndex + 1) % typingWords.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, wordIndex, isDeleting]);

  return (
    <h1 className="text-5xl font-extrabold text-gray-950 leading-tight mb-6 tracking-tight">
      Suas palavras viram{" "}
      <span className="text-[#FF5A5F] relative inline-block min-w-[200px]">
        {displayedText}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute bottom-0 left-0 w-1 h-8 bg-[#FF5A5F] ml-0.5"
        />
        <span className="absolute left-0 bottom-1 w-full h-1.5 bg-[#FF5A5F]/15 rounded-full" />
      </span>
    </h1>
  );
}

interface MobileFrameProps {
  children: React.ReactNode;
}

export default function MobileFrame({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div
      id="mobile-frame-container"
      className="min-h-screen bg-white flex items-stretch selection:bg-[#FF5A5F] selection:text-white font-sans text-gray-800 antialiased overflow-x-hidden"
    >
      <div className="flex flex-col lg:flex-row w-full min-h-screen bg-white overflow-visible">

        {/* LEFT BRAND PANEL */}
        <div className="hidden lg:flex flex-col justify-between lg:w-1/2 lg:shrink-0 p-14 bg-[#FFF4F2] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-white rounded-full opacity-40 blur-3xl pointer-events-none" />

          {/* Logo + headline */}
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-10">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="absolute inset-0 rounded-xl bg-[#FF5A5F] shadow-md shadow-[#FF5A5F]/20"
                />
                <Music className="relative z-10 w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-gray-900">
                  1<span className="text-[#FF5A5F]">Música</span>
                </span>
                <span className="text-lg font-bold text-gray-400">=</span>
                <div className="relative">
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0 bg-emerald-400 rounded-lg blur-md"
                  />
                  <motion.span
                    animate={{
                      scale: [1, 1.05, 1],
                      textShadow: [
                        "0 0 8px rgba(16, 185, 129, 0.5)",
                        "0 0 20px rgba(16, 185, 129, 0.8)",
                        "0 0 8px rgba(16, 185, 129, 0.5)"
                      ]
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="relative text-xl font-black text-emerald-600"
                  >
                    R$ 1 real
                  </motion.span>
                </div>
              </div>
            </div>

            <TypingHeadline />
            <p className="text-base text-gray-600 leading-relaxed max-w-sm">
              Transforme memórias e histórias reais em uma canção exclusiva, letras perfeitas baseadas em quem você quer homenagear.
            </p>
          </div>

          {/* Feature bullets com animação */}
          <div className="space-y-5 relative z-10">
            {featureItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 * i, duration: 0.4, ease: "easeOut" }}
                className="flex items-start space-x-4"
              >
                <motion.div
                  animate={
                    i === 0
                      ? { y: [0, -4, 0] }
                      : i === 1
                        ? { scale: [1, 1.12, 1] }
                        : { y: [0, -3, 0], opacity: [0.8, 1, 0.8] }
                  }
                  transition={
                    i === 0
                      ? { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
                      : i === 1
                        ? { repeat: Infinity, duration: 2, ease: "easeInOut" }
                        : { repeat: Infinity, duration: 3, ease: "easeInOut" }
                  }
                  className="shrink-0"
                >
                  {item.icon}
                </motion.div>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">{item.title}</p>
                  <p className={`text-xs font-semibold leading-tight mt-0.5 ${i === 1 ? "text-emerald-600" : i === 2 ? "text-orange-600" : "text-[#FF5A5F]"
                    }`}>{item.sub1}</p>
                  <p className="text-xs text-gray-500 leading-snug mt-0.5">{item.sub2}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>

        {/* RIGHT APP FRAME */}
        <div className="flex-1 min-w-0 lg:w-1/2 lg:shrink-0 flex flex-col bg-white relative min-h-screen lg:min-h-0 lg:h-full">

          {/* Floating badge (Desktop) */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md shadow-sm rounded-full py-1.5 px-4 border border-gray-100 hidden lg:flex items-center space-x-3 z-50">
            {user ? (
              <>
                <button onClick={() => navigate('/perfil')} className="text-sm font-bold text-gray-700 hover:text-[#FF5A5F] transition-colors">
                  Perfil
                </button>
                <div className="w-px h-4 bg-gray-200"></div>
                <button onClick={logout} className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
                  Sair
                </button>
              </>
            ) : (
              <button onClick={() => navigate('/login')} className="text-sm font-bold text-[#FF5A5F] hover:text-[#e0484d] transition-colors">
                Entrar / Criar Conta
              </button>
            )}
          </div>

          <div id="phone-frame" className="relative w-full flex-1 flex flex-col overflow-hidden transition-all duration-300 min-h-0">

            {/* Header */}
            <header id="app-brand-header" className="relative z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between lg:justify-end shrink-0">
              {/* Mobile logo — spinning rounded square, static icon */}
              <div className="flex items-center gap-2 lg:hidden">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                    className="absolute inset-0 rounded-lg bg-[#FF5A5F] shadow-md shadow-[#FF5A5F]/30"
                    style={{ borderRadius: "8px" }}
                  />
                  <Music className="relative z-10 w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div>
                    <span className="font-bold text-base text-gray-900 tracking-tight">1</span>
                    <span className="text-[#FF5A5F] font-bold text-sm ml-0.5">Música</span>
                  </div>
                  <span className="text-sm font-bold text-gray-400">=</span>
                  <div className="relative">
                    <motion.div
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.2, 0.5, 0.2]
                      }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="absolute inset-0 bg-emerald-400 rounded blur-sm"
                    />
                    <motion.span
                      animate={{
                        scale: [1, 1.08, 1],
                        textShadow: [
                          "0 0 6px rgba(16, 185, 129, 0.4)",
                          "0 0 15px rgba(16, 185, 129, 0.7)",
                          "0 0 6px rgba(16, 185, 129, 0.4)"
                        ]
                      }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="relative text-xs font-black text-emerald-600"
                    >
                      R$ 1 real
                    </motion.span>
                  </div>
                </div>
              </div>

              {/* Mobile Auth Actions */}
              <div className="lg:hidden flex items-center space-x-3">
                {user ? (
                  <>
                    <button onClick={() => navigate('/perfil')} className="text-sm font-bold text-gray-700 hover:text-[#FF5A5F] transition-colors">
                      Perfil
                    </button>
                    <button onClick={logout} className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
                      Sair
                    </button>
                  </>
                ) : (
                  <button onClick={() => navigate('/login')} className="text-sm font-bold text-[#FF5A5F] bg-[#FFF0F0] px-3 py-1.5 rounded-full hover:bg-[#ffe4e4] transition-colors">
                    Entrar
                  </button>
                )}
              </div>
            </header>

            <main id="app-main-content" className="flex-1 flex flex-col min-h-0 relative bg-white">
              {children}
            </main>
          </div>
        </div>

      </div>
    </div>
  );
}