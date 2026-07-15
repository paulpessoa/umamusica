import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Download, Music, Disc, Volume2, Trash2, Share2 } from "lucide-react";
import { motion } from "motion/react";
import { SongMetadata } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { usePlayer, PlayerTrack } from "../contexts/PlayerContext";
import { apiFetch } from "../lib/api";
import DeleteMusicModal from "./DeleteMusicModal";

interface AudioPlayerProps {
  orderId: string;
  metadata: SongMetadata;
  hasAudio: boolean;
  onDeleted?: () => void;
}

export default function AudioPlayer({
  orderId,
  metadata,
  hasAudio,
  onDeleted,
}: AudioPlayerProps) {
  const { user } = useAuth();
  const player = usePlayer();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const downloadUrl = `${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}/download`;

  const handleDownload = async () => {
    try {
      const res = await apiFetch(downloadUrl)
      if (!res.ok) {
        alert("Não foi possível baixar a música.")
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${metadata.title || "musica"}.mp3`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      alert("Erro ao baixar a música.")
    }
  }

  const track: PlayerTrack = {
    orderId,
    title: metadata.title,
    artistName: metadata.artistName,
    src: downloadUrl,
    metadata,
  };

  // Register this track in the global player (without interrupting a song
  // that is already playing elsewhere) so the mini-player can display it.
  useEffect(() => {
    if (hasAudio && !player.currentTrack) {
      player.setTrack(track);
    }
     
  }, [orderId, hasAudio]);

  const shareUrl = `${window.location.origin}/musica/${orderId}`;
  const referralParam = user?.referral_code
    ? `?ref=${encodeURIComponent(user.referral_code)}`
    : "";
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Escuta esta música que criei no 1Música! 🎵\n\n ${shareUrl}${referralParam}`
  )}`;

  const handleDeleteMusic = async (reasonCategory: string, reasonDetails: string) => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}`,
        {
          method: "DELETE",
          body: JSON.stringify({ reasonCategory, reasonDetails })
        }
      );

      if (!res.ok) {
        throw new Error("Erro ao deletar música");
      }

      if (onDeleted) onDeleted();
    } catch (error: any) {
      throw new Error(error.message || "Erro ao deletar música");
    } finally {
      setIsDeleting(false);
    }
  };

  const togglePlay = () => {
    if (!hasAudio) return;
    if (!player.currentTrack || player.currentTrack.orderId !== orderId) {
      player.playTrack(track);
      return;
    }
    player.togglePlay();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    player.seek(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    player.setVolume(parseFloat(e.target.value));
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Canvas waveform visualizer (driven by global isPlaying state)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 320;
    canvas.height = 70;

    const barsCount = 32;
    const barsArray: number[] = Array(barsCount).fill(5);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < barsCount; i++) {
        if (player.isPlaying) {
          const target = Math.random() * 45 + 5 + Math.sin(Date.now() * 0.01 + i) * 15;
          barsArray[i] = barsArray[i] * 0.7 + target * 0.3;
        } else {
          barsArray[i] = barsArray[i] * 0.9 + 3 * 0.1;
        }
      }

      const barWidth = (canvas.width / barsCount) - 3;
      for (let i = 0; i < barsCount; i++) {
        const barHeight = barsArray[i];
        const x = i * (barWidth + 3);
        const y = canvas.height - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
        gradient.addColorStop(0, "#FF5A5F");
        gradient.addColorStop(0.5, "#FFB8B8");
        gradient.addColorStop(1, "#FF5A5F");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [player.isPlaying]);

  // Lyrics renderer (estático — sem destaque sincronizado de karaoke,
  // já que não há mapeamento real de tempos dos versos).
  const renderLyrics = () => {
    if (!metadata.lyrics) return null;

    const normalizedLyrics = metadata.lyrics.replace(/\\n/g, "\n");
    const lines = normalizedLyrics.split("\n");

    return lines.map((line, index) => {
      const cleanLine = line.trim();
      if (cleanLine.startsWith("[") && cleanLine.endsWith("]")) {
        return (
          <h4 key={index} className="text-[#FF5A5F] font-bold text-xs mt-4 mb-2 tracking-widest font-mono flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#FF5A5F] rounded-full" />
            {cleanLine}
          </h4>
        );
      }

      return (
        <p
          key={index}
          className="text-sm leading-relaxed min-h-[1.5rem] select-all whitespace-pre-wrap text-gray-600"
        >
          {cleanLine || "\u00A0"}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Vinyl Record */}
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <motion.div
            animate={{ rotate: player.isPlaying ? 360 : 0 }}
            transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
            className="absolute inset-0 bg-gray-900 rounded-full border-4 border-gray-800 shadow-lg flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-2 border border-gray-800/35 rounded-full"></div>
            <div className="absolute inset-5 border border-gray-800/25 rounded-full"></div>
            <div className="absolute inset-8 border border-gray-800/30 rounded-full"></div>
            <div className="w-16 h-16 bg-gradient-to-tr from-[#FF5A5F] to-amber-400 rounded-full flex items-center justify-center relative shadow-inner">
              <Disc className={`w-8 h-8 text-white/90 ${player.isPlaying ? "animate-pulse" : ""}`} />
              <div className="w-4 h-4 bg-gray-950 rounded-full absolute"></div>
            </div>
          </motion.div>
        </div>

        <div className="text-center space-y-1">
          <h3 className="font-extrabold text-lg text-gray-950 leading-tight px-4 truncate">{metadata.title}</h3>
          <p className="text-xs text-gray-400 font-medium">
            Por: <span className="text-[#FF5A5F] font-semibold">{metadata.artistName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          {[metadata.style, `Tempo: ${metadata.tempo}`, `Vibe: ${metadata.vibe}`].map((tag) => (
            <span key={tag} className="text-[10px] bg-gray-50 text-gray-500 border border-gray-100 px-2.5 py-1 rounded-full font-mono">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Waveform */}
      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-inner">
        <canvas ref={canvasRef} className="w-full opacity-90" />
      </div>

      {/* Progress */}
      <div className="space-y-1 px-1">
        <input
          type="range"
          min={0}
          max={player.duration || 100}
          value={player.currentTime}
          onChange={handleSeek}
          disabled={!hasAudio}
          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF5A5F] disabled:opacity-50"
        />
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
          <span>{formatTime(player.currentTime)}</span>
          <span>{formatTime(player.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2 w-20 text-gray-400">
          <Volume2 className="w-4 h-4 shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={player.volume}
            onChange={handleVolumeChange}
            disabled={!hasAudio}
            className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-gray-400 disabled:opacity-50"
          />
        </div>

        <button
          onClick={togglePlay}
          disabled={!hasAudio}
          className="w-14 h-14 bg-[#FF5A5F] hover:bg-[#e04f53] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-full flex items-center justify-center shadow-md shadow-[#FF5A5F]/15 transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
        >
          {player.isPlaying ? (
            <Pause className="w-6 h-6 fill-white" />
          ) : (
            <Play className="w-6 h-6 fill-white ml-0.5" />
          )}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* WhatsApp share button (with referral link) */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-emerald-600 rounded-xl flex items-center justify-center transition-colors"
            title="Compartilhar no WhatsApp / Status"
          >
            <Share2 className="w-4 h-4 text-emerald-500" />
          </a>

          {/* Download via API (signed URL) */}
          <button
            onClick={handleDownload}
            className={`w-9 h-9 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-[#FF5A5F] rounded-xl flex items-center justify-center transition-colors ${!hasAudio ? "opacity-40 pointer-events-none" : ""}`}
            title="Baixar Música"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Delete button */}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isDeleting}
            className="w-9 h-9 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 text-gray-500 hover:text-red-500 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
            title="Deletar Música"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lyrics */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3 shadow-sm max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200/50 pb-2.5">
          <span className="text-xs font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-[#FF5A5F]" />
            Letra
          </span>
        </div>
        <div className="text-center space-y-1 font-sans">{renderLyrics()}</div>
      </div>

      {/* Delete Music Modal */}
      <DeleteMusicModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteMusic}
        songTitle={metadata.title}
        isLoading={isDeleting}
      />
    </div>
  );
}
