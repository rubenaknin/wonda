import { createContext, useContext, useCallback, useMemo, useEffect, useState, type ReactNode } from "react"
import { useLocalStorage } from "@/hooks/useLocalStorage"
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
  const [profile, setProfile] = useLocalStorage<CompanyProfile>(
    STORAGE_KEYS.COMPANY_PROFILE,
    emptyProfile
  )
  const [loading, setLoading] = useState(false)
  const [firestoreLoaded, setFirestoreLoaded] = useState(false)

  // Load from Firestore on mount if uid exists
  useEffect(() => {
    if (!uid || firestoreLoaded) return
    setLoading(true)
    readCompanyProfile(uid)
      .then((data) => {
        if (data) {
          setProfile({ ...emptyProfile, ...data })
        }
      })
      .catch(() => {
        // Fallback to localStorage (already loaded)
      })
      .finally(() => {
        setLoading(false)
        setFirestoreLoaded(true)
      })
  }, [uid, firestoreLoaded, setProfile])

  const updateProfile = useCallback(
    (partial: Partial<CompanyProfile>) => {
      setProfile((prev) => {
        const updated = { ...prev, ...partial }
        // Async write to Firestore (fire and forget)
        if (uid) {
          writeCompanyProfile(uid, updated).catch(() => {})
        }
        return updated
      })
    },
    [setProfile, uid]
  )

  const setProfileWithSync = useCallback(
    (newProfile: CompanyProfile) => {
      setProfile(newProfile)
      if (uid) {
        writeCompanyProfile(uid, newProfile).catch(() => {})
      }
    },
    [setProfile, uid]
  )

  const isOnboarded = Boolean(profile.name && profile.valueProp)
  const profileCompletion = useMemo(() => computeProfileCompletion(profile), [profile])

  return (
    <CompanyProfileContext.Provider
      value={{ profile, setProfile: setProfileWithSync, updateProfile, isOnboarded, profileCompletion, loading }}
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
