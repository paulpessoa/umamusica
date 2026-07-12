import React, { useState, useEffect } from "react";
import { Check, Copy, HelpCircle, Shield, AlertCircle, Sparkles, RefreshCw, Smartphone } from "lucide-react";
import { motion } from "motion/react";

interface CheckoutSectionProps {
  orderId: string;
  paymentQr: string;
  paymentCopiaCola: string;
  onPaymentConfirmed: () => void;
}

export default function CheckoutSection({
  orderId,
  paymentQr,
  paymentCopiaCola,
  onPaymentConfirmed,
}: CheckoutSectionProps) {
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 minutes
  const [isSimulating, setIsSimulating] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Poll order status every 3 seconds
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}`);
        if (res.ok) {
          const order = await res.json();
          if (order.status === "paid" || order.status === "completed" || order.status === "processing") {
            clearInterval(intervalId);
            onPaymentConfirmed();
          }
        }
      } catch (e) {
        console.error("Error polling order status:", e);
      }
    };

    // Run poll on load and then every 3 seconds
    pollStatus();
    intervalId = setInterval(pollStatus, 3000);

    return () => clearInterval(intervalId);
  }, [orderId, onPaymentConfirmed]);

  // Expiration countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentCopiaCola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}/apply-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupon: couponCode.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCouponSuccess(data.message || "Cupom aplicado com sucesso!");
        setTimeout(() => {
          onPaymentConfirmed();
        }, 1200);
      } else {
        const errData = await res.json();
        setCouponError(errData.error || "Cupom inválido");
      }
    } catch (e) {
      setCouponError("Erro ao processar cupom");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Trigger simulated paid state on the server
  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    setPollingError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}/simulate-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        // The polling loop will pick up 'paid' state and trigger onPaymentConfirmed()
        console.log("Simulated payment success!");
      } else {
        setPollingError("Falha ao simular pagamento");
      }
    } catch (e) {
      setPollingError("Erro de conexão na simulação");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div id="checkout-container" className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-between space-y-6 bg-white">

      {/* Upper Status Header */}
      <div className="text-center space-y-2">
        <span className="text-[10px] bg-[#FFF0F0] text-[#FF5A5F] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border border-[#FF5A5F]/10">
          Aguardando Pagamento
        </span>

        <p className="text-xs pt-4 text-gray-500 max-w-xs mx-auto leading-relaxed">
          Escaneie o QR Code ou copie a chave Pix abaixo. Sua canção será gerada imediatamente após a confirmação.
        </p>
      </div>

      {/* Main QR Code Card */}
      <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4 shadow-sm">

        {/* QR Code container */}
        <div className="relative w-44 h-44 bg-white rounded-2xl p-2.5 flex items-center justify-center shadow-sm border border-gray-100">
          {paymentQr ? (
            <img
              src={paymentQr.startsWith("data:") ? paymentQr : `data:image/png;base64,${paymentQr}`}
              alt="Pix QR Code"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-gray-300 flex flex-col items-center justify-center text-[10px]">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mb-1" />
              <span>Gerando QR Code...</span>
            </div>
          )}
        </div>

        {/* Expiration warning */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>O Pix expira em: </span>
          <span className="font-bold text-amber-600 font-mono">
            {formatCountdown(secondsLeft)}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="bg-[#FF5A5F] hover:bg-[#e04f53] text-white px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-1.5 shrink-0 text-sm font-semibold shadow-sm cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-200" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copiar Pix</span>
            </>
          )}
        </button>
      </div>

      {/* Coupon input form */}
      <div className="bg-gray-50 border border-gray-100 p-4.5 rounded-2xl space-y-2 shadow-sm">
        <label className="text-xs font-bold text-gray-700 tracking-wider block">
          Possui um Cupom de Presente?
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value);
              setCouponError(null);
              setCouponSuccess(null);
            }}
            placeholder="Ex: PRESENTE"
            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 uppercase font-mono placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#FF5A5F]"
          />
          <button
            onClick={handleApplyCoupon}
            disabled={isApplyingCoupon || !couponCode.trim()}
            className="bg-[#FF5A5F] hover:bg-[#e04f53] text-white px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-1.5 shrink-0 text-sm font-semibold shadow-sm cursor-pointer"
          >
            {isApplyingCoupon ? "Aplicando..." : "Aplicar"}
          </button>
        </div>
        {couponError && (
          <p className="text-[10px] text-rose-500 font-mono mt-1">
            {couponError}
          </p>
        )}
        {couponSuccess && (
          <p className="text-[10px] text-emerald-600 font-mono mt-1 font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            {couponSuccess}
          </p>
        )}
      </div>

      {/* TESTING PANEL (EXHIBITED ONLY ON LOCALHOST) */}
      {(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && (
        <div className="bg-[#FFFDF9] border border-amber-100 p-4.5 rounded-2xl space-y-3 shadow-sm">

          <p className="text-[11px] text-gray-600 leading-relaxed">
            Para testar e simular o recebimento do Pix sem precisar fazer um pagamento real de R$ 1,00.
          </p>
          <button
            onClick={handleSimulatePayment}
            disabled={isSimulating}
            className="w-full bg-white hover:bg-amber-50/50 text-amber-800 font-bold py-2.5 px-3 rounded-xl border border-amber-200 hover:border-[#FF5A5F]/50 transition-all duration-200 flex items-center justify-center gap-2 text-xs shadow-sm cursor-pointer"
          >
            Simular Pagamento Pix (Aprovar)
          </button>
          {pollingError && (
            <p className="text-[10px] text-rose-500 text-center font-mono">
              {pollingError}
            </p>
          )}
        </div>
      )}


    </div>
  );
}
