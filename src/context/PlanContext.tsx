import { createContext, useContext, useCallback, useMemo, useEffect, useState, type ReactNode } from "react"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { STORAGE_KEYS, PLAN_LIMITS } from "@/lib/constants"
import { readUserDoc, writeUserDoc } from "@/lib/firestore"
import { calculateTrialDaysRemaining } from "@/lib/auth-helpers"
import type { PricingPlan, PricingTier } from "@/types"

const defaultPlan: PricingPlan = {
  tier: "starter",
  articlesUsed: 0,
  billingCycleStart: new Date().toISOString(),
}

interface PlanContextValue {
  plan: PricingPlan
  selectPlan: (tier: PricingTier) => void
  incrementUsage: () => void
  canGenerate: boolean
  articlesRemaining: number
  isGrowthOrAbove: boolean
  isTrialActive: boolean
  trialDaysRemaining: number
}

const PlanContext = createContext<PlanContextValue | null>(null)

export function PlanProvider({ children, uid, trialStartDate, planTier, articlesUsedRemote }: {
  children: ReactNode
  uid?: string
  trialStartDate?: string
  planTier?: string
  articlesUsedRemote?: number
}) {
  const [plan, setPlan] = useLocalStorage<PricingPlan>(
    STORAGE_KEYS.PLAN,
    defaultPlan
  )
  const [synced, setSynced] = useState(false)

  // Sync plan from Firestore user doc
  useEffect(() => {
    if (!uid || synced) return
    readUserDoc(uid)
      .then((userDoc) => {
        if (userDoc) {
          const tier = userDoc.planTier === "trial" ? "starter" : userDoc.planTier as PricingTier
          setPlan((prev) => ({
            ...prev,
            tier,
            articlesUsed: userDoc.articlesUsed ?? prev.articlesUsed,
          }))
        }
      })
      .catch(() => {})
      .finally(() => setSynced(true))
  }, [uid, synced, setPlan])

  const effectivePlanTier = planTier ?? plan.tier
  const effectiveTrialStart = trialStartDate ?? plan.billingCycleStart

  const trialDaysRemaining = calculateTrialDaysRemaining(effectiveTrialStart)
  const isTrialActive = effectivePlanTier === "trial" && trialDaysRemaining > 0

  const selectPlan = useCallback(
    (tier: PricingTier) => {
      setPlan((prev) => ({ ...prev, tier }))
      if (uid) {
        writeUserDoc(uid, { planTier: tier }).catch(() => {})
      }
    },
    [setPlan, uid]
  )

  const incrementUsage = useCallback(() => {
    setPlan((prev) => {
      const newUsed = prev.articlesUsed + 1
      if (uid) {
        writeUserDoc(uid, { articlesUsed: newUsed } as Record<string, number>).catch(() => {})
      }
      return { ...prev, articlesUsed: newUsed }
    })
  }, [setPlan, uid])

  // Trial: 7 days, 5 articles max
  const effectiveTier = effectivePlanTier === "trial" ? "starter" : effectivePlanTier as PricingTier
  const limit = effectivePlanTier === "trial" ? 5 : PLAN_LIMITS[effectiveTier]
  const articlesUsed = articlesUsedRemote ?? plan.articlesUsed
  const articlesRemaining = Math.max(0, limit - articlesUsed)

  const canGenerate = useMemo(() => {
    if (effectivePlanTier === "trial") {
      return trialDaysRemaining > 0 && articlesUsed < 5
    }
    return articlesUsed < limit
  }, [effectivePlanTier, trialDaysRemaining, articlesUsed, limit])

  const isGrowthOrAbove = useMemo(
    () => plan.tier === "growth" || plan.tier === "enterprise",
    [plan.tier]
  )

  return (
    <PlanContext.Provider
      value={{
        plan,
        selectPlan,
        incrementUsage,
        canGenerate,
        articlesRemaining,
        isGrowthOrAbove,
        isTrialActive,
        trialDaysRemaining,
      }}
    >
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  const context = useContext(PlanContext)
  if (!context) {
    throw new Error("usePlan must be used within a PlanProvider")
  }
  return context
}
