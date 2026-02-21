import { createContext, useContext, useCallback, useMemo, useEffect, useState, useRef, type ReactNode } from "react"
import { STORAGE_KEYS } from "@/lib/constants"
import { readCompanyProfile, writeCompanyProfile } from "@/lib/firestore"
import type { CompanyProfile } from "@/types"

const emptyProfile: CompanyProfile = {
  name: "",
  description: "",
  valueProp: "",
  websiteUrl: "",
  sitemapUrl: "",
  contentSitemapUrls: [],
  contentPaths: [],
  reviewPlatforms: [],
  ctaText: "",
  ctaUrl: "",
  competitors: [],
  intelligenceBank: [],
  authors: [],
  authorAssignmentRules: "",
  brandDnaPrompt: "",
  goalPrompt: "",
  competitorsPrompt: "",
  intelligenceBankPrompt: "",
  gscConnected: false,
  gscPropertyUrl: "",
}

function computeProfileCompletion(profile: CompanyProfile): number {
  const checks = [
    profile.name.trim().length > 0,
    profile.description.trim().length > 0,
    profile.valueProp.trim().length > 0,
    profile.websiteUrl.trim().length > 0,
    profile.ctaText.trim().length > 0,
    profile.ctaUrl.trim().length > 0,
    profile.intelligenceBank.length > 0,
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

function writeCache(profile: CompanyProfile) {
  try { localStorage.setItem(STORAGE_KEYS.COMPANY_PROFILE, JSON.stringify(profile)) } catch {}
}

interface CompanyProfileContextValue {
  profile: CompanyProfile
  setProfile: (profile: CompanyProfile) => void
  updateProfile: (partial: Partial<CompanyProfile>) => void
  isOnboarded: boolean
  profileCompletion: number
  loading: boolean
}

const CompanyProfileContext = createContext<CompanyProfileContextValue | null>(null)

export function CompanyProfileProvider({ children, uid }: { children: ReactNode; uid?: string }) {
  const [profile, setProfileState] = useState<CompanyProfile>(emptyProfile)
  const [loading, setLoading] = useState(false)
  const prevUidRef = useRef<string | undefined>(undefined)

  // When uid changes: reset state, then load from Firestore
  useEffect(() => {
    if (prevUidRef.current === uid) return
    prevUidRef.current = uid

    if (!uid) {
      setProfileState(emptyProfile)
      writeCache(emptyProfile)
      return
    }

    setLoading(true)
    readCompanyProfile(uid)
      .then((data) => {
        const loaded = data ? { ...emptyProfile, ...data } : emptyProfile
        setProfileState(loaded)
        writeCache(loaded)
      })
      .catch(() => {
        setProfileState(emptyProfile)
        writeCache(emptyProfile)
      })
      .finally(() => setLoading(false))
  }, [uid])

  const updateProfile = useCallback(
    (partial: Partial<CompanyProfile>) => {
      setProfileState((prev) => {
        const updated = { ...prev, ...partial }
        writeCache(updated)
        if (uid) {
          writeCompanyProfile(uid, updated).catch(() => {})
        }
        return updated
      })
    },
    [uid]
  )

  const setProfile = useCallback(
    (newProfile: CompanyProfile) => {
      setProfileState(newProfile)
      writeCache(newProfile)
      if (uid) {
        writeCompanyProfile(uid, newProfile).catch(() => {})
      }
    },
    [uid]
  )

  const isOnboarded = Boolean(profile.name && profile.valueProp)
  const profileCompletion = useMemo(() => computeProfileCompletion(profile), [profile])

  return (
    <CompanyProfileContext.Provider
      value={{ profile, setProfile, updateProfile, isOnboarded, profileCompletion, loading }}
    >
      {children}
    </CompanyProfileContext.Provider>
  )
}

export function useCompanyProfile() {
  const context = useContext(CompanyProfileContext)
  if (!context) {
    throw new Error("useCompanyProfile must be used within a CompanyProfileProvider")
  }
  return context
}
