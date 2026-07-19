const BASE = "/api"

function getToken(): string | null {
  try {
    const stored = localStorage.getItem("judge_auth")
    if (!stored) return null
    return JSON.parse(stored).token ?? null
  } catch {
    return null
  }
}

function formatError(detail: unknown): string {
  if (!detail) return "Request failed"
  if (typeof detail === "string") return detail
  // FastAPI validation errors: detail is an array of { loc, msg, type }
  if (Array.isArray(detail)) {
    return detail
      .map((e) =>
        e && typeof e === "object" && "msg" in e
          ? String((e as { msg: unknown }).msg)
          : String(e),
      )
      .join(", ")
  }
  if (typeof detail === "object" && "msg" in detail) {
    return String((detail as { msg: unknown }).msg)
  }
  return "Request failed"
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (body && !isFormData) headers["Content-Type"] = "application/json"

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(formatError(err.detail))
  }

  // 204 No Content (or empty body) — nothing to parse.
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  upload: <T>(path: string, form: FormData) => request<T>("POST", path, form, true),
  uploadPut: <T>(path: string, form: FormData) => request<T>("PUT", path, form, true),
}
