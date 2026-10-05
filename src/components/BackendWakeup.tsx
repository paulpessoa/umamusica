import React, { useEffect, useState } from "react"
import { isBackendReady, onBackendReady, waitForBackend } from "../lib/api"

// Starts waking the API (Render free tier sleeps after 15 min idle) without
// blocking the UI. The page renders immediately; API calls made through
// apiFetch / waitForBackend wait for the wake-up on their own.
export default function BackendWakeup({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    waitForBackend()
  }, [])

  return <>{children}</>
}

// True once /api/health has answered. Use it to swap a button label for a
// "waking up" message while the user waits on their first action.
export function useBackendReady(): boolean {
  const [ready, setReady] = useState(isBackendReady)

  useEffect(() => {
    if (ready) return
    return onBackendReady(() => setReady(true))
  }, [ready])

  return ready
}
