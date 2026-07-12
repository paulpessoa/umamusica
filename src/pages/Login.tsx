import React, { useState } from "react";
import { Mail, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
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
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");

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
      if (!res.ok) throw new Error("Erro ao enviar código");
      setStep("code");
    } catch (err: any) {
      setError(err.message || "Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!code || code.length !== 6) {
      setError("Insira o código de 6 dígitos");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, referralCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código inválido");

      if (data.user) {
        login(data.user);
      } else {
        login({ id: "temp", email });
      }
      navigate("/chat");
    } catch (err: any) {
      setError(err.message || "Erro ao verificar código");
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
              <p className="text-gray-500 mb-8 leading-relaxed">
                Enviamos um código de 6 dígitos para <strong className="text-gray-900">{email}</strong>
              </p>

              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF5A5F] focus:border-transparent outline-none transition-all text-center text-2xl tracking-[0.5em] font-medium"
                  />
                  {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                </div>

                <button
                  onClick={verifyOtp}
                  disabled={loading}
                  className="w-full max-w-xs mx-auto py-4 bg-[#FF5A5F] text-white rounded-xl font-medium shadow-[0_4px_14px_rgba(255,90,95,0.3)] hover:shadow-[0_6px_20px_rgba(255,90,95,0.4)] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center"
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
