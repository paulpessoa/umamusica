import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect
} from "react"
import { SongMetadata } from "../types"

export interface PlayerTrack {
  orderId: string
  title: string
  artistName: string
  src: string
  metadata?: SongMetadata | null
}

interface PlayerContextType {
  currentTrack: PlayerTrack | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  setVolume: (v: number) => void
  setTrack: (t: PlayerTrack) => void
  playTrack: (t: PlayerTrack) => void
  togglePlay: () => void
  seek: (t: number) => void
  stop: () => void
  dismiss: () => void
  skip: (delta: number) => void
  isFloating: boolean
  toggleFloating: () => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [isFloating, setIsFloating] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  if (typeof Audio !== "undefined" && !audioRef.current) {
    audioRef.current = new Audio()
    audioRef.current.volume = volume
  }

  const setVolume = (v: number) => {
    setVolumeState(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  const applySrc = (a: HTMLAudioElement, src: string) => {
    if (a.src !== src) a.src = src
  }

  const setTrack = (t: PlayerTrack) => {
    setCurrentTrack(t)
    if (audioRef.current) applySrc(audioRef.current, t.src)
  }

  const playTrack = (t: PlayerTrack) => {
    setCurrentTrack(t)
    const a = audioRef.current
    if (!a) return
    a.src = t.src
    a.play()
      .then(() => setIsPlaying(true))
      .catch((e) => console.log("Player play error:", e))
  }

  const togglePlay = () => {
    const a = audioRef.current
    if (!a || !currentTrack) return
    if (isPlaying) {
      a.pause()
      setIsPlaying(false)
    } else {
      a.play()
        .then(() => setIsPlaying(true))
        .catch(() => {})
    }
  }

  const seek = (t: number) => {
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
  }

  const stop = () => {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const dismiss = () => {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    setIsPlaying(false)
    setCurrentTime(0)
    setCurrentTrack(null)
  }

  const skip = (delta: number) => {
    const a = audioRef.current
    if (!a) return
    const newTime = Math.max(0, Math.min(a.currentTime + delta, duration || 0))
    a.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleFloating = () => {
    setIsFloating((v) => !v)
  }

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setCurrentTime(a.currentTime)
    const onMeta = () => setDuration(a.duration || 0)
    const onEnd = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    a.addEventListener("timeupdate", onTime)
    a.addEventListener("loadedmetadata", onMeta)
    a.addEventListener("ended", onEnd)
    return () => {
      a.removeEventListener("timeupdate", onTime)
      a.removeEventListener("loadedmetadata", onMeta)
      a.removeEventListener("ended", onEnd)
    }
  }, [])

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        setVolume,
        setTrack,
        playTrack,
        togglePlay,
        seek,
        stop,
        dismiss,
        skip,
        isFloating,
        toggleFloating
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext)
  if (ctx === undefined) {
    throw new Error("usePlayer must be used within PlayerProvider")
  }
  return ctx
}
