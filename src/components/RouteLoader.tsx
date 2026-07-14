import React, { useEffect, useRef, useState } from "react"
import { Music } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useLocation } from "react-router-dom"

// Global overlay shown briefly during route transitions, using the spinning
// brand logo as a loading indicator. Skips the very first render.
export default function RouteLoader() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const firstRender = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setVisible(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), 450)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [location.pathname])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-white/70 backdrop-blur-sm"
        >
          <div className="relative w-12 h-12 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              className="absolute inset-0 rounded-xl bg-[#FF5A5F] shadow-md shadow-[#FF5A5F]/30"
            />
            <Music className="relative z-10 w-6 h-6 text-white" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

