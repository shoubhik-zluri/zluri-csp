import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchConfidence } from '@/types/database'

export interface MatchResult {
  accountId: string | null
  confidence: MatchConfidence
  reasons: string[]
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(inc|ltd|llc|corp|co|pvt|private|limited|technologies|technology|solutions|software|services|systems)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (na === nb) return 1.0
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const aWords = new Set(na.split(' ').filter((w) => w.length > 2))
  const bWords = new Set(nb.split(' ').filter((w) => w.length > 2))
  if (aWords.size === 0 || bWords.size === 0) return 0
  let overlap = 0
  for (const w of aWords) { if (bWords.has(w)) overlap++ }
  return overlap / Math.max(aWords.size, bWords.size)
}

function extractDomainsFromEmails(emails: string[]): string[] {
  return [...new Set(
    emails
      .map((e) => e.split('@')[1]?.toLowerCase())
      .filter((d): d is string => !!d && !isInternalDomain(d))
  )]
}

function isInternalDomain(domain: string): boolean {
  return ['zluri.com', 'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain)
}

function extractCompanyHintFromDomain(domain: string): string {
  const parts = domain.split('.')
  const hint = parts.length > 2 ? parts[parts.length - 2] : parts[0]
  return hint.toLowerCase()
}

/**
 * Match a meeting to an account using multi-layer heuristics.
 *
 * Layer 1 (HIGH):   exact email domain in account_integrations
 * Layer 2 (MEDIUM): Clari account_name similarity ≥ 0.8, or participant domain substring match
 * Layer 3 (LOW):    weak keyword overlap between title/domain hints and account names
 * No match:         confidence='none', accountId=null — never dropped
 */
export async function matchMeetingToAccount(
  attendeeEmails: string[],
  meetingTitle: string,
  supabase: SupabaseClient,
  clariAccountName?: string | null
): Promise<MatchResult> {
  const domains = extractDomainsFromEmails(attendeeEmails)

  // --- Layer 1: exact email domain match (HIGH) ---
  if (domains.length > 0) {
    const { data: integrations } = await supabase
      .from('account_integrations')
      .select('account_id, email_domain')
      .in('email_domain', domains)
      .limit(1)

    if (integrations && integrations.length > 0) {
      return {
        accountId: integrations[0].account_id,
        confidence: 'high',
        reasons: [`email_domain:${integrations[0].email_domain}`],
      }
    }
  }

  // --- Layer 2: Clari account_name similarity (MEDIUM) ---
  if (clariAccountName) {
    const { data: allAccounts } = await supabase
      .from('accounts')
      .select('id, name')
      .order('name')

    if (allAccounts && allAccounts.length > 0) {
      let bestScore = 0
      let bestAccount: { id: string; name: string } | null = null

      for (const acct of allAccounts) {
        const score = nameSimilarity(clariAccountName, acct.name)
        if (score > bestScore) {
          bestScore = score
          bestAccount = acct
        }
      }

      if (bestScore >= 0.8 && bestAccount) {
        return {
          accountId: bestAccount.id,
          confidence: 'medium',
          reasons: [`clari_name_similarity:${bestScore.toFixed(2)}:${clariAccountName}`],
        }
      }

      // Domain substring match against Clari account_name (MEDIUM)
      if (domains.length > 0) {
        const normalizedClariName = normalizeName(clariAccountName)
        for (const domain of domains) {
          const hint = extractCompanyHintFromDomain(domain)
          if (hint.length > 3 && normalizedClariName.includes(hint)) {
            // Find the account whose name best matches Clari's account_name
            if (bestScore >= 0.5 && bestAccount) {
              return {
                accountId: bestAccount.id,
                confidence: 'medium',
                reasons: [`clari_name_domain_hint:${hint}:${clariAccountName}`],
              }
            }
          }
        }
      }
    }
  }

  // --- Layer 3: keyword search against account names (LOW) ---
  const titleWords = meetingTitle
    .split(/[\s|<>\-–_/\\]+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
    .filter((w) => w.length > 3)

  const domainHints = domains.map(extractCompanyHintFromDomain).filter((h) => h.length > 3)
  const searchTerms = [...new Set([...domainHints, ...titleWords])]

  for (const term of searchTerms) {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name')
      .ilike('name', `%${term}%`)
      .limit(1)

    if (accounts && accounts.length > 0) {
      return {
        accountId: accounts[0].id,
        confidence: 'low',
        reasons: [`keyword:${term}`],
      }
    }
  }

  return { accountId: null, confidence: 'none', reasons: [] }
}
