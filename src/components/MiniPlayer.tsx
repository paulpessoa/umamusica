import React from "react"
import { Play, Pause, X, Music, Rewind, FastForward } from "lucide-react"
import { usePlayer } from "../contexts/PlayerContext"

// Persistent mini-player pinned to the bottom of the screen so the user can
// keep listening while browsing "Minhas Músicas" or "Perfil".
export default function MiniPlayer() {
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, dismiss, skip, seek } =
    usePlayer()

  if (!currentTrack) return null

  const pct = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-gray-900 text-white shadow-2xl lg:max-w-[480px] lg:mx-auto">
      <div className="relative h-1.5 bg-gray-700">
        <div
          className="absolute inset-y-0 left-0 bg-[#FF5A5F] pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          disabled={!duration}
          aria-label="Buscar na música"
          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer accent-[#FF5A5F] disabled:opacity-50"
        />
      </div>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
          <Music className="w-4 h-4 text-[#FF5A5F]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">{currentTrack.title}</p>
          <p className="text-[10px] text-gray-400 truncate">
            Por: {currentTrack.artistName}
          </p>
        </div>
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-[#FF5A5F] hover:bg-[#e04f53] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          title={isPlaying ? "Pausar" : "Tocar"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-white" />
          ) : (
            <Play className="w-5 h-5 fill-white ml-0.5" />
          )}
        </button>

        <button
          onClick={() => skip(-10)}
          disabled={!duration}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white shrink-0 cursor-pointer disabled:opacity-40"
          title="Voltar 10s"
        >
          <Rewind className="w-4 h-4" />
        </button>

        <button
          onClick={() => skip(10)}
          disabled={!duration}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white shrink-0 cursor-pointer disabled:opacity-40"
          title="Avançar 10s"
        >
          <FastForward className="w-4 h-4" />
        </button>

        <button
          onClick={dismiss}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white shrink-0 cursor-pointer"
          title="Fechar player"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
