import type { UserRole } from '@/types/database'

/** Human-readable mention token stored in comment body: @[Display Name] */
export const MENTION_TOKEN_REGEX = /@\[([^\]]+)\]/g

/** Legacy tokens that still include a user id (kept for older comments). */
export const LEGACY_MENTION_TOKEN_REGEX =
  /@\[([^\]]+)\]\(user:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi

export type MentionCandidate = {
  id: string
  full_name: string
  email: string
  role: UserRole
}

export function formatMentionToken(candidate: MentionCandidate): string {
  return `@[${candidate.full_name}]`
}

export function extractMentionLabels(body: string): string[] {
  const labels = new Set<string>()
  const legacy = new RegExp(LEGACY_MENTION_TOKEN_REGEX.source, 'gi')
  let match = legacy.exec(body)
  while (match) {
    labels.add(match[1]!)
    match = legacy.exec(body)
  }

  const plain = new RegExp(MENTION_TOKEN_REGEX.source, 'g')
  match = plain.exec(body)
  while (match) {
    labels.add(match[1]!)
    match = plain.exec(body)
  }

  return [...labels]
}

/** Keep only mention ids whose display label still appears in the body. */
export function resolveMentionedUserIds(
  body: string,
  selected: ReadonlyMap<string, string>,
): string[] {
  const labelsInBody = new Set(
    extractMentionLabels(body).map((label) => label.toLowerCase()),
  )
  const ids: string[] = []

  for (const [userId, label] of selected) {
    if (labelsInBody.has(label.toLowerCase())) {
      ids.push(userId)
    }
  }

  return ids
}

export type CommentBodyPart =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; label: string; userId?: string }

export function parseCommentBody(body: string): CommentBodyPart[] {
  const parts: CommentBodyPart[] = []
  // Prefer legacy (with id) first by scanning a combined pattern.
  const combined =
    /@\[([^\]]+)\](?:\(user:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\))?/gi

  let lastIndex = 0
  let match = combined.exec(body)

  while (match) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'text', value: body.slice(lastIndex, match.index) })
    }
    parts.push({
      kind: 'mention',
      label: match[1] ?? '',
      userId: match[2] || undefined,
    })
    lastIndex = match.index + match[0].length
    match = combined.exec(body)
  }

  if (lastIndex < body.length) {
    parts.push({ kind: 'text', value: body.slice(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ kind: 'text', value: body }]
}
