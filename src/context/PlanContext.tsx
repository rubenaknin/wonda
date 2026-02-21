import { createContext, useContext, useCallback, useMemo, useEffect, useState, useRef, type ReactNode } from "react"
import { STORAGE_KEYS, PLAN_LIMITS } from "@/lib/constants"
import { readUserDoc, writeUserDoc } from "@/lib/firestore"
import { calculateTrialDaysRemaining } from "@/lib/auth-helpers"
import type { PricingPlan, PricingTier } from "@/types"

const defaultPlan: PricingPlan = {
  tier: "starter",
  articlesUsed: 0,
  billingCycleStart: new Date().toISOString(),
}

function writeCache(plan: PricingPlan) {
  try { localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(plan)) } catch {}
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
  const [plan, setPlanState] = useState<PricingPlan>(defaultPlan)
  const prevUidRef = useRef<string | undefined>(undefined)

  // When uid changes: reset state, then load from Firestore
  useEffect(() => {
    if (prevUidRef.current === uid) return
    prevUidRef.current = uid

    if (!uid) {
      setPlanState(defaultPlan)
      writeCache(defaultPlan)
      return
    }

    readUserDoc(uid)
      .then((userDoc) => {
        if (userDoc) {
          const tier = userDoc.planTier === "trial" ? "starter" : userDoc.planTier as PricingTier
          const loaded = {
            ...defaultPlan,
            tier,
            articlesUsed: userDoc.articlesUsed ?? 0,
          }
          setPlanState(loaded)
          writeCache(loaded)
        } else {
          setPlanState(defaultPlan)
          writeCache(defaultPlan)
        }
      })
      .catch(() => {
        setPlanState(defaultPlan)
        writeCache(defaultPlan)
      })
  }, [uid])

  const effectivePlanTier = planTier ?? plan.tier
  const effectiveTrialStart = trialStartDate ?? plan.billingCycleStart

  const trialDaysRemaining = calculateTrialDaysRemaining(effectiveTrialStart)
  const isTrialActive = effectivePlanTier === "trial" && trialDaysRemaining > 0

  const selectPlan = useCallback(
    (tier: PricingTier) => {
      setPlanState((prev) => {
        const updated = { ...prev, tier }
        writeCache(updated)
        return updated
      })
      if (uid) {
        writeUserDoc(uid, { planTier: tier }).catch(() => {})
      }
    },
    [uid]
  )

  const incrementUsage = useCallback(() => {
    setPlanState((prev) => {
      const newUsed = prev.articlesUsed + 1
      const updated = { ...prev, articlesUsed: newUsed }
      writeCache(updated)
      if (uid) {
        writeUserDoc(uid, { articlesUsed: newUsed } as Record<string, number>).catch(() => {})
      }
      return updated
    })
  }, [uid])

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
