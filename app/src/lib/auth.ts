export type AuthUser = {
  id: string
  email: string
  name: string
  role: string
  store?: string
}

type AuthResponse = {
  token: string
  user: AuthUser
}

type LoginPayload = {
  email: string
  password: string
}

type RegisterPayload = {
  name: string
  email: string
  password: string
  role: string
  store?: string
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000"
const TOKEN_STORAGE_KEY = "auth_token"
const USER_STORAGE_KEY = "auth_user"

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function getStoredUser() {
  return parseJson<AuthUser>(localStorage.getItem(USER_STORAGE_KEY))
}

export function setAuthSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
}

async function authRequest(path: string, options?: RequestInit): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload?.message || payload?.error || `Request failed: ${response.status}`
    throw new Error(message)
  }

  return payload as AuthResponse
}

export async function register(payload: RegisterPayload) {
  const data = await authRequest("/api/auth/register", {
    body: JSON.stringify(payload),
  })
  setAuthSession(data.token, data.user)
  return data.user
}

export async function login(payload: LoginPayload) {
  const data = await authRequest("/api/auth/login", {
    body: JSON.stringify(payload),
  })
  setAuthSession(data.token, data.user)
  return data.user
}

export async function fetchCurrentUser() {
  const token = getAuthToken()
  if (!token) {
    return null
  }

  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    clearAuthSession()
    return null
  }

  const user = payload?.user as AuthUser | undefined
  if (!user) {
    clearAuthSession()
    return null
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  return user
}
