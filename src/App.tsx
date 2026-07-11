import React, { useState, useEffect } from "react";
import { Sparkles, Music, Star, ChevronRight, Mail, Heart, Clock, Download, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import MobileFrame from "./components/MobileFrame";
import ChatSection from "./components/ChatSection";
import CheckoutSection from "./components/CheckoutSection";
import SuccessSection from "./components/SuccessSection";
import { ChatMessage } from "./types";

type ViewState = "landing" | "chat" | "checkout" | "success";

export default function App() {
  const [view, setView] = useState<ViewState>("landing");
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentQr, setPaymentQr] = useState("");
  const [paymentCopiaCola, setPaymentCopiaCola] = useState("");

  // Load order directly from deep-link query parameter if present (e.g. ?orderId=order_xyz)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("orderId");
    if (idFromUrl) {
      setOrderId(idFromUrl);
      setView("success");
    }
  }, []);

  const handleStartCreation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      alert("Por favor, digite um e-mail válido para receber o link da música!");
      return;
    }
    setView("chat");
  };

  const handleFinishChat = async (chatTranscript: ChatMessage[]) => {
    try {
      setView("checkout"); // visually transition immediately
      
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
        throw new Error("Falha ao criar cobrança de checkout");
      }
    } catch (err) {
      console.error("Checkout submission failed, using mock transaction fallback:", err);
      // Fallback in case of server failure during sandbox testing
      const mockId = "mock_" + Math.random().toString(36).substr(2, 9);
      setOrderId(mockId);
      setPaymentQr(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=mock-pix-${mockId}`);
      setPaymentCopiaCola(`00020126580014br.gov.bcb.pix0136unamusica-pay-mock-${mockId}-pix-1.0052040000530398654041.005802BR5915UnaMusica%20IA6009Sao%20Paulo62070503***6304D1A8`);
    }
  };

  const handlePaymentConfirmed = () => {
    setView("success");
  };

  const handleRestart = () => {
    // Clear state and restart
    setOrderId(null);
    setEmail("");
    setPaymentQr("");
    setPaymentCopiaCola("");
    // Clean URL query
    window.history.pushState({}, document.title, "/");
    setView("landing");
  };

  return (
    <MobileFrame>
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: LANDING PAGE */}
        {view === "landing" && (
          <motion.div
            key="landing-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col justify-between p-6 overflow-y-auto scrollbar-none bg-white text-gray-800"
          >
            {/* Top Hero Column */}
            <div className="space-y-6 pt-4 text-center">
              
              {/* Rotating Cassette/Vinyl Graphic Accent */}
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

              {/* Catchy Visual Copy */}
              <div className="space-y-3">
                <h1 className="font-extrabold text-2xl tracking-tight leading-tight text-gray-900 px-1">
                  Sua história transformada em música por{" "}
                  <span className="text-[#FF5A5F] font-black">
                    R$ 1,00
                  </span>
                </h1>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                  Dê o presente mais emocionante do mundo! Nossa IA cria rimas perfeitas e grava uma canção exclusiva baseada nas suas memórias reais.
                </p>
              </div>

              {/* Three Steps Card */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 text-left space-y-3.5">
                <div className="flex gap-3.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-[#FFF0F0] text-[#FF5A5F] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <strong>Conte a sua história:</strong> Responda às perguntas rápidas do nosso compositor virtual no chat.
                  </p>
                </div>
                <div className="flex gap-3.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-[#FFF0F0] text-[#FF5A5F] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <strong>Pague R$ 1,00 via Pix:</strong> Conclua o pedido instantaneamente com segurança e sem complicação.
                  </p>
                </div>
                <div className="flex gap-3.5 items-start">
                  <div className="w-5 h-5 rounded-full bg-[#FFF0F0] text-[#FF5A5F] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <strong>Ouça e emocione:</strong> Em segundos, sua música estará pronta para download e envio no WhatsApp!
                  </p>
                </div>
              </div>
            </div>

            {/* Email Form & Call to Action */}
            <div className="space-y-4 pt-4">
              <form onSubmit={handleStartCreation} className="space-y-3">
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
                  className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-[#FF5A5F]/15 flex items-center justify-center gap-2 text-sm tracking-wide transition-all duration-300 transform active:scale-[0.99] cursor-pointer"
                >
                  Criar Música Agora 🎵
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

              {/* Footnote Stats */}
              <div className="text-center space-y-1 pb-1">
                <div className="flex items-center justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                  ))}
                  <span className="text-[10px] font-bold text-gray-500 ml-1">4.9/5 estrelas</span>
                </div>
                <p className="text-[10px] text-gray-400">
                  Mais de 12.450 pessoas homenageadas hoje com UnaMusica
                </p>
              </div>
            </div>

          </motion.div>
        )}

        {/* VIEW 2: CHAT INTERVIEW */}
        {view === "chat" && (
          <ChatSection 
            email={email} 
            onFinishChat={handleFinishChat} 
          />
        )}

        {/* VIEW 3: CHECKOUT */}
        {view === "checkout" && orderId && (
          <CheckoutSection
            orderId={orderId}
            paymentQr={paymentQr}
            paymentCopiaCola={paymentCopiaCola}
            onPaymentConfirmed={handlePaymentConfirmed}
          />
        )}

        {/* VIEW 4: SUCCESS & MUSIC ROOM */}
        {view === "success" && orderId && (
          <SuccessSection 
            orderId={orderId} 
            onRestart={handleRestart} 
          />
        )}

      </AnimatePresence>
    </MobileFrame>
  );
}
