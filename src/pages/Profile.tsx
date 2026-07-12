import React, { useEffect, useState } from "react";
import { ArrowLeft, Copy, Check, Gift, Music } from "lucide-react";
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

    fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/me?email=${encodeURIComponent(user.email)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
        if (data.referredUsers) setReferredUsers(data.referredUsers);
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

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Tem certeza que deseja solicitar a exclusão de sua conta?\n\nSua conta entrará em uma lixeira virtual por 30 dias. Se você não fizer login novamente nesse período, a conta e todos os seus dados e músicas criadas serão excluídos permanentemente."
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/me/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            <div className="bg-gradient-to-br from-[#FFF0F0] to-white border border-[#FF5A5F]/20 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Seu Saldo de Indicações</p>
                  <p className="text-3xl font-black text-[#FF5A5F]">{user.free_songs_balance || 0} <span className="text-base font-bold text-gray-500">músicas</span></p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Indique o 1Música. Quando o seu amigo se cadastrar e confirmar o e-mail, <strong>você e ele ganham 1 música grátis!</strong> (Limite de 5 amigos por mês).
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

              {/* Contatos Indicados */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amigos Cadastrados ({referredUsers.length}/5 este mês)</h3>
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
              <div className="space-y-6">
                {/* Aguardando Pagamento */}
                {pendingOrders.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Aguardando Pagamento</h3>
                    <div className="space-y-3">
                      {pendingOrders.map((order) => (
                        <div key={order.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex flex-col gap-3 hover:border-amber-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-amber-900 text-sm mb-0.5">Pagamento Pendente</p>
                              <p className="text-[10px] text-amber-700/70">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/checkout/${order.id}`)}
                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            Retomar Pagamento
                            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Finalizadas / Em Andamento */}
                {completedOrders.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Histórico</h3>
                    <div className="space-y-3">
                      {completedOrders.map((order) => (
                        <div key={order.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:border-[#FF5A5F]/30 transition-colors cursor-pointer" onClick={() => navigate(`/musica/${order.id}`)}>
                          <div>
                            <p className="font-bold text-gray-900 text-sm mb-1">{order.status === "completed" ? "Música Finalizada" : "Em andamento"}</p>
                            <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
            <button
              onClick={handleDeleteAccount}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              Excluir minha conta
            </button>
          </section>
        </div>
      </div>
    </MobileFrame>
  );
}
