import React, { useEffect, useState } from "react"
import {
  ArrowLeft,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Music2,
  Coins,
  Filter
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import MobileFrame from "../components/MobileFrame"
import { useAuth } from "../contexts/AuthContext"

interface CostRow {
  id: string
  order_id: string | null
  email: string | null
  stage: string
  provider: string | null
  input_tokens: number | null
  output_tokens: number | null
  api_cost: number | null
  model: string | null
  entry_mode: string | null
  created_at: string
}

interface Summary {
  totalCost: number
  revenue: number
  net: number
  avgCostPerSong: number
  totalInputTokens: number
  totalOutputTokens: number
  musicGenerations: number
  completedOrders: number
  paidOrders: number
  targetCostPerSong: number
  byStage: Record<string, { cost: number; count: number }>
}

export default function AdminCosts() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rows, setRows] = useState<CostRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adminKey, setAdminKey] = useState(
    localStorage.getItem("umamusica_admin_key") || ""
  )
  const [stageFilter, setStageFilter] = useState("")
  const [providerFilter, setProviderFilter] = useState("")
  const [fromFilter, setFromFilter] = useState("")
  const [toFilter, setToFilter] = useState("")

  const load = async () => {
    if (!adminKey && !user) {
      setError(
        "Informe a chave de administração ou faça login com uma conta de admin."
      )
      return
    }
    if (adminKey) localStorage.setItem("umamusica_admin_key", adminKey)
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (stageFilter) params.set("stage", stageFilter)
      if (providerFilter) params.set("provider", providerFilter)
      if (fromFilter) params.set("from", fromFilter)
      if (toFilter) params.set("to", toFilter)

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/admin/cost-logs?${params.toString()}`,
        {
          headers: {
            "x-admin-key": adminKey,
            ...(user?.session_token
              ? { Authorization: `Bearer ${user.session_token}` }
              : {})
          }
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Acesso negado.")
      }
      const data = await res.json()
      setSummary(data.summary)
      setRows(data.rows)
    } catch (e: any) {
      setError(e.message || "Erro ao carregar custos.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (adminKey || user) load()
  }, [])

  const clearFilters = () => {
    setStageFilter("")
    setProviderFilter("")
    setFromFilter("")
    setToFilter("")
  }

  const fmtBRL = (v: number) =>
    `R$ ${Number(v || 0)
      .toFixed(2)
      .replace(".", ",")}`
  const fmtNum = (v: number) => (v || 0).toLocaleString("pt-BR")

  const stageLabels: Record<string, string> = {
    chat: "Chat",
    transcription: "Transcrição",
    compose_lyrics: "Compor Letra",
    music_generation: "Geração Musical",
    revise: "Revisão"
  }

  const hasFilters = stageFilter || providerFilter || fromFilter || toFilter

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2">
            Custos & Receita
          </h1>
          <button
            onClick={load}
            className="ml-auto p-2 rounded-full hover:bg-gray-50 text-gray-500"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {summary && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Receita
                    </span>
                  </div>
                  <p className="text-xl font-black text-emerald-800 mt-1">
                    {fmtBRL(summary.revenue)}
                  </p>
                  <p className="text-[10px] text-emerald-600">
                    {summary.paidOrders} pagas via Mercado Pago (R$ 1,00)
                  </p>
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-rose-700">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Custo
                    </span>
                  </div>
                  <p className="text-xl font-black text-rose-800 mt-1">
                    {fmtBRL(summary.totalCost)}
                  </p>
                  <p className="text-[10px] text-rose-600">
                    {summary.musicGenerations} gerações
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Coins className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Lucro
                    </span>
                  </div>
                  <p
                    className={`text-xl font-black mt-1 ${
                      summary.net >= 0 ? "text-gray-900" : "text-rose-700"
                    }`}
                  >
                    {fmtBRL(summary.net)}
                  </p>
                  <p className="text-[10px] text-gray-500">Receita − Custo</p>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Music2 className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Custo/música
                    </span>
                  </div>
                  <p className="text-xl font-black text-gray-900 mt-1">
                    {fmtBRL(summary.avgCostPerSong)}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Alvo: {fmtBRL(summary.targetCostPerSong)}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 text-center">
                Tokens — entrada: {fmtNum(summary.totalInputTokens)} · saída:{" "}
                {fmtNum(summary.totalOutputTokens)}
              </p>

              {/* Stage breakdown */}
              {summary.byStage && Object.keys(summary.byStage).length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-gray-500 tracking-wider">
                    Custo por etapa
                  </h2>
                  <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                    {Object.entries(summary.byStage)
                      .sort((a, b) => b[1].cost - a[1].cost)
                      .map(([stage, data]) => (
                        <div
                          key={stage}
                          className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-b-0"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800">
                              {stageLabels[stage] || stage}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {data.count} {data.count === 1 ? "chamada" : "chamadas"}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-gray-900">
                            {fmtBRL(data.cost)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-bold text-gray-500 tracking-wider">
                Filtros
              </h2>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-[#FF5A5F] font-bold uppercase tracking-wider"
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Etapa (ex: chat)"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF5A5F]"
              />
              <input
                type="text"
                placeholder="Provedor (ex: groq)"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF5A5F]"
              />
              <input
                type="date"
                placeholder="De"
                value={fromFilter}
                onChange={(e) => setFromFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF5A5F]"
              />
              <input
                type="date"
                placeholder="Até"
                value={toFilter}
                onChange={(e) => setToFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF5A5F]"
              />
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-xs transition-colors"
            >
              {loading ? "Carregando..." : "Aplicar filtros"}
            </button>
          </div>

          {/* Recent rows */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-gray-500 tracking-wider">
              Últimas interações
            </h2>
            {rows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Nenhum registro de custo ainda.
              </p>
            ) : (
              rows.map((r) => (
                <div
                  key={r.id}
                  className="bg-white border border-gray-100 rounded-xl p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 uppercase">
                      {r.stage}
                    </span>
                    <span className="text-gray-400">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                   <div className="flex items-center justify-between mt-1 text-gray-500">
                      <span>{r.provider || "—"}</span>
                      <span className="font-mono">
                        {r.api_cost
                          ? fmtBRL(r.api_cost)
                          : `${fmtNum(r.input_tokens || 0)}/${r.output_tokens || 0} tok`}
                      </span>
                    </div>
                    {r.entry_mode && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Modo: {r.entry_mode}
                      </p>
                    )}
                    {r.email && (
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {r.email}
                      </p>
                    )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </MobileFrame>
  )
}
