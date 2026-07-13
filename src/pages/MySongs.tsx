import React, { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Music, AlertCircle, Play, Pause } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { usePlayer } from "../contexts/PlayerContext"
import MobileFrame from "../components/MobileFrame"

export default function MySongs() {
  const { user } = useAuth()
  const player = usePlayer()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate("/login")
      return
    }

    if (!user.session_token) return

    fetch(
      `${import.meta.env.VITE_API_URL || ""}/api/users/me?email=${encodeURIComponent(user.email)}`,
      {
        headers: {
          Authorization: `Bearer ${user.session_token}`
        }
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders)
      })
      .catch((err) => console.error("Erro ao carregar músicas:", err))
      .finally(() => setLoading(false))
  }, [user, navigate])

  if (!user) return null

  const playOrder = (order: any) => {
    const isCurrent =
      player.currentTrack?.orderId === order.id && player.isPlaying
    if (isCurrent) {
      player.togglePlay()
      return
    }
    player.playTrack({
      orderId: order.id,
      title: order.song_metadata?.title || "Música Personalizada",
      artistName: order.song_metadata?.artistName || "1Música",
      src: `${import.meta.env.VITE_API_URL || ""}/api/orders/${order.id}/download`,
      metadata: order.song_metadata
    })
  }

  const completedOrders = orders.filter((o) => o.status !== "pending_payment")
  const pendingOrders = orders.filter((o) => o.status === "pending_payment")

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center">
            <button
              onClick={() => navigate("/perfil")}
              className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 ml-2">
              Minhas Músicas
            </h1>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col justify-between">
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-8 text-sm text-gray-400">
                Carregando músicas...
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100 flex flex-col items-center justify-center space-y-4 my-auto">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-[#FF5A5F]">
                  <Music className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">
                    Nenhuma música criada
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Sua história pode virar uma canção em minutos!
                  </p>
                </div>
                <button
                  onClick={() => navigate("/chat")}
                  className="w-full py-3 bg-[#FF5A5F] text-white font-bold rounded-xl text-xs hover:bg-[#e0484d] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Começar a Criar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Aguardando Pagamento */}
                {pendingOrders.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-bold text-amber-600 tracking-wider">
                      Aguardando Pagamento
                    </h2>
                    <div className="space-y-3">
                      {pendingOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 flex flex-col gap-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-amber-900 text-sm">
                                Pedido Pendente
                              </p>
                              <p className="text-[10px] text-amber-700/60 mt-0.5">
                                {new Date(
                                  order.created_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          </div>
                          <button
                            onClick={() =>
                              navigate(`/checkout/${order.id}`, {
                                state: { from: "my-songs" }
                              })
                            }
                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          >
                            Retomar Pagamento
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Finalizadas / Em Andamento */}
                {completedOrders.length > 0 && (
                  <div className="space-y-3">
                    <div className="space-y-3">
                      {completedOrders.map((order) => (
                        <div
                          key={order.id}
                          onClick={() =>
                            navigate(`/musica/${order.id}`, {
                              state: { from: "my-songs" }
                            })
                          }
                          className="bg-white border border-gray-200 rounded-2xl p-4.5 flex items-center justify-between hover:border-[#FF5A5F]/30 transition-all hover:shadow-sm cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center text-[#FF5A5F]">
                              <Music className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">
                                {order.song_metadata?.title ||
                                  "Música Personalizada"}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {order.status === "completed"
                                  ? "Música Pronta"
                                  : order.status === "failed_safety"
                                    ? "Ajustar Letra ⚠️"
                                    : "Processando..."}{" "}
                                ·{" "}
                                {new Date(
                                  order.created_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {order.status === "completed" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  playOrder(order)
                                }}
                                className="w-9 h-9 rounded-full bg-[#FF5A5F]/10 text-[#FF5A5F] hover:bg-[#FF5A5F] hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                title="Tocar"
                              >
                                {player.currentTrack?.orderId === order.id &&
                                player.isPlaying ? (
                                  <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                )}
                              </button>
                            )}
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileFrame>
  )
}
