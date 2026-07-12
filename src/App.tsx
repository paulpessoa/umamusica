import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, Mail, Play, Pause, Lock, FileText, ArrowLeft, MessageCircle, ShieldCheck, Download, Gift } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import MobileFrame from "./components/MobileFrame";
import ChatSection from "./components/ChatSection";
import CheckoutSection from "./components/CheckoutSection";
import SuccessSection from "./components/SuccessSection";
import { ChatMessage } from "./types";

type ViewState = "landing" | "verify" | "chat" | "checkout" | "success";

// Inline SVG illustrations for steps carousel (mobile)
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

// Example songs data for landing page
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

export default function App() {
  const [view, setView] = useState<ViewState>("landing");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentQr, setPaymentQr] = useState("");
  const [paymentCopiaCola, setPaymentCopiaCola] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [playingExampleId, setPlayingExampleId] = useState<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [isSharedView, setIsSharedView] = useState(false);

  const exampleAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play/Pause effect for landing page examples
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

  // Auto-rotate steps carousel every 3 seconds (mobile only)
  useEffect(() => {
    if (view !== "landing") return;

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % 3);
    }, 3000);

    return () => clearInterval(interval);
  }, [view]);

  // Deep-link support
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("orderId");
    if (idFromUrl) {
      setOrderId(idFromUrl);
      setIsSharedView(true);
      setView("success");
    }
  }, []);

  // ─── OTP Flow ─────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setOtpError("Digite um e-mail válido");
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const alreadyVerified = localStorage.getItem("1musica_verified_email");
    if (alreadyVerified === cleanEmail) {
      setView("chat");
      return;
    }

    setOtpSending(true);
    setOtpError("");
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setView("verify");
      } else {
        setOtpError(data.error || "Erro ao enviar código. Tente novamente.");
      }
    } catch {
      setOtpError("Sem conexão com o servidor. Verifique sua internet.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setOtpError("Digite o código de 6 dígitos");
      return;
    }
    setOtpVerifying(true);
    setOtpError("");
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        localStorage.setItem("1musica_verified_email", email.toLowerCase().trim());
        setView("chat");
      } else {
        setOtpError(data.error || "Código inválido ou expirado");
      }
    } catch {
      setOtpError("Erro de conexão com o servidor.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleFinishChat = async (chatTranscript: ChatMessage[]) => {
    try {
      setView("checkout");
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          chatTranscript,
          structuredPrompt: JSON.stringify(chatTranscript),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setOrderId(data.orderId);
        setPaymentQr(data.paymentQr);
        setPaymentCopiaCola(data.paymentCopiaCola);
      } else {
        throw new Error("Checkout failed");
      }
    } catch {
      const mockId = "mock_" + Math.random().toString(36).substr(2, 9);
      setOrderId(mockId);
      setPaymentQr(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=mock-pix-${mockId}`);
      setPaymentCopiaCola(`00020126580014br.gov.bcb.pix0136unamusica-mock-${mockId}`);
    }
  };

  const handlePaymentConfirmed = () => setView("success");

  const handleRestart = () => {
    setOrderId(null);
    setEmail("");
    setOtpCode("");
    setPaymentQr("");
    setPaymentCopiaCola("");
    window.history.pushState({}, document.title, "/");
    setView("landing");
  };

  return (
    <MobileFrame>
      <AnimatePresence mode="wait">
        {/* ═══ LANDING PAGE ═══ */}
        {view === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col min-h-0 bg-white"
          >
            {/* ── Scrollable top content ── */}
            <div className="flex-1 overflow-y-auto scrollbar-none px-5 pb-2 space-y-6 lg:space-y-4 flex flex-col justify-center lg:justify-start lg:pt-5">

              {/* Steps section - mobile only carousel */}
              <div className="lg:hidden px-2">
                <div className="relative h-48 rounded-3xl p-6 flex flex-col items-center justify-center overflow-hidden">
                  {/* Animated smoke/mist background */}
                  <motion.div
                    animate={{
                      opacity: [0.15, 0.25, 0.15],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-br from-[#FF5A5F]/5 via-purple-200/5 to-blue-200/5 blur-3xl"
                  />

                  {/* Floating particles/smoke effect */}
                  <div className="absolute inset-0 overflow-hidden">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          y: [0, -50, -100],
                          x: [0, Math.sin(i) * 30, Math.cos(i) * 30],
                          opacity: [0, 0.3, 0]
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 5 + i * 0.5,
                          ease: "easeInOut",
                          delay: i * 0.8
                        }}
                        className="absolute w-20 h-20 bg-gradient-to-r from-[#FF5A5F]/20 to-purple-300/20 rounded-full blur-2xl"
                        style={{
                          left: `${25 + i * 15}%`,
                          top: `${80 - i * 10}%`
                        }}
                      />
                    ))}
                  </div>

                  {/* Content */}
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

              {/* Exemplos de músicas */}
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

            {/* ── Fixed bottom: email + botão + rodapé ── */}
            <div className="shrink-0 px-6 pt-3 pb-5 space-y-4 lg:space-y-6 border-t border-gray-100 bg-white">
              <form onSubmit={handleSendOtp} className="space-y-2.5 pb-24">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu melhor e-mail..."
                    required
                    className="w-full bg-gray-50 hover:bg-gray-50/80 border border-gray-200/70 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={otpSending}
                  className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-[#FF5A5F]/15 flex items-center justify-center gap-2 text-sm tracking-wide transition-all cursor-pointer"
                >
                  {otpSending ? "Enviando..." : "Criar Música Agora"}
                  {!otpSending && <ChevronRight className="w-4 h-4" />}
                </button>
                {otpError && <p className="text-xs text-red-500 text-center">{otpError}</p>}
              </form>

              <div className="text-center space-y-0.5 pt-2 lg:pt-8">
                <p className="text-[10px] text-gray-400">© 2026 1Música · Estúdio Virtual Autônomo ❤️</p>
                <div className="flex items-center justify-center gap-3 text-[10px] text-gray-400">
                  <button onClick={() => setShowTerms(true)} className="underline hover:text-gray-600 transition-colors cursor-pointer">
                    Termos de Uso
                  </button>
                  <span>·</span>
                  <button onClick={() => setShowPrivacy(true)} className="underline hover:text-gray-600 transition-colors cursor-pointer">
                    Política de Privacidade
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ EMAIL VERIFICATION (OTP) ═══ */}
        {view === "verify" && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[#FFF0F0] text-[#FF5A5F] flex items-center justify-center mx-auto mb-6 border border-[#FF5A5F]/10">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="font-bold text-xl text-gray-900 mb-2">Verifique seu e-mail</h2>
            <p className="text-xs text-gray-500 max-w-xs mx-auto mb-6 leading-relaxed">
              Enviamos um código de 6 dígitos para <span className="font-bold text-[#FF5A5F]">{email}</span>. Confira sua caixa de entrada (e spam).
            </p>

            <div className="w-full max-w-xs space-y-4">
              <input
                type="text"
                value={otpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtpCode(val);
                  setOtpError("");
                }}
                placeholder="000000"
                maxLength={6}
                className="w-full text-center text-3xl font-mono font-bold tracking-[0.5em] bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-4 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F]/30"
              />

              <button
                onClick={handleVerifyOtp}
                disabled={otpVerifying || otpCode.length !== 6}
                className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-[#FF5A5F]/15 flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
              >
                {otpVerifying ? "Verificando..." : "Confirmar Código"}
              </button>

              {otpError && <p className="text-xs text-red-500">{otpError}</p>}

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setView("landing")}
                  className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Trocar e-mail
                </button>
                <button
                  onClick={handleSendOtp}
                  className="text-xs text-[#FF5A5F] hover:text-[#e04f53] underline transition-colors cursor-pointer"
                >
                  Reenviar código
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ CHAT ═══ */}
        {view === "chat" && <ChatSection email={email} onFinishChat={handleFinishChat} />}

        {/* ═══ CHECKOUT ═══ */}
        {view === "checkout" && orderId && (
          <CheckoutSection
            orderId={orderId}
            paymentQr={paymentQr}
            paymentCopiaCola={paymentCopiaCola}
            onPaymentConfirmed={handlePaymentConfirmed}
          />
        )}

        {/* ═══ SUCCESS ═══ */}
        {view === "success" && orderId && (
          <SuccessSection orderId={orderId} onRestart={handleRestart} />
        )}
      </AnimatePresence>

      {/* ═══ TERMS OF SERVICE MODAL ═══ */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowTerms(false)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#FF5A5F]" />
                  <h3 className="font-bold text-lg text-gray-900">Termos de Uso</h3>
                </div>
                <button onClick={() => setShowTerms(false)} className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer">×</button>
              </div>
              <div className="p-6 overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-4">
                <p><strong>1. Aceitação dos Termos</strong><br />Ao utilizar o 1Música, você concorda com estes Termos de Uso. O serviço é oferecido por QiSites.</p>
                <p><strong>2. Descrição do Serviço</strong><br />O 1Música utiliza inteligência artificial para criar músicas personalizadas com base em informações fornecidas pelo usuário, pelo valor de R$ 1,00 (um real) por música.</p>
                <p><strong>3. Cadastro e E-mail</strong><br />O usuário deve fornecer um e-mail válido e verificado para receber o link de download da música. O 1Música não se responsabiliza por e-mails incorretos ou inacessíveis.</p>
                <p><strong>4. Pagamento</strong><br />O pagamento é processado via Pix (MercadoPago). Após confirmação, a composição é gerada automaticamente. Não há reembolso após a geração da música.</p>
                <p><strong>5. Conteúdo Gerado</strong><br />As músicas são geradas por IA e podem conter imperfeições. O usuário recebe uma licença pessoal e não-exclusiva para uso da música gerada. O conteúdo não pode ser comercializado sem autorização.</p>
                <p><strong>6. Uso Aceitável</strong><br />É proibido usar o serviço para gerar conteúdo ofensivo, discriminatório, violento, sexualmente explícito ou que viole direitos de terceiros. Reservamo-nos o direito de recusar a geração nesses casos.</p>
                <p><strong>7. Disponibilidade</strong><br />O link de download da música fica disponível por 30 dias após a geração. Após esse período, o arquivo pode ser removido.</p>
                <p><strong>8. Limitação de Responsabilidade</strong><br />O 1Música não se responsabiliza por danos indiretos decorrentes do uso do serviço. O serviço é fornecido "como está".</p>
                <p><strong>9. Alterações</strong><br />Estes termos podem ser alterados a qualquer momento. O uso continuado do serviço após alterações implica aceitação.</p>
                <p className="text-xs text-gray-400">Última atualização: Julho de 2026</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PRIVACY POLICY MODAL ═══ */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#FF5A5F]" />
                  <h3 className="font-bold text-lg text-gray-900">Política de Privacidade</h3>
                </div>
                <button onClick={() => setShowPrivacy(false)} className="text-gray-400 hover:text-gray-600 text-2xl cursor-pointer">×</button>
              </div>
              <div className="p-6 overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-4">
                <p><strong>1. Dados Coletados</strong><br />Coletamos: endereço de e-mail, conteúdo da conversa com a IA (texto/áudio transcrito), e dados de pagamento processados pelo MercadoPago.</p>
                <p><strong>2. Finalidade</strong><br />Os dados são usados exclusivamente para: gerar a música personalizada, enviar o link de download por e-mail, e processar o pagamento.</p>
                <p><strong>3. Armazenamento</strong><br />Os dados são armazenados em servidores seguros (Supabase, São Paulo - Brasil) com criptografia. As músicas geradas ficam armazenadas por até 30 dias.</p>
                <p><strong>4. Compartilhamento</strong><br />Não compartilhamos, vendemos ou cedemos seus dados pessoais a terceiros, exceto quando necessário para: processamento de pagamento (MercadoPago) e envio de e-mail (Resend).</p>
                <p><strong>5. Cookies</strong><br />Não utilizamos cookies de rastreamento. Apenas dados estritamente necessários para o funcionamento do serviço são processados.</p>
                <p><strong>6. Direitos do Usuário (LGPD)</strong><br />Você tem direito a: acessar seus dados, solicitar correção ou exclusão, revogar consentimento. Para exercer estes direitos, entre em contato via contato@qisites.com.br.</p>
                <p><strong>7. Segurança</strong><br />Utilizamos HTTPS, tokens de acesso temporários e URLs assinadas para proteger seus dados e arquivos de áudio.</p>
                <p><strong>8. Contato</strong><br />Para dúvidas sobre privacidade: contato@qisites.com.br</p>
                <p className="text-xs text-gray-400">Última atualização: Julho de 2026</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hidden Audio Player for Landing Page examples */}
      <audio
        ref={exampleAudioRef}
        onEnded={() => setPlayingExampleId(null)}
        style={{ display: "none" }}
      />
    </MobileFrame>
  );
}
