import React, { useEffect, useState } from "react";
import { ArrowLeft, Copy, Check, Gift, Music } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import MobileFrame from "../components/MobileFrame";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/me?email=${encodeURIComponent(user.email)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
      })
      .catch((err) => console.error("Erro ao carregar perfil:", err));
  }, [user, navigate]);

  if (!user) return null;

  const refLink = `${window.location.origin}/login?ref=${user.referral_code}`;

  const copyRefLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2">Meu Perfil</h1>
        </div>

        <div className="p-6 space-y-8">
          {/* Info Pessoal */}
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Informações Pessoais</h2>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">E-mail</p>
              <p className="font-bold text-gray-900">{user.email}</p>
            </div>
          </section>

          {/* Programa de Indicação */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-[#FF5A5F]" />
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Programa de Indicação</h2>
            </div>
            <div className="bg-gradient-to-br from-[#FFF0F0] to-white border border-[#FF5A5F]/20 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Seu Saldo</p>
                  <p className="text-3xl font-black text-[#FF5A5F]">{user.free_songs_balance || 0} <span className="text-base font-bold text-gray-500">músicas</span></p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Indique o 1Música. Quando o seu amigo criar a primeira música, <strong>você e ele ganham 1 música grátis!</strong> (Limite: 5 por mês).
              </p>
              
              <div className="bg-white rounded-xl p-3 border border-gray-200 flex items-center justify-between gap-3">
                <div className="truncate flex-1">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Seu link de indicação</p>
                  <p className="text-xs font-mono text-gray-800 truncate">{refLink}</p>
                </div>
                <button
                  onClick={copyRefLink}
                  className="w-10 h-10 shrink-0 bg-gray-50 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-gray-600" />}
                </button>
              </div>
            </div>
          </section>

          {/* Histórico de Músicas */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-5 h-5 text-gray-600" />
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Minhas Músicas</h2>
            </div>
            
            {orders.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
                <p className="text-sm text-gray-500">Você ainda não criou nenhuma música.</p>
                <button
                  onClick={() => navigate("/chat")}
                  className="mt-4 px-6 py-2.5 bg-[#FF5A5F] text-white font-bold rounded-full text-sm hover:bg-[#e0484d] transition-colors"
                >
                  Criar Agora
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:border-[#FF5A5F]/30 transition-colors cursor-pointer" onClick={() => navigate(`/musica/${order.id}`)}>
                    <div>
                      <p className="font-bold text-gray-900 text-sm mb-1">{order.status === "completed" ? "Música Finalizada" : "Em andamento"}</p>
                      <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="pt-6 border-t border-gray-100 flex flex-col gap-4 items-center">
            <button
              onClick={logout}
              className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
              Sair da Conta
            </button>
          </section>
        </div>
      </div>
    </MobileFrame>
  );
}
