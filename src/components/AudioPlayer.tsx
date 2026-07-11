import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Download, Music, Disc, Volume2, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { SongMetadata } from "../types";

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
}: AudioPlayerProps) {
  const [localIsPlaying, localSetIsPlaying] = useState(false);
  const [localCurrentTime, localSetCurrentTime] = useState(0);
  const [localDuration, localSetDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const isPlaying = propIsPlaying !== undefined ? propIsPlaying : localIsPlaying;
  const setIsPlaying = propSetIsPlaying !== undefined ? propSetIsPlaying : localSetIsPlaying;
  const currentTime = propCurrentTime !== undefined ? propCurrentTime : localCurrentTime;
  const setCurrentTime = propSetCurrentTime !== undefined ? propSetCurrentTime : localSetCurrentTime;
  const duration = propDuration !== undefined ? propDuration : localDuration;
  const setDuration = propSetDuration !== undefined ? propSetDuration : localSetDuration;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Lazy load audio only when user clicks play — reduces initial bundle
  const loadAndPlay = async () => {
    if (!hasAudio) return;

    if (!audioSrc) {
      setIsAudioLoading(true);
      // Fetch signed URL via our API (never exposes Supabase)
      const downloadUrl = `/api/orders/${orderId}/download`;
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
          <h4 key={index} className="text-[#FF5A5F] font-bold text-xs mt-4 mb-2 uppercase tracking-widest font-mono flex items-center justify-center gap-1.5">
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
            <span key={tag} className="text-[10px] bg-gray-50 text-gray-500 border border-gray-100 px-2.5 py-1 rounded-full font-mono uppercase">
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

        {/* Download via API (signed URL) */}
        <a
          href={`/api/orders/${orderId}/download`}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-9 h-9 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-[#FF5A5F] rounded-xl flex items-center justify-center transition-colors ${!hasAudio || isAudioLoading ? "opacity-40 pointer-events-none" : ""}`}
          title="Baixar Música"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>

      {/* Lyrics */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3 shadow-sm max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200/50 pb-2.5">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-[#FF5A5F]" />
            Letra
          </span>
        </div>
        <div className="text-center space-y-1 font-sans">{renderLyrics()}</div>
      </div>
    </div>
  );
}
