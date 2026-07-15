// Centralized API client.
//
// Every authenticated request reads the session token directly from
// localStorage (the persisted source of truth) instead of relying on the
// React auth context. This guarantees the token is attached even right
// after navigation / re-renders, when the context may not have
// re-hydrated yet — which previously caused intermittent 401s.

const STORAGE_KEY = "umamusica_user"

export const API_BASE: string = (import.meta.env.VITE_API_URL as string) || ""

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

  return fetch(url, { ...rest, headers: finalHeaders })
}
