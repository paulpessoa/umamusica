import React, { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { usePlayer } from "../contexts/PlayerContext"

export default function PictureInPictureManager() {
  const location = useLocation()
  const player = usePlayer()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const pipRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    if (typeof document === "undefined" || !document.pictureInPictureEnabled) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const startPiP = async () => {
      try {
        if (document.pictureInPictureElement) return
        if (video.readyState < 1) {
          await new Promise((resolve, reject) => {
            const onMeta = () => {
              video.removeEventListener("loadedmetadata", onMeta)
              resolve(true)
            }
            video.addEventListener("loadedmetadata", onMeta)
            video.src =
              "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
            video.load()
            setTimeout(() => {
              video.removeEventListener("loadedmetadata", onMeta)
              resolve(true)
            }, 1500)
          })
        }
        await video.requestPictureInPicture()
      } catch (e) {
        console.error("[PiP] Failed to open:", e)
      }
    }

    const exitPiP = async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture()
        }
      } catch (e) {
        console.error("[PiP] Failed to exit:", e)
      }
    }

    const draw = () => {
      canvas.width = canvas.parentElement?.clientWidth || 320
      canvas.height = canvas.parentElement?.clientHeight || 180

      ctx.fillStyle = "#111827"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = Math.min(centerX, centerY) * 0.4

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.2,
        centerX,
        centerY,
        radius
      )
      gradient.addColorStop(0, "#FF5A5F")
      gradient.addColorStop(1, "#7f1d1d")

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.fillStyle = "#ffffff"
      ctx.font = `bold ${radius * 0.5}px system-ui`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("1Música", centerX, centerY)

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    const handleRouteChange = async () => {
      if (location.pathname === "/musica/:id" || location.pathname.startsWith("/musica/")) {
        if (player.isPlaying) {
          await startPiP()
        }
      } else {
        if (player.isPlaying) {
          await startPiP()
        } else {
          await exitPiP()
        }
      }
    }

    const handlePlay = async () => {
      if (location.pathname.startsWith("/musica/")) return
      await startPiP()
    }

    const handlePause = async () => {
      await exitPiP()
    }

    handleRouteChange()

    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      exitPiP()
    }
  }, [location.pathname, player.isPlaying])

  return (
    <div className="fixed -z-50 pointer-events-none opacity-0">
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ width: 1, height: 1 }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: 320, height: 180 }}
      />
    </div>
  )
}
