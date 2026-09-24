// ─── Suspicious-activity / auto-block whitelist ───────────────────────────────
// Visitors whose name matches one of these (case-insensitive, whitespace
// trimmed/collapsed) are fully exempt from the suspicious-activity detector:
// no devtools/screenshot/abusive-language/etc. reporting, and no auto-block
// is ever applied or enforced for them, regardless of IP or device.

const WHITELISTED_NAMES = [
  'gayatri chauhan',
  'meenu',
  'meenu chauhan',
  'gayatri',
]

// ─── Self-unblock (relation-based) ─────────────────────────────────────────
// On the "Access Blocked" screen, a visitor can pick their relation to the
// site owner and, if they pick "Wife" and type a name matching one of these
// (case-insensitive, whitespace-normalized — including the common "Abhisek"
// spelling), they're unblocked immediately without needing an admin appeal.
const WIFE_NAMES = [
  'gayatri abhishek singh',
  'gayatri abhisek singh',
]

/** True if the typed name matches the wife's accepted name/spelling variants. */
export function isSelfUnblockWifeName(name: string | null | undefined): boolean {
  const n = normalizeName(name)
  if (!n) return false
  return WIFE_NAMES.includes(n)
}

function normalizeName(name: string | null | undefined): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** True if the given display name (any casing) is on the exempt list. */
export function isWhitelistedName(name: string | null | undefined): boolean {
  const n = normalizeName(name)
  if (!n) return false
  return WHITELISTED_NAMES.includes(n)
}
