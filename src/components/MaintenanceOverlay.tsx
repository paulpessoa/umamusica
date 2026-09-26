import React, { useEffect, useRef, useState } from "react"
import { Moon } from "lucide-react"

// P2.4: o backend fica pausado (0 réplicas no Railway) entre 02:00 e 08:00
// BRT para economizar custo. Sem isso, o usuário que abre o app nessa
// janela vê erros de rede genéricos em cada tela. Este overlay faz um
// health check periódico e, se o backend não responder por algumas
// tentativas seguidas, substitui a tela quebrada por uma mensagem clara.
const HEALTH_CHECK_INTERVAL_MS = 30_000
const FAILURES_BEFORE_SHOWING = 2
const FETCH_TIMEOUT_MS = 6_000

export default function MaintenanceOverlay() {
  const [visible, setVisible] = useState(false)
  const consecutiveFailures = useRef(0)

  useEffect(() => {
    let cancelled = false

    const checkHealth = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/health`,
          { signal: controller.signal }
        )
        clearTimeout(timeout)
        if (cancelled) return

        if (res.ok) {
          consecutiveFailures.current = 0
          setVisible(false)
        } else {
          consecutiveFailures.current += 1
        }
      } catch {
        if (cancelled) return
        consecutiveFailures.current += 1
      }

      if (!cancelled && consecutiveFailures.current >= FAILURES_BEFORE_SHOWING) {
        setVisible(true)
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white px-6 text-center">
      <div className="max-w-xs">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF0F0]">
          <Moon className="h-7 w-7 text-[#FF5A5F]" />
        </div>
        <h1 className="mb-2 text-lg font-bold text-gray-800">
          Estamos em manutenção noturna
        </h1>
        <p className="text-sm text-gray-500">
          Para economizar recursos, o 1Música fica fora do ar durante a
          madrugada. Voltamos às 8h — tenta de novo depois desse horário.
        </p>
      </div>
    </div>
  )
}
