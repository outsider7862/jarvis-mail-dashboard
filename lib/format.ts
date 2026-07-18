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
