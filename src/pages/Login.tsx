import React, { useState, useEffect } from "react";
import { Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import MobileFrame from "../components/MobileFrame";

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes (600 seconds)
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const magicEmail = searchParams.get("email");
  const magicToken = searchParams.get("token");

  // Auto-login via magic link (same 10-min validity as the OTP code)
  useEffect(() => {
    if (magicEmail && magicToken && !loading) {
      setEmail(magicEmail);
      setCode(magicToken);
      verifyOtp(magicToken, magicEmail);
    }
     
  }, []);

  // Countdown timer for OTP validity
  useEffect(() => {
    if (step !== "code" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sendOtp = async () => {
    if (!email || !email.includes("@")) {
      setError("Insira um e-mail válido");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar código");
      }

      setTimeLeft(600); // Reset timer to 10 min
      setStep("code");
    } catch (err: any) {
      setError(err.message || "Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (codeToVerify?: string, emailOverride?: string) => {
    const activeCode = codeToVerify !== undefined ? codeToVerify : code;
    const activeEmail = emailOverride ?? email;
    if (!activeCode || activeCode.length !== 6) {
      setError("Insira o código de 6 dígitos");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activeEmail, code: activeCode, referralCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código inválido");

      if (data.user) {
        login(data.user);
        navigate("/menu");
      } else {
        throw new Error("Erro ao criar usuário. Tente novamente.");
      }
    } catch (err: any) {
      setError(err.message || "Código incorreto. Verifique e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#FFF0F0] to-white/0 pointer-events-none" />

        <div className="px-6 pt-12 pb-6 relative z-10 flex flex-col h-full">
          {step === "email" ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1">
              <div className="w-12 h-12 bg-[#FFF0F0] rounded-2xl flex items-center justify-center mb-6">
                <Mail className="w-6 h-6 text-[#FF5A5F]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Qual seu e-mail?</h1>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Usamos e-mail sem senha para facilitar. Vamos te enviar um código de acesso.
              </p>

              <div className="space-y-4">
                 <div>
                   <input
                     type="email"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === "Enter") {
                         sendOtp()
                       }
                     }}
                     placeholder="exemplo@email.com"
                     className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF5A5F] focus:border-transparent outline-none transition-all"
                   />
                   {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                 </div>

                <button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full max-w-xs mx-auto py-4 bg-[#FF5A5F] text-white rounded-xl font-medium shadow-[0_4px_14px_rgba(255,90,95,0.3)] hover:shadow-[0_6px_20px_rgba(255,90,95,0.4)] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? "Enviando..." : "Receber Código"}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1">
              <button
                onClick={() => setStep("email")}
                className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-6 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">Insira o código</h1>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Enviamos um código de 6 dígitos para <strong className="text-gray-900">{email}</strong>
              </p>

              {/* Countdown Timer */}
              <div className="flex items-center justify-between text-xs text-gray-400 mb-6 px-1">
                <span>O código expira em:</span>
                <span className={`font-mono font-bold ${timeLeft < 60 ? "text-red-500 animate-pulse" : "text-[#FF5A5F]"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setCode(val);
                      if (val.length === 6) {
                        verifyOtp(val);
                      }
                    }}
                    placeholder="000000"
                    disabled={loading || timeLeft <= 0}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF5A5F] focus:border-transparent outline-none transition-all text-center text-2xl tracking-[0.5em] font-medium disabled:opacity-50"
                  />
                  
                  {timeLeft <= 0 && (
                    <div className="text-center">
                      <p className="text-red-500 text-xs mb-2">Este código de verificação expirou.</p>
                      <button
                        onClick={sendOtp}
                        className="text-xs text-[#FF5A5F] font-bold hover:underline"
                      >
                        Reenviar novo código
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-100/50 rounded-xl p-3.5 text-center text-xs text-red-600 font-semibold shadow-sm">
                      {error}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => verifyOtp()}
                  disabled={loading || code.length !== 6 || timeLeft <= 0}
                  className="w-full max-w-xs mx-auto py-4 bg-[#FF5A5F] text-white rounded-xl font-medium shadow-[0_4px_14px_rgba(255,90,95,0.3)] hover:shadow-[0_6px_20px_rgba(255,90,95,0.4)] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center disabled:shadow-none"
                >
                  {loading ? "Verificando..." : "Entrar"}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </MobileFrame>
  );
}
