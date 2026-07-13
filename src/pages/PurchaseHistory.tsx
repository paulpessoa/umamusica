import React, { useEffect, useState } from "react"
import {
  ArrowLeft,
  Check,
  Music,
  Gift,
  CreditCard,
  AlertCircle,
  ChevronRight
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import MobileFrame from "../components/MobileFrame"

function paymentMethodLabel(paymentId: string | undefined): {
  label: string
  icon: "gift" | "card" | "free"
} {
  if (!paymentId) return { label: "Outro", icon: "card" }
  if (paymentId.startsWith("coupon_"))
    return { label: "Cupom de Presente", icon: "gift" }
  if (paymentId.startsWith("bonus_balance_"))
    return { label: "Saldo Grátis", icon: "free" }
  if (paymentId.startsWith("pending_mp_"))
    return { label: "Pix (pendente)", icon: "card" }
  if (paymentId.startsWith("pay_"))
    return { label: "Teste (aprovado)", icon: "card" }
  if (paymentId.startsWith("mock") || paymentId.startsWith("simulated"))
    return { label: "Ambiente de Teste", icon: "card" }
  if (/^\d+$/.test(paymentId))
    return { label: "Pix (Mercado Pago)", icon: "card" }
  return { label: "Outro", icon: "card" }
}

function statusLabel(status: string): { text: string; tone: string } {
  switch (status) {
    case "completed":
      return { text: "Concluída", tone: "text-emerald-600 bg-emerald-50" }
    case "paid":
      return { text: "Paga", tone: "text-emerald-600 bg-emerald-50" }
    case "processing":
      return { text: "Processando", tone: "text-amber-600 bg-amber-50" }
    case "pending_payment":
      return {
        text: "Aguardando Pagamento",
        tone: "text-amber-600 bg-amber-50"
      }
    case "failed_safety":
      return { text: "Ajustar Letra", tone: "text-orange-600 bg-orange-50" }
    case "failed":
      return { text: "Falhou", tone: "text-rose-600 bg-rose-50" }
    default:
      return { text: status, tone: "text-gray-600 bg-gray-50" }
  }
}

export default function PurchaseHistory() {
  const { user } = useAuth()
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
        headers: { Authorization: `Bearer ${user.session_token}` }
      }
    )
      .then((res) => res.json())
      .then((data) => {
        const list = (data.orders || [])
          .filter((o: any) => o.status !== "chatting")
          .sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
        setOrders(list)
      })
      .catch((err) =>
        console.error("Erro ao carregar histórico de compras:", err)
      )
      .finally(() => setLoading(false))
  }, [user, navigate])

  if (!user) return null

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button
            onClick={() => navigate("/perfil")}
            className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2">
            Histórico de Compras
          </h1>
        </div>

        <div className="p-6 flex-1 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-400">
              Carregando...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100 flex flex-col items-center justify-center space-y-3 my-auto">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                <CreditCard className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-900 text-sm">
                Nenhuma compra ainda
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Seus pagamentos (Pix, cupons) aparecerão aqui.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const method = paymentMethodLabel(order.payment_id)
              const status = statusLabel(order.status)
              const title = order.song_metadata?.title || "Música Personalizada"
              return (
                <button
                  key={order.id}
                  onClick={() =>
                    navigate(`/musica/${order.id}`, {
                      state: { from: "my-songs" }
                    })
                  }
                  className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:border-[#FF5A5F]/30 transition-all hover:shadow-sm cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                      {method.icon === "gift" ? (
                        <Gift className="w-4.5 h-4.5" />
                      ) : method.icon === "free" ? (
                        <Music className="w-4.5 h-4.5" />
                      ) : (
                        <CreditCard className="w-4.5 h-4.5" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {method.label} ·{" "}
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.tone}`}
                      >
                        {status.text}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              )
            })
          )}
        </div>
      </div>
    </MobileFrame>
  )
}
