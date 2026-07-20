// Relative time for recent items ("2h ago" scans faster than a full date);
// absolute date beyond a day.
export function formatReceived(dateStr: string): string {
  const date = new Date(dateStr)
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// "Jane Doe <jane@x.com>" → "Jane Doe"; bare addresses pass through.
export function senderName(sender: string): string {
  const match = sender.match(/^\s*"?([^"<]+?)"?\s*</)
  return match ? match[1].trim() : sender
}

// "Jane Doe <jane@x.com>" → "jane@x.com"; used for Gmail's compose `to=` param,
// which wants a bare address rather than the display-name form.
export function senderEmail(sender: string): string {
  const angled = sender.match(/<([^>]+)>/)
  if (angled) return angled[1].trim()
  const bare = sender.match(/[^\s<>,;]+@[^\s<>,;]+/)
  return bare ? bare[0] : sender.trim()
}

// ─── Gmail deep links ─────────────────────────────────────────────────────────
//
// `/u/0/` means "whichever account is signed in first", so anyone with multiple
// Gmail accounts lands in the wrong inbox. `authuser=<address>` pins the link to
// the account the email actually arrived in.
//
// The param has to sit in the query string BEFORE the `#fragment`. Everything
// after `#` is the fragment, which Gmail's client-side router reads as a
// location inside the mailbox — an `authuser` placed there is never treated as
// an account selector, so the link silently opens the default account anyway.

const GMAIL_BASE = 'https://mail.google.com/mail'

export function gmailInboxUrl(
  messageId: string | null,
  threadId: string | null,
  connectedEmail: string | null,
): string {
  const id = messageId ?? threadId ?? ''
  if (!connectedEmail) return `${GMAIL_BASE}/u/0/#inbox/${id}`
  return `${GMAIL_BASE}/?authuser=${encodeURIComponent(connectedEmail)}#inbox/${id}`
}

export function gmailComposeUrl(
  to: string,
  subject: string,
  body: string,
  connectedEmail: string | null,
): string {
  const params = new URLSearchParams({ view: 'cm', fs: '1', to, su: subject, body })
  if (connectedEmail) params.set('authuser', connectedEmail)
  // Drop the /u/0/ index when we can address the account by name — keeping both
  // would be contradictory.
  const prefix = connectedEmail ? `${GMAIL_BASE}/` : `${GMAIL_BASE}/u/0/`
  return `${prefix}?${params.toString()}`
}
