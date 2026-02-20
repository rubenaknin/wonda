import { Check } from "lucide-react"

interface WizardStepperProps {
  steps: string[]
  currentStep: number
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep

        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  isCompleted
                    ? "bg-purple-500/20 text-purple-400"
                    : isCurrent
                      ? "bg-purple-500/30 text-purple-300 ring-2 ring-purple-500/50"
                      : "bg-white/5 text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  isCurrent
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-px w-8 ${
                  isCompleted ? "bg-purple-500/40" : "bg-white/10"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
