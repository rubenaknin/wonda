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
                    ? "bg-[#0061FF]/10 text-[#0061FF]"
                    : isCurrent
                      ? "bg-[#0061FF]/15 text-[#0061FF] ring-2 ring-[#0061FF]/30"
                      : "bg-[#F8FAFC] text-muted-foreground border border-border"
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
                  isCompleted ? "bg-[#0061FF]/40" : "bg-border"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
