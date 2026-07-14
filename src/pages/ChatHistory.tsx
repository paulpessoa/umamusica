import React, { useEffect, useState } from "react";
import { ArrowLeft, Music, MessageSquare, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import MobileFrame from "../components/MobileFrame";

export default function ChatHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!user.session_token) return;

    fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/me?email=${encodeURIComponent(user.email)}`, {
      headers: { "Authorization": `Bearer ${user.session_token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        const withChat = (data.orders || [])
          .filter((o: any) => o.chat_transcript && o.chat_transcript.length > 0)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOrders(withChat);
      })
      .catch((err) => console.error("Erro ao carregar histórico de chats:", err))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button onClick={() => navigate("/perfil")} className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2">Histórico de Chats</h1>
        </div>

        <div className="p-6 flex-1 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-400">Carregando...</div>
          ) : orders.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100 flex flex-col items-center justify-center space-y-3 my-auto">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-[#FF5A5F]">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-900 text-sm">Nenhuma conversa ainda</p>
              <p className="text-xs text-gray-500 mt-1">As entrevistas das suas músicas aparecerão aqui.</p>
            </div>
          ) : (
            orders.map((order) => {
              const title = order.song_metadata?.title || "Música Personalizada";
              return (
                <button
                  key={order.id}
                  onClick={() => navigate("/chat", { state: { initialMessages: order.chat_transcript } })}
                  className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between text-left hover:border-[#FF5A5F]/30 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-[#FF5A5F] shrink-0">
                      <Music className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString()} · {order.chat_transcript.length} mensagens
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </MobileFrame>
  );
}
