import React, { useEffect, useState } from "react"
import {
  ArrowLeft,
  Copy,
  Check,
  Gift,
  Music,
  HelpCircle,
  ChevronRight,
  LogOut,
  Trash2,
  User
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import MobileFrame from "../components/MobileFrame"
import DeleteAccountModal from "../components/DeleteAccountModal"

export default function Menu() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [referredUsers, setReferredUsers] = useState<any[]>([])
  const [nameInput, setNameInput] = useState(user?.name || "")
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
        if (data.referredUsers) setReferredUsers(data.referredUsers)
      })
      .catch((err) => console.error("Erro ao carregar perfil:", err))
  }, [user, navigate])

  if (!user) return null

  const refLink = `${window.location.origin}/convite/${user.referral_code}`

  const copyRefLink = () => {
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteAccount = () => {
    setDeleteOpen(true)
  }

  const handleConfirmDelete = async (
    reason: string,
    details: string,
    email: string
  ) => {
    if (!user) return
    setIsDeleting(true)
    try {
      // Registra o motivo reutilizando o endpoint/tabela de feedback
      try {
        await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/feedback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              category: "account_deletion",
              reasonCategory: reason,
              reasonDetails: details
            })
          }
        )
      } catch (e) {
        console.error("Falha ao registrar motivo (não bloqueia):", e)
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/users/me/delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.session_token}`
          },
          body: JSON.stringify({ email })
        }
      )
      if (res.ok) {
        setDeleteOpen(false)
        logout()
      } else {
        throw new Error("Erro ao solicitar a exclusão de conta.")
      }
    } catch (err: any) {
      setIsDeleting(false)
      throw new Error(err.message || "Erro ao conectar com o servidor.")
    }
  }

  // const handleSaveName = async () => {
  //   if (!user) return
  //   setIsSavingName(true)
  //   setNameSaved(false)
  //   try {
  //     const res = await fetch(
  //       `${import.meta.env.VITE_API_URL || ""}/api/users/me/update`,
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${user.session_token}`
  //         },
  //         body: JSON.stringify({ name: nameInput })
  //       }
  //     )
  //     if (res.ok) {
  //       const data = await res.json()
  //       if (data.user) updateUser(data.user)
  //       setNameSaved(true)
  //       setTimeout(() => setNameSaved(false), 2000)
  //     }
  //   } catch (err) {
  //     console.error("Erro ao salvar nome:", err)
  //   } finally {
  //     setIsSavingName(false)
  //   }
  // }

  const completedOrders = orders.filter((o) => o.status !== "pending_payment")
  const pendingOrders = orders.filter((o) => o.status === "pending_payment")

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2">Menu</h1>
        </div>

        <div className="p-6 space-y-8">
          {/* Programa de Indicação */}
          <section>
            <div className="bg-gradient-to-br from-[#FFF0F0] to-white border border-[#FF5A5F]/20 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-black text-[#FF5A5F]">
                    {user.free_songs_balance || 0}{" "}
                    <span className="text-base font-bold text-gray-500">
                      músicas grátis
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Quando o seu amigo se cadastrar e confirmar o e-mail,{" "}
                <strong>você e ele ganham 1 música grátis!</strong> (Limite de 5
                amigos por mês).
              </p>

              <button
                onClick={() => navigate("/amigos")}
                className="w-full bg-white rounded-xl p-3 border border-gray-200 flex items-center justify-between hover:border-[#FF5A5F]/30 transition-colors cursor-pointer"
              >
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-900">
                    {referredUsers.length} amigo(s) · {user.free_songs_balance || 0} músicas grátis
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Ver lista e compartilhar link
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </section>

          {/* Nome opcional (personalização) */}
          {/* <section className="space-y-3 pt-2">
            <div className="bg-white border border-gray-100 hover:border-gray-200 shadow-sm rounded-2xl p-4.5 flex items-center justify-between transition-all group">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 group-hover:scale-105 transition-transform">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-sm text-gray-900">Seu Nome</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Opcional — usado para personalizar sua experiência
                  </p>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Como podemos te chamar?"
                    className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#FF5A5F]"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleSaveName}
              disabled={isSavingName}
              className="w-full bg-[#FF5A5F] hover:bg-[#e0484d] disabled:opacity-50 text-white font-bold rounded-xl py-2.5 text-xs transition-colors cursor-pointer"
            >
              {isSavingName
                ? "Salvando..."
                : nameSaved
                  ? "Nome salvo! ✓"
                  : "Salvar Nome"}
            </button>
          </section> */}

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
                  <p className="text-[10px] text-white/80 mt-0.5">
                    Transforme outra história em música
                  </p>
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
                  <p className="font-bold text-sm text-gray-900">
                    Minhas Músicas
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Ver histórico e músicas pendentes
                  </p>
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
                  <p className="font-bold text-sm text-gray-900">
                    Perguntas Frequentes (FAQ)
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Dúvidas comuns sobre o 1Música
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate("/historico-chats")}
              className="w-full bg-white border border-gray-100 hover:border-gray-200 shadow-sm rounded-2xl p-4.5 flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 group-hover:scale-105 transition-transform">
                  <Music className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-900">
                    Histórico de Chats
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Veja as conversas das suas músicas
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => navigate("/historico-compras")}
              className="w-full bg-white border border-gray-100 hover:border-gray-200 shadow-sm rounded-2xl p-4.5 flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform">
                  <Check className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-900">
                    Histórico de Compras
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Pix, cupons e pagamentos
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </section>

          {/* Usuário conectado (discreto) */}
          <section className="pt-2">
            <div className="flex flex-col items-center text-center">
              <p className="text-[11px] text-gray-400">
                usuário conectado
              </p>
              <p className="text-xs font-medium text-gray-500 truncate max-w-full">
                {user.email}
              </p>
            </div>
          </section>

          {/* Ações da Conta */}
          <section className="space-y-3 pt-6 border-t border-gray-100">
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

      <DeleteAccountModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        userEmail={user.email}
        isLoading={isDeleting}
      />
    </MobileFrame>
  )
}
