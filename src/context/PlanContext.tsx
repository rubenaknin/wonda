import { createContext, useContext, useCallback, useMemo, type ReactNode } from "react"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { STORAGE_KEYS, PLAN_LIMITS } from "@/lib/constants"
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
}

const PlanContext = createContext<PlanContextValue | null>(null)

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useLocalStorage<PricingPlan>(
    STORAGE_KEYS.PLAN,
    defaultPlan
  )

  const selectPlan = useCallback(
    (tier: PricingTier) => {
      setPlan((prev) => ({ ...prev, tier }))
    },
    [setPlan]
  )

  const incrementUsage = useCallback(() => {
    setPlan((prev) => ({ ...prev, articlesUsed: prev.articlesUsed + 1 }))
  }, [setPlan])

  const limit = PLAN_LIMITS[plan.tier]
  const articlesRemaining = Math.max(0, limit - plan.articlesUsed)
  const canGenerate = plan.articlesUsed < limit
  const isGrowthOrAbove = useMemo(
    () => plan.tier === "growth" || plan.tier === "enterprise",
    [plan.tier]
  )

  return (
    <PlanContext.Provider
      value={{ plan, selectPlan, incrementUsage, canGenerate, articlesRemaining, isGrowthOrAbove }}
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
