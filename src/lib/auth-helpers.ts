import { ALL_LOCAL_STORAGE_KEYS } from "@/lib/constants"

export function extractDomain(email: string): string {
  return email.split("@")[1] ?? ""
}

export function isAdminEmail(email: string): boolean {
  return email.endsWith("@trywonda.com")
}

export function calculateTrialDaysRemaining(trialStartDate: string): number {
  const start = new Date(trialStartDate).getTime()
  const now = Date.now()
  const elapsed = now - start
  const daysElapsed = Math.floor(elapsed / (1000 * 60 * 60 * 24))
  return Math.max(0, 7 - daysElapsed)
}

const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "protonmail.com",
]

export function isPersonalEmail(email: string): boolean {
  const domain = extractDomain(email)
  return PERSONAL_EMAIL_DOMAINS.includes(domain)
}

export function clearAllLocalData(): void {
  for (const key of ALL_LOCAL_STORAGE_KEYS) {
    localStorage.removeItem(key)
  }
}
