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
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  const currentIndex = WIZARD_STEPS.indexOf(currentStep)

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {WIZARD_STEPS.map((step, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <div key={step} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-2 w-10 rounded-full transition-colors ${
                  isCompleted
                    ? "bg-purple-500"
                    : isCurrent
                      ? "bg-purple-500/60"
                      : "bg-white/10"
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
