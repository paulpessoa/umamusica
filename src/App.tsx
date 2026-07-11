import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Music, Star, ChevronRight, Mail, Shield, Play, Pause, Heart, Lock, FileText, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import MobileFrame from "./components/MobileFrame";
import ChatSection from "./components/ChatSection";
import CheckoutSection from "./components/CheckoutSection";
import SuccessSection from "./components/SuccessSection";
import { ChatMessage } from "./types";

type ViewState = "landing" | "verify" | "chat" | "checkout" | "success";

// Example songs data for landing page
const exampleSongs = [
  {
    id: 1,
    title: "Bodas de Diamante",
    genre: "Bossa Nova",
    story: "Homenagem aos avós pelos 60 anos de união",
    author: "Marina L.",
    audioUrl: "/assets/examples/bodas_de_diamante.mp3"
  },
  {
    id: 2,
    title: "Amor de Faculdade",
    genre: "Pop Rock",
    story: "Canção para o namorado, celebrando a formatura",
    author: "Ana B.",
    audioUrl: "/assets/examples/amor_de_faculdade.mp3"
  },
  {
    id: 3,
    title: "O Sertanejo do Paizão",
    genre: "Sertanejo",
    story: "Música animada para o pai pelos 60 anos",
    author: "Rodrigo S.",
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

  // Deep-link support
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("orderId");
    if (idFromUrl) {
      setOrderId(idFromUrl);
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
    setOtpSending(true);
    setOtpError("");
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
            className="flex-1 flex flex-col justify-between p-6 overflow-y-auto scrollbar-none bg-white text-gray-800"
          >
            {/* Hero */}
            <div className="space-y-6 pt-4 text-center">
              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 bg-[#FFF0F0] rounded-full blur-xl animate-pulse"></div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                  className="w-24 h-24 bg-gray-50 border-4 border-gray-100 rounded-full flex items-center justify-center shadow-md relative"
                >
                  <div className="absolute inset-2 border border-gray-200/50 rounded-full"></div>
                  <div className="absolute inset-4 border border-gray-200/20 rounded-full"></div>
                  <div className="w-10 h-10 bg-[#FFF0F0] rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-xl">🎵</span>
                  </div>
                </motion.div>
                <div className="absolute -bottom-1 -right-1 bg-[#FF5A5F] text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                  <Star className="w-2.5 h-2.5 fill-white" />
                  <span>Novo</span>
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="font-extrabold text-2xl tracking-tight leading-tight text-gray-900 px-1">
                  Sua história transformada em música por{" "}
                  <span className="text-[#FF5A5F] font-black">R$ 1,00</span>
                </h1>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                  Nossa IA cria rimas perfeitas e grava uma canção exclusiva baseada nas suas memórias reais.
                </p>
              </div>

              {/* Steps */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 text-left space-y-3.5">
                {[
                  { n: 1, text: <><strong>Conte a sua história:</strong> Responda no chat ou envie um áudio.</> },
                  { n: 2, text: <><strong>Pague R$ 1,00 via Pix:</strong> Rápido e seguro via MercadoPago.</> },
                  { n: 3, text: <><strong>Receba no e-mail:</strong> Música pronta para download e compartilhar!</> },
                ].map(({ n, text }) => (
                  <div key={n} className="flex gap-3.5 items-start">
                    <div className="w-5 h-5 rounded-full bg-[#FFF0F0] text-[#FF5A5F] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</div>
                    <p className="text-xs text-gray-600 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>

              {/* Example Songs (lazy loaded — no audio in bundle) */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF5A5F]" />
                  Exemplos de músicas criadas
                </h3>
                <div className="space-y-2">
                  {exampleSongs.map((song) => (
                    <div key={song.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                      <button
                        onClick={() => setPlayingExampleId(playingExampleId === song.id ? null : song.id)}
                        className="w-9 h-9 rounded-full bg-[#FF5A5F] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                      >
                        {playingExampleId === song.id ? (
                          <Pause className="w-3.5 h-3.5 fill-white" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{song.title}</p>
                        <p className="text-[10px] text-gray-400">{song.genre} • {song.story}</p>
                      </div>
                      <div className="text-[10px] text-gray-400 shrink-0 flex items-center gap-0.5">
                        <Heart className="w-3 h-3 text-[#FF5A5F] fill-[#FF5A5F]" />
                        <span>{song.author}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* 
                  TODO: Add actual audio files to /assets/examples/
                  Files needed:
                    - bodas-de-diamante.mp3
                    - amor-de-faculdade.mp3
                    - sertanejo-do-paizao.mp3
                  They will be lazy-loaded only when user clicks Play.
                */}
              </div>
            </div>

            {/* Email Form */}
            <div className="space-y-4 pt-4">
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu melhor e-mail..."
                    required
                    className="w-full bg-gray-50 hover:bg-gray-50/80 border border-gray-200/70 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={otpSending}
                  className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] disabled:opacity-70 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-[#FF5A5F]/15 flex items-center justify-center gap-2 text-sm tracking-wide transition-all cursor-pointer"
                >
                  {otpSending ? "Enviando..." : "Criar Música Agora 🎵"}
                  {!otpSending && <ChevronRight className="w-4 h-4" />}
                </button>
                {otpError && <p className="text-xs text-red-500 text-center">{otpError}</p>}
              </form>

              {/* Stats + Legal */}
              <div className="text-center space-y-2 pb-1">
                <div className="flex items-center justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                  ))}
                  <span className="text-[10px] font-bold text-gray-500 ml-1">4.9/5 estrelas</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-[10px] text-gray-400">
                  <button onClick={() => setShowTerms(true)} className="underline hover:text-gray-600 transition-colors cursor-pointer">
                    Termos de Uso
                  </button>
                  <span>•</span>
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
                <p><strong>8. Contato</strong><br />Para dúvidas sobre privacidade: paulmspessoa@gmail.com</p>
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
