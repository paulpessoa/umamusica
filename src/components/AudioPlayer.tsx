import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Download, Music, Disc, Volume2, RefreshCw, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { SongMetadata } from "../types";
import { useAuth } from "../contexts/AuthContext";
import DeleteMusicModal from "./DeleteMusicModal";

interface AudioPlayerProps {
  orderId: string;
  metadata: SongMetadata;
  hasAudio: boolean;
  isPlaying?: boolean;
  setIsPlaying?: (playing: boolean) => void;
  currentTime?: number;
  setCurrentTime?: (time: number) => void;
  duration?: number;
  setDuration?: (dur: number) => void;
  onDeleted?: () => void;
}

export default function AudioPlayer({
  orderId,
  metadata,
  hasAudio,
  isPlaying: propIsPlaying,
  setIsPlaying: propSetIsPlaying,
  currentTime: propCurrentTime,
  setCurrentTime: propSetCurrentTime,
  duration: propDuration,
  setDuration: propSetDuration,
  onDeleted,
}: AudioPlayerProps) {
  const { user } = useAuth();
  const [localIsPlaying, localSetIsPlaying] = useState(false);
  const [localCurrentTime, localSetCurrentTime] = useState(0);
  const [localDuration, localSetDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPlaying = propIsPlaying !== undefined ? propIsPlaying : localIsPlaying;
  const setIsPlaying = propSetIsPlaying !== undefined ? propSetIsPlaying : localSetIsPlaying;
  const currentTime = propCurrentTime !== undefined ? propCurrentTime : localCurrentTime;
  const setCurrentTime = propSetCurrentTime !== undefined ? propSetCurrentTime : localSetCurrentTime;
  const duration = propDuration !== undefined ? propDuration : localDuration;
  const setDuration = propSetDuration !== undefined ? propSetDuration : localSetDuration;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const shareUrl = `${window.location.origin}/musica/${orderId}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Escuta esta música criada no 1Música! \n\n ${shareUrl}`
  )}`;

  const handleDeleteMusic = async (reasonCategory: string, reasonDetails: string) => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${user.session_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reasonCategory, reasonDetails })
      });

      if (!res.ok) {
        throw new Error("Erro ao deletar música");
      }

      // Callback to notify parent component
      if (onDeleted) {
        onDeleted();
      }
    } catch (error: any) {
      throw new Error(error.message || "Erro ao deletar música");
    } finally {
      setIsDeleting(false);
    }
  };

  // Lazy load audio only when user clicks play — reduces initial bundle
  const loadAndPlay = async () => {
    if (!hasAudio) return;

    if (!audioSrc) {
      setIsAudioLoading(true);
      // Fetch signed URL via our API (never exposes Supabase)
      const downloadUrl = `${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}/download`;
      setAudioSrc(downloadUrl);
    }

    // Wait for next tick so src is set
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.volume = volume;
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((e) => {
            console.log("Playback error:", e);
            setIsAudioLoading(false);
          });
      }
    }, 150);
  };

  const togglePlay = () => {
    if (isAudioLoading) return; // Block input while fetching audio file

    if (!audioRef.current || !audioSrc) {
      loadAndPlay();
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((e) => console.log("Playback error:", e));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setIsAudioLoading(false); // Stop loader once audio metadata/duration is loaded
    if (audioRef.current) setDuration(audioRef.current.duration || 45);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || isAudioLoading) return;
    const seekValue = parseFloat(e.target.value);
    audioRef.current.currentTime = seekValue;
    setCurrentTime(seekValue);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  const formatTime = (time: number) => {
    if (isAudioLoading && time === 0) return "Carregando...";
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Canvas waveform visualizer
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
        if (isPlaying) {
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
  }, [isPlaying]);

  // Lyrics renderer with support for literal '\n' string escapes
  const renderLyrics = () => {
    if (!metadata.lyrics) return null;

    // Normalize literal "\n" strings into real newlines
    const normalizedLyrics = metadata.lyrics.replace(/\\n/g, "\n");

    return normalizedLyrics.split("\n").map((line, index) => {
      const cleanLine = line.trim();
      if (cleanLine.startsWith("[") && cleanLine.endsWith("]")) {
        return (
          <h4 key={index} className="text-[#FF5A5F] font-bold text-xs mt-4 mb-2  tracking-widest font-mono flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#FF5A5F] rounded-full animate-pulse"></span>
            {cleanLine}
          </h4>
        );
      }
      return (
        <p key={index} className="text-sm text-gray-600 leading-relaxed min-h-[1.5rem] select-all whitespace-pre-wrap">
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
            animate={{ rotate: isPlaying && !isAudioLoading ? 360 : 0 }}
            transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
            className="absolute inset-0 bg-gray-900 rounded-full border-4 border-gray-800 shadow-lg flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-2 border border-gray-800/35 rounded-full"></div>
            <div className="absolute inset-5 border border-gray-800/25 rounded-full"></div>
            <div className="absolute inset-8 border border-gray-800/30 rounded-full"></div>
            <div className="w-16 h-16 bg-gradient-to-tr from-[#FF5A5F] to-amber-400 rounded-full flex items-center justify-center relative shadow-inner">
              <Disc className={`w-8 h-8 text-white/90 ${isPlaying && !isAudioLoading ? "animate-pulse" : ""}`} />
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

      {/* Audio Element (lazy loaded) */}
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
        />
      )}

      {/* Waveform */}
      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-inner">
        <canvas ref={canvasRef} className="w-full opacity-90" />
      </div>

      {/* Progress */}
      <div className="space-y-1 px-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          disabled={isAudioLoading}
          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF5A5F] disabled:opacity-50"
        />
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
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
            value={volume}
            onChange={handleVolumeChange}
            disabled={isAudioLoading}
            className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-gray-400 disabled:opacity-50"
          />
        </div>

        <button
          onClick={togglePlay}
          disabled={!hasAudio || isAudioLoading}
          className="w-14 h-14 bg-[#FF5A5F] hover:bg-[#e04f53] disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-full flex items-center justify-center shadow-md shadow-[#FF5A5F]/15 transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
        >
          {isAudioLoading ? (
            <RefreshCw className="w-6 h-6 animate-spin text-[#FF5A5F]" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6 fill-white" />
          ) : (
            <Play className="w-6 h-6 fill-white ml-0.5" />
          )}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* WhatsApp share button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-emerald-600 rounded-xl flex items-center justify-center transition-colors"
            title="Compartilhar no WhatsApp"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 text-emerald-500"
            >
              <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.37 5.082L2 22l5.102-1.336a9.926 9.926 0 0 0 4.909 1.302h.004c5.505 0 9.988-4.478 9.99-9.985A9.983 9.983 0 0 0 12.012 2zm5.718 14.153c-.314.881-1.523 1.621-2.102 1.713-.578.093-1.127.351-3.693-.701-3.284-1.345-5.358-4.717-5.522-4.939-.165-.221-1.319-1.758-1.319-3.353 0-1.595.825-2.38 1.121-2.696.297-.317.594-.396.792-.396.198 0 .396.002.56.01.178.008.416-.067.652.503.243.585.824 2.013.896 2.16.073.148.122.32.023.518-.098.199-.148.32-.296.495-.148.175-.312.39-.446.522-.149.148-.304.309-.13.606.173.297.768 1.267 1.65 2.051.17.151.32.32.483.479a2.531 2.531 0 0 0 .762.536c.28.113.445.093.61-.098.165-.192.709-.824.9-.11.191.713.693 2.376.762 2.524.069.148.138.247.138.346 0 .099-.074.522-.388 1.403z" />
            </svg>
          </a>

          {/* Download via API (signed URL) */}
          <a
            href={`${import.meta.env.VITE_API_URL || ""}/api/orders/${orderId}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-9 h-9 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-[#FF5A5F] rounded-xl flex items-center justify-center transition-colors ${!hasAudio || isAudioLoading ? "opacity-40 pointer-events-none" : ""}`}
            title="Baixar Música"
          >
            <Download className="w-4 h-4" />
          </a>

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
