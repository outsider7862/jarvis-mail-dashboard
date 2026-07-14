/**
 * Thin wrapper around the Jarvis Mail FastAPI backend.
 * Every call includes the Supabase session JWT as Authorization: Bearer <token>
 * so the backend can verify the user.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json()
}

export async function getMorningBrief(token: string) {
  return apiFetch('/api/analyses/morning-brief', token)
}

export async function getAnalyses(token: string, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch(`/api/analyses${qs}`, token)
}

export async function updateAnalysisStatus(token: string, id: string, status: string) {
  return apiFetch(`/api/analyses/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function getLeads(token: string, status?: string) {
  const qs = status ? `?status=${status}` : ''
  return apiFetch(`/api/leads${qs}`, token)
}

export async function updateLeadStatus(token: string, id: string, status: string) {
  return apiFetch(`/api/leads/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function getRawEmail(token: string, analysisId: string) {
  return apiFetch(`/api/analyses/${analysisId}/raw-email`, token)
}

export async function getPendingNotifications(token: string) {
  return apiFetch('/api/analyses/notifications/pending', token)
}
