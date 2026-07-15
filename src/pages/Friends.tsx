import React, { useEffect, useState } from "react"
import { ArrowLeft, Copy, Check, Gift, Music, Users } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import MobileFrame from "../components/MobileFrame"

export default function Friends() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [referredUsers, setReferredUsers] = useState<any[]>([])

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
        if (data.referredUsers) setReferredUsers(data.referredUsers)
      })
      .catch((err) => console.error("Erro ao carregar indicações:", err))
  }, [user, navigate])

  if (!user) return null

  const refLink = `${window.location.origin}/convite/${user.referral_code}`

  const copyRefLink = () => {
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button
            onClick={() => navigate("/menu")}
            className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2">
            Amigos e Indicações
          </h1>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-[#FFF0F0] to-white border border-[#FF5A5F]/20 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF5A5F]/10 rounded-xl flex items-center justify-center text-[#FF5A5F]">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  Ganhe músicas grátis
                </p>
                <p className="text-xs text-gray-500">
                  Você e seu amigo ganham 1 música cada
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Quando o seu amigo se cadastrar e confirmar o e-mail,{" "}
              <strong>você e ele ganham 1 música grátis!</strong> (Limite de 5
              amigos por mês).
            </p>

            <div className="bg-white rounded-xl p-3 border border-gray-200 space-y-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Seu link de convite
              </p>
              <div className="flex items-center justify-between gap-3 bg-gray-50 p-2 rounded-lg">
                <div className="truncate flex-1">
                  <p className="text-xs font-mono text-gray-500 truncate">
                    {refLink}
                  </p>
                </div>
                <button
                  onClick={copyRefLink}
                  className="w-10 h-10 shrink-0 bg-gray-50 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-bold text-gray-500 tracking-wider">
                Amigos Cadastrados ({referredUsers.length})
              </h2>
            </div>

            {referredUsers.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
                <Music className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">
                  Ninguém se cadastrou usando seu link ainda.
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Compartilhe o link acima para começar a ganhar músicas grátis!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {referredUsers.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">
                          {friend.email}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(friend.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileFrame>
  )
}
