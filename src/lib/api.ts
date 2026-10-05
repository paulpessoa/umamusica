// Centralized API client.
//
// Every authenticated request reads the session token directly from
// localStorage (the persisted source of truth) instead of relying on the
// React auth context. This guarantees the token is attached even right
// after navigation / re-renders, when the context may not have
// re-hydrated yet — which previously caused intermittent 401s.

const STORAGE_KEY = "umamusica_user"

export const API_BASE: string = (import.meta.env.VITE_API_URL as string) || ""

// Backend wake-up.
//
// The API runs on Render's free tier, which sleeps after 15 min without
// traffic and takes ~30-60s to cold start. Instead of blocking the whole app,
// we ping /api/health in the background as soon as the page loads and make
// API calls wait for it, so only the action the user triggered shows a
// "waking up" state — and usually the user is still reading the page.

const WAKE_TIMEOUT_MS = 90_000
const WAKE_RETRY_MS = 3_000

let backendReady = false
let wakePromise: Promise<void> | null = null
const readyListeners = new Set<() => void>()

export function isBackendReady(): boolean {
  return backendReady
}

export function onBackendReady(cb: () => void): () => void {
  readyListeners.add(cb)
  return () => readyListeners.delete(cb)
}

// Resolves once /api/health answers, or after WAKE_TIMEOUT_MS so callers never
// hang forever (the real request then fails with its own error).
export function waitForBackend(): Promise<void> {
  if (backendReady) return Promise.resolve()
  if (!wakePromise) {
    wakePromise = (async () => {
      const deadline = Date.now() + WAKE_TIMEOUT_MS
      while (Date.now() < deadline) {
        try {
          const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" })
          if (res.ok) {
            backendReady = true
            readyListeners.forEach((cb) => cb())
            return
          }
        } catch {
          // Still waking up (502/connection reset during cold start).
        }
        await new Promise((r) => setTimeout(r, WAKE_RETRY_MS))
      }
    })().finally(() => {
      if (!backendReady) wakePromise = null
    })
  }
  return wakePromise
}

export interface StoredUser {
  id: string
  email: string
  name?: string
  referral_code?: string
  free_songs_balance?: number
  session_token?: string
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredUser) : null
  } catch {
    return null
  }
}

export function getAuthToken(): string | null {
  return getStoredUser()?.session_token ?? null
}

interface ApiFetchOptions extends RequestInit {
  // Skip attaching the Authorization header (e.g. fully public calls).
  skipAuth?: boolean
}

// `path` may be:
//  - relative:  "/api/orders/123"  -> API_BASE is prepended
//  - absolute: "https://host/api/..." -> used as-is
export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { skipAuth, headers, ...rest } = options
  const token = skipAuth ? null : getAuthToken()

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined)
  }

  if (token && !finalHeaders["Authorization"]) {
    finalHeaders["Authorization"] = `Bearer ${token}`
  }

  // Default JSON content-type when the caller provides a body.
  if (rest.body && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json"
  }

  const isAbsolute = /^https?:\/\//i.test(path)
  const url = isAbsolute ? path : `${API_BASE}${path}`

  await waitForBackend()
  return fetch(url, { ...rest, headers: finalHeaders })
}
