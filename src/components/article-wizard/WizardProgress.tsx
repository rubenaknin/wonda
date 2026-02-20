import { WIZARD_STEPS } from "@/lib/constants"
import type { WizardStep } from "@/types"

const STEP_LABELS: Record<WizardStep, string> = {
  keyword: "Keyword",
  slug: "Slug",
  category: "Category",
  generate: "Generate",
  editor: "Editor",
  metadata: "Meta",
  export: "Export",
}

interface WizardProgressProps {
  currentStep: WizardStep
  visibleSteps?: WizardStep[]
}

export function WizardProgress({ currentStep, visibleSteps }: WizardProgressProps) {
  const steps = visibleSteps || WIZARD_STEPS
  const currentIndex = steps.indexOf(currentStep)

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <div key={step} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-2 w-10 rounded-full transition-colors ${
                  isCompleted
                    ? "bg-[#0061FF]"
                    : isCurrent
                      ? "bg-[#0061FF]/40"
                      : "bg-border"
                }`}
              />
              <span
                className={`text-[10px] ${
                  isCurrent
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
