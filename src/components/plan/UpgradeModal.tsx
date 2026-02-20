import { useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLAN_DETAILS } from "@/lib/constants"
import { createCheckoutSession } from "@/lib/stripe-client"
import { useAuth } from "@/context/AuthContext"
import { usePlan } from "@/context/PlanContext"

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { user } = useAuth()
  const { trialDaysRemaining, isTrialActive } = usePlan()
  const [loading, setLoading] = useState<string | null>(null)

  if (!open) return null

  const handleUpgrade = async (tier: string) => {
    if (!user) return
    setLoading(tier)
    try {
      await createCheckoutSession(user.uid, tier, user.email)
    } catch {
      // Error handling — user stays on page
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Upgrade Your Plan</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isTrialActive
                ? `Your trial has ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} remaining.`
                : "Your trial has expired or you've reached your article limit."}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLAN_DETAILS.map((p) => (
            <div
              key={p.tier}
              className="rounded-lg p-4 border border-border space-y-3"
            >
              <div className="font-semibold">{p.name}</div>
              <div className="text-2xl font-bold">
                {p.price !== null ? (
                  <>
                    ${p.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /mo
                    </span>
                  </>
                ) : (
                  <span className="text-base">Talk to Sales</span>
                )}
              </div>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="text-xs text-muted-foreground flex items-start gap-1.5"
                  >
                    <Check className="h-3 w-3 mt-0.5 text-[#10B981] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                size="sm"
                onClick={() => handleUpgrade(p.tier)}
                disabled={!!loading}
              >
                {loading === p.tier ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : p.price !== null ? (
                  "Upgrade"
                ) : (
                  "Contact Sales"
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
