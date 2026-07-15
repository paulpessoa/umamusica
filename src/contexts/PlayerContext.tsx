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
    if (a.src !== t.src) a.src = t.src
    a.play()
      .then(() => setIsPlaying(true))
      .catch((e) => {
        if (e?.name !== "AbortError") console.error("Player play error:", e)
      })
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

  // Sync with Media Session API (OS-level media controls like Spotify)
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artistName,
      album: "1Música",
      artwork: [
        {
          src: `${window.location.origin}/logo.png`,
          sizes: "512x512",
          type: "image/png",
        },
      ],
    })

    const actionHandlers: [MediaSessionAction, () => void][] = [
      ["play", togglePlay],
      ["pause", togglePlay],
    ]

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch (error) {
        console.warn(`Media session action "${action}" is not supported.`, error)
      }
    }

    try {
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        skip(-(details.seekOffset || 10))
      })
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        skip(details.seekOffset || 10)
      })
    } catch (e) {
      console.warn("Media session seek actions are not supported.", e)
    }

    return () => {
      const actions: MediaSessionAction[] = ["play", "pause", "seekbackward", "seekforward"]
      actions.forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch (e) {}
      })
    }
  }, [currentTrack, isPlaying]) // update on isPlaying changes to bind the correct togglePlay closure state if needed

  useEffect(() => {
    if (!("mediaSession" in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused"
  }, [isPlaying])

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return
    if (!("setPositionState" in navigator.mediaSession)) return

    try {
      if (duration && !isNaN(duration) && !isNaN(currentTime) && currentTime >= 0 && currentTime <= duration) {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1.0,
          position: currentTime,
        })
      }
    } catch (e) {
      console.warn("Failed to set Media Session position state:", e)
    }
  }, [currentTime, duration, currentTrack])

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
        skip
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
