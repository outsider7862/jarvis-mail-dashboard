/**
 * Thin wrapper around the Jarvis Mail FastAPI backend.
 * Every call includes the Supabase session JWT as Authorization: Bearer <token>
 * so the backend can verify the user.
 */

import { ChatTurn, UserProfile } from '@/types'

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

export async function getNeedsAttention(token: string, limit = 5) {
  return apiFetch(`/api/analyses/needs-attention?limit=${limit}`, token)
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

export async function markNotified(token: string, analysisId: string) {
  return apiFetch(`/api/analyses/notifications/${analysisId}/mark-notified`, token, {
    method: 'POST',
  })
}

export async function getConnectedAccounts(token: string) {
  return apiFetch('/api/accounts/connected', token)
}

export async function startGmailConnection(token: string) {
  return apiFetch('/api/accounts/connect/gmail', token, { method: 'POST' })
}

export async function createTrigger(token: string) {
  return apiFetch('/api/accounts/trigger', token, { method: 'POST' })
}

export async function disconnectGmail(token: string) {
  return apiFetch('/api/accounts/disconnect/gmail', token, { method: 'POST' })
}

export async function getQuickActions(token: string, analysisId: string) {
  return apiFetch(`/api/reply/${analysisId}/quick-actions`, token)
}

export async function getDecisionAssistance(token: string, analysisId: string) {
  return apiFetch(`/api/reply/${analysisId}/decision`, token)
}

export async function draftReply(
  token: string,
  analysisId: string,
  intent: string,
  conversationHistory?: ChatTurn[],
) {
  return apiFetch('/api/reply/draft', token, {
    method: 'POST',
    body: JSON.stringify({ analysis_id: analysisId, intent, conversation_history: conversationHistory }),
  })
}

export async function rewriteDraft(
  token: string,
  analysisId: string,
  currentDraft: string,
  rewriteInstruction: string,
  conversationHistory?: ChatTurn[],
) {
  return apiFetch('/api/reply/rewrite', token, {
    method: 'POST',
    body: JSON.stringify({
      analysis_id: analysisId,
      current_draft: currentDraft,
      rewrite_instruction: rewriteInstruction,
      conversation_history: conversationHistory,
    }),
  })
}

export async function saveReplyFeedback(token: string, data: {
  analysis_id: string
  intent: string
  category: string
  original_draft: string
  edited_draft: string
}) {
  return apiFetch('/api/reply/feedback', token, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getCalendarEvents(token: string, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch(`/api/calendar${qs}`, token)
}

export async function getPendingCalendarEvents(token: string) {
  return apiFetch('/api/calendar/pending', token)
}

export async function createCalendarEvent(token: string, data: {
  title: string
  description?: string
  event_type: string
  start_at: string
  end_at?: string
  all_day?: boolean
}) {
  return apiFetch('/api/calendar', token, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCalendarEvent(token: string, eventId: string, data: Partial<{
  title: string
  description: string
  start_at: string
  end_at: string
  all_day: boolean
  status: string
}>) {
  return apiFetch(`/api/calendar/${eventId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteCalendarEvent(token: string, eventId: string) {
  return apiFetch(`/api/calendar/${eventId}`, token, { method: 'DELETE' })
}

export async function getProfile(token: string) {
  return apiFetch('/api/profile', token)
}

export async function updateProfile(token: string, data: Partial<UserProfile>) {
  return apiFetch('/api/profile', token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
