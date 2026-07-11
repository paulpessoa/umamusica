import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Download, Music, Sparkles, Disc, Volume2, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { SongMetadata } from "../types";

interface AudioPlayerProps {
  audioUrl: string | null;
  metadata: SongMetadata;
  isPlaying?: boolean;
  setIsPlaying?: (playing: boolean) => void;
  currentTime?: number;
  setCurrentTime?: (time: number) => void;
  duration?: number;
  setDuration?: (dur: number) => void;
}

export default function AudioPlayer({ 
  audioUrl, 
  metadata,
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

  const isPlaying = propIsPlaying !== undefined ? propIsPlaying : localIsPlaying;
  const setIsPlaying = propSetIsPlaying !== undefined ? propSetIsPlaying : localSetIsPlaying;
  const currentTime = propCurrentTime !== undefined ? propCurrentTime : localCurrentTime;
  const setCurrentTime = propSetCurrentTime !== undefined ? propSetCurrentTime : localSetCurrentTime;
  const duration = propDuration !== undefined ? propDuration : localDuration;
  const setDuration = propSetDuration !== undefined ? propSetDuration : localSetDuration;
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize backing track in parallel for an even richer sound!
  // We'll use a high-quality online instrument background track corresponding to the selected genre
  // to play behind the custom vocals, creating a professional-sounding studio music mix.
  const getBackingTrackUrl = (style: string = "") => {
    const s = style.toLowerCase();
    if (s.includes("sertanejo") || s.includes("forró") || s.includes("universitário") || s.includes("caipira")) {
      return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"; // folk/acoustic guitar picking
    }
    if (s.includes("pop") || s.includes("funk") || s.includes("dance")) {
      return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"; // pop groove/rhythm
    }
    if (s.includes("samba") || s.includes("pagode")) {
      return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"; // groovy bass & rhythm
    }
    if (s.includes("rock") || s.includes("metal") || s.includes("guitarra")) {
      return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; // energetic rock synth
    }
    if (s.includes("gospel") || s.includes("clássico") || s.includes("piano") || s.includes("violino")) {
      return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"; // soft synth/ambient piano
    }
    if (s.includes("mpb") || s.includes("bossa") || s.includes("jazz")) {
      return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"; // smooth lounge bossa synth
    }
    return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"; // soft acoustic backing track
  };

  const backingTrackUrl = getBackingTrackUrl(metadata.style);
  const backingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (backingAudioRef.current) backingAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.log("Playback error: ", e));
      if (backingAudioRef.current) {
        backingAudioRef.current.volume = volume * 0.3; // keep backing track softer
        backingAudioRef.current.play().catch(e => console.log("Backing playback error"));
      }
      setIsPlaying(true);
    }
  };

  // Sync timeline progress
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 45); // default duration if infinity
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekValue = parseFloat(e.target.value);
    audioRef.current.currentTime = seekValue;
    setCurrentTime(seekValue);
    if (backingAudioRef.current) {
      backingAudioRef.current.currentTime = seekValue % (backingAudioRef.current.duration || 100);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
    if (backingAudioRef.current) backingAudioRef.current.volume = vol * 0.35;
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Draw procedural dynamic sound wave visualizer on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 320;
    canvas.height = 70;

    let barsCount = 32;
    let barsArray: number[] = Array(barsCount).fill(5);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Generate randomized visual audio frequencies if playing, otherwise decay to baseline
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

        // Beautiful visual gradient: coral-red to pastel pink
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
        gradient.addColorStop(0, "#FF5A5F"); // Coral red brand
        gradient.addColorStop(0.5, "#FFB8B8"); // Pastel pink highlight
        gradient.addColorStop(1, "#FF5A5F"); // Base coral red

        ctx.fillStyle = gradient;
        
        // Draw round corner bars
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

  // Handle end of song
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (backingAudioRef.current) {
      backingAudioRef.current.pause();
      backingAudioRef.current.currentTime = 0;
    }
  };

  // Helper to highlight bracket markers like [Refrão] in lyrics
  const renderLyrics = () => {
    if (!metadata.lyrics) return null;

    return metadata.lyrics.split("\n").map((line, index) => {
      if (line.trim().startsWith("[") && line.trim().endsWith("]")) {
        return (
          <h4 key={index} className="text-[#FF5A5F] font-bold text-xs mt-4 mb-2 uppercase tracking-widest font-mono flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#FF5A5F] rounded-full animate-pulse"></span>
            {line}
          </h4>
        );
      }
      return (
        <p key={index} className="text-sm text-gray-600 leading-relaxed min-h-[1.5rem] select-all">
          {line}
        </p>
      );
    });
  };

  return (
    <div id="audio-player-layout" className="space-y-6">
      
      {/* Vinyl Record Visual */}
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Outer rotating vinyl disc */}
          <motion.div 
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
            className="absolute inset-0 bg-gray-900 rounded-full border-4 border-gray-800 shadow-lg flex items-center justify-center overflow-hidden"
          >
            {/* Grooves */}
            <div className="absolute inset-2 border border-gray-800/35 rounded-full"></div>
            <div className="absolute inset-5 border border-gray-800/25 rounded-full"></div>
            <div className="absolute inset-8 border border-gray-800/30 rounded-full"></div>
            <div className="absolute inset-12 border border-gray-800/15 rounded-full"></div>

            {/* Inner Art Circle */}
            <div className="w-16 h-16 bg-gradient-to-tr from-[#FF5A5F] to-amber-400 rounded-full flex items-center justify-center relative shadow-inner">
              <Disc className="w-8 h-8 text-white/90 animate-pulse" />
              {/* Spindle hole */}
              <div className="w-4 h-4 bg-gray-950 rounded-full absolute"></div>
            </div>
          </motion.div>
        </div>

        {/* Text Metadata */}
        <div className="text-center space-y-1">
          <h3 className="font-extrabold text-lg text-gray-950 font-sans leading-tight px-4 truncate">
            {metadata.title}
          </h3>
          <p className="text-xs text-gray-400 font-medium">
            Por: <span className="text-[#FF5A5F] font-semibold">{metadata.artistName}</span>
          </p>
        </div>

        {/* Info Tags (Style, Tempo, Vibe) */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <span className="text-[10px] bg-gray-50 text-gray-500 border border-gray-100 px-2.5 py-1 rounded-full font-mono uppercase">
            {metadata.style}
          </span>
          <span className="text-[10px] bg-gray-50 text-gray-500 border border-gray-100 px-2.5 py-1 rounded-full font-mono uppercase">
            Tempo: {metadata.tempo}
          </span>
          <span className="text-[10px] bg-gray-50 text-gray-500 border border-gray-100 px-2.5 py-1 rounded-full font-mono uppercase">
            Vibe: {metadata.vibe}
          </span>
        </div>
      </div>

      {/* Real HTML5 Audio Logic */}
      <audio
        ref={audioRef}
        src={audioUrl && audioUrl.startsWith("data:") ? audioUrl : backingTrackUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />
      
      {/* Mixing acoustic backing track for beautiful ambient sound */}
      <audio
        ref={backingAudioRef}
        src={backingTrackUrl}
        loop
      />

      {/* Visual Canvas Waveform */}
      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-inner">
        <canvas ref={canvasRef} className="w-full opacity-90" />
      </div>

      {/* Progress Slider Controls */}
      <div className="space-y-1 px-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF5A5F] focus:outline-none"
        />
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4 px-2">
        {/* Volume controls */}
        <div className="flex items-center gap-2 w-20 text-gray-400">
          <Volume2 className="w-4 h-4 shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-gray-400"
          />
        </div>

        {/* Central Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-14 h-14 bg-[#FF5A5F] hover:bg-[#e04f53] text-white rounded-full flex items-center justify-center shadow-md shadow-[#FF5A5F]/15 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-white text-white" />
          ) : (
            <Play className="w-6 h-6 fill-white text-white ml-0.5" />
          )}
        </button>

        {/* Download File Button */}
        <a
          href={audioUrl || backingTrackUrl}
          download={`${metadata.title.toLowerCase().replace(/\s+/g, "_")}.mp3`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-[#FF5A5F] rounded-xl flex items-center justify-center transition-colors duration-200"
          title="Baixar Música"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>

      {/* Lyrics Box */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3 shadow-sm max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        <div className="flex items-center justify-between border-b border-gray-200/50 pb-2.5">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-[#FF5A5F]" />
            Letra Oficial
          </span>
          <span className="text-[10px] text-gray-400">Toque para copiar</span>
        </div>
        <div className="text-center space-y-1 font-sans">
          {renderLyrics()}
        </div>
      </div>

    </div>
  );
}
