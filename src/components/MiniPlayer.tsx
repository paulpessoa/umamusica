import React from "react"
import { Play, Pause, X, Music, Rewind, FastForward, ChevronDown } from "lucide-react"
import { usePlayer } from "../contexts/PlayerContext"

export default function MiniPlayer() {
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, dismiss, skip, seek, isFloating, toggleFloating } =
    usePlayer()

  if (!currentTrack) return null

  const pct = duration ? (currentTime / duration) * 100 : 0

  if (isFloating) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-72 bg-gray-900 text-white rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="relative h-1 bg-gray-700">
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
        <div className="flex items-center gap-2 p-2">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
            <Music className="w-3.5 h-3.5 text-[#FF5A5F]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold truncate">{currentTrack.title}</p>
            <p className="text-[10px] text-gray-400 truncate">
              Por: {currentTrack.artistName}
            </p>
          </div>
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-[#FF5A5F] hover:bg-[#e04f53] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            title={isPlaying ? "Pausar" : "Tocar"}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            )}
          </button>
          <button
            onClick={toggleFloating}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white shrink-0 cursor-pointer"
            title="Expandir player"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

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
          onClick={toggleFloating}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white shrink-0 cursor-pointer"
          title="Mini player"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
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
