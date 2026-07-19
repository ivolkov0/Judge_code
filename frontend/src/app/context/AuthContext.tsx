import React, { createContext, useContext, useState, useEffect } from "react"
import { api } from "../lib/api"

export type Role = "participant" | "jury" | "organizer" | null

export interface AuthUser {
  id: number
  email: string
  first_name: string
  last_name: string
  role: Role
  avatar_path?: string
  phone?: string | null
  city?: string | null
  age?: number | null
  bio?: string | null
  education?: string | null
  work?: string | null
  skills?: string[] | null
  interests?: string[] | null
  github?: string | null
  telegram?: string | null
}

export interface ProfilePatch {
  first_name?: string
  last_name?: string
  phone?: string | null
  city?: string | null
  age?: number | null
  bio?: string | null
  education?: string | null
  work?: string | null
  skills?: string[]
  interests?: string[]
  github?: string | null
  telegram?: string | null
}

interface AuthContextType {
  user: AuthUser | null
  role: Role
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  loading: boolean
  updateAvatar: (file: File) => Promise<void>
  updateProfile: (data: ProfilePatch) => Promise<void>
  changePassword: (current: string, next: string) => Promise<void>
}

export interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  role: string
}

const STORAGE_KEY = "judge_auth"

export const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const { token: t, user: u } = JSON.parse(stored)
        setToken(t)
        setUser(u)
        api.get<AuthUser>("/auth/me")
          .then((fresh) => { setUser(fresh); persist(t, fresh) })
          .catch(() => { clear() })
          .finally(() => setLoading(false))
      } catch {
        clear()
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const persist = (t: string, u: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, user: u }))
  }

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/login", { email, password })
    setToken(res.token)
    setUser(res.user)
    persist(res.token, res.user)
  }

  const register = async (data: RegisterData) => {
    const res = await api.post<{ token: string; user: AuthUser }>("/auth/register", data)
    setToken(res.token)
    setUser(res.user)
    persist(res.token, res.user)
  }

  const logout = () => { clear() }

  const updateAvatar = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    const updated = await api.upload<AuthUser>("/auth/avatar", formData)
    setUser(updated)
    persist(token!, updated)
  }

  const updateProfile = async (data: ProfilePatch) => {
    const updated = await api.patch<AuthUser>("/auth/me", data)
    setUser(updated)
    if (token) persist(token, updated)
  }

  const changePassword = async (current: string, next: string) => {
    await api.post("/auth/password", { current_password: current, new_password: next })
  }

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, token, login, register, logout, loading, updateAvatar, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
