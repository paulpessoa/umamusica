import React, { useEffect, useState } from "react";
import { ArrowLeft, Copy, Check, Gift, Music, HelpCircle, ChevronRight, LogOut, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import MobileFrame from "../components/MobileFrame";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [referredUsers, setReferredUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!user.session_token) return;

    fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/me?email=${encodeURIComponent(user.email)}`, {
      headers: {
        "Authorization": `Bearer ${user.session_token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
        if (data.referredUsers) setReferredUsers(data.referredUsers);
      })
      .catch((err) => console.error("Erro ao carregar perfil:", err));
  }, [user, navigate]);

  if (!user) return null;

  const refLink = `${window.location.origin}/convite/${user.referral_code}`;

  const copyRefLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Tem certeza que deseja solicitar a exclusão de sua conta?\n\nSua conta entrará em uma lixeira virtual por 30 dias. Se você não fizer login novamente nesse período, a conta e todos os seus dados e músicas criadas serão excluídos permanentemente."
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/me/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.session_token}`
        },
        body: JSON.stringify({ email: user.email }),
      });
      if (res.ok) {
        alert("Sua exclusão de conta foi agendada. A conta foi desativada e será excluída em 30 dias.");
        logout();
      } else {
        alert("Erro ao solicitar a exclusão de conta.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor.");
    }
  };

  const completedOrders = orders.filter(o => o.status !== "pending_payment");
  const pendingOrders = orders.filter(o => o.status === "pending_payment");

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2">{user.email}</h1>
        </div>

        <div className="p-6 space-y-8">
          {/* Programa de Indicação */}
          <section>
            <div className="bg-gradient-to-br from-[#FFF0F0] to-white border border-[#FF5A5F]/20 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Indicações</p>
                  <p className="text-3xl font-black text-[#FF5A5F]">{user.free_songs_balance || 0} <span className="text-base font-bold text-gray-500">músicas</span></p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Quando o seu amigo se cadastrar e confirmar o e-mail, <strong>você e ele ganham 1 música grátis!</strong> (Limite de 5 amigos por mês).
              </p>

              <div className="bg-white rounded-xl p-3 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between gap-3 bg-gray-50 p-2 rounded-lg">
                  <div className="truncate flex-1">
                    <p className="text-xs font-mono text-gray-500 truncate">{refLink}</p>
                  </div>
                  <button
                    onClick={copyRefLink}
                    className="w-10 h-10 shrink-0 bg-gray-50 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-gray-600" />}
                  </button>
                </div>
              </div>

              {/* Contatos Indicados */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-500 tracking-wider mb-2">Amigos Cadastrados</h3>
                {referredUsers.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Ninguém se cadastrou usando seu link ainda.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                    {referredUsers.map((friend) => (
                      <div key={friend.id} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100">
                        <span className="text-xs font-medium text-gray-700">{friend.email}</span>
                        <span className="text-[10px] text-gray-400">{new Date(friend.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Menu de Opções */}
          <section className="space-y-3 pt-2">
            <button
              onClick={() => navigate("/chat")}
              className="w-full bg-gradient-to-r from-[#FF5A5F] to-[#e0484d] text-white font-bold rounded-2xl p-4.5 flex items-center justify-between transition-all hover:opacity-95 shadow-sm shadow-[#FF5A5F]/20 cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white">
                  <Music className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Criar Nova Música</p>
                  <p className="text-[10px] text-white/80 mt-0.5">Transforme outra história em música</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate("/minhas-musicas")}
              className="w-full bg-white border border-gray-100 hover:border-gray-200 shadow-sm rounded-2xl p-4.5 flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-[#FF5A5F] group-hover:scale-105 transition-transform">
                  <Music className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-900">Minhas Músicas</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Ver histórico e músicas pendentes</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate("/faq")}
              className="w-full bg-white border border-gray-100 hover:border-gray-200 shadow-sm rounded-2xl p-4.5 flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
                  <HelpCircle className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-900">Perguntas Frequentes (FAQ)</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Dúvidas comuns sobre o 1Música</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </section>

          {/* Ações da Conta */}
          <section className="space-y-3 pt-6 border-t border-gray-100">
            <button
              onClick={logout}
              className="w-full py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-2xl border border-gray-200 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5 text-gray-500" />
              Sair da Conta
            </button>

            <button
              onClick={handleDeleteAccount}
              className="w-full py-3.5 bg-rose-50/30 hover:bg-rose-50 text-rose-600 font-bold rounded-2xl border border-rose-100/50 hover:border-rose-100 transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              Excluir minha conta
            </button>
          </section>
        </div>
      </div>
    </MobileFrame>
  );
}
