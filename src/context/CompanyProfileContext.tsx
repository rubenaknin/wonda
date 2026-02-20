import { createContext, useContext, useCallback, useMemo, type ReactNode } from "react"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { STORAGE_KEYS } from "@/lib/constants"
import type { CompanyProfile } from "@/types"

const emptyProfile: CompanyProfile = {
  name: "",
  description: "",
  valueProp: "",
  websiteUrl: "",
  sitemapUrl: "",
  blogSitemapUrl: "",
  ctaText: "",
  ctaUrl: "",
  competitors: [],
  intelligenceBank: [],
}

function computeProfileCompletion(profile: CompanyProfile): number {
  const checks = [
    profile.name.trim().length > 0,
    profile.description.trim().length > 0,
    profile.valueProp.trim().length > 0,
    profile.websiteUrl.trim().length > 0,
    profile.sitemapUrl.trim().length > 0,
    profile.blogSitemapUrl.trim().length > 0,
    profile.ctaText.trim().length > 0,
    profile.ctaUrl.trim().length > 0,
    profile.competitors.length > 0,
    profile.intelligenceBank.length > 0,
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

interface CompanyProfileContextValue {
  profile: CompanyProfile
  setProfile: (profile: CompanyProfile) => void
  updateProfile: (partial: Partial<CompanyProfile>) => void
  isOnboarded: boolean
  profileCompletion: number
}

const CompanyProfileContext = createContext<CompanyProfileContextValue | null>(
  null
)

export function CompanyProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useLocalStorage<CompanyProfile>(
    STORAGE_KEYS.COMPANY_PROFILE,
    emptyProfile
  )

  const updateProfile = useCallback(
    (partial: Partial<CompanyProfile>) => {
      setProfile((prev) => ({ ...prev, ...partial }))
    },
    [setProfile]
  )

  const isOnboarded = Boolean(profile.name && profile.valueProp)
  const profileCompletion = useMemo(() => computeProfileCompletion(profile), [profile])

  return (
    <CompanyProfileContext.Provider
      value={{ profile, setProfile, updateProfile, isOnboarded, profileCompletion }}
    >
      {children}
    </CompanyProfileContext.Provider>
  )
}

export function useCompanyProfile() {
  const context = useContext(CompanyProfileContext)
  if (!context) {
    throw new Error(
      "useCompanyProfile must be used within a CompanyProfileProvider"
    )
  }
  return context
}
