import { useState } from "react"
import { toast } from "sonner"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WizardStepper } from "@/components/company-profile/WizardStepper"
import { BrandDnaStep } from "@/components/company-profile/BrandDnaStep"
import { GoalStep } from "@/components/company-profile/GoalStep"
import { CompetitorsStep } from "@/components/company-profile/CompetitorsStep"
import { IntelligenceBankStep } from "@/components/company-profile/IntelligenceBankStep"
import { useCompanyProfile } from "@/context/CompanyProfileContext"

const STEPS = ["Brand DNA", "The Goal", "Competitors", "Intelligence Bank"]

export function CompanyProfilePage() {
  const { profile, updateProfile } = useCompanyProfile()
  const [currentStep, setCurrentStep] = useState(0)

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return Boolean(profile.name.trim() && profile.valueProp.trim())
      case 1:
        return Boolean(profile.ctaText.trim())
      case 2:
        return true // competitors are optional
      case 3:
        return profile.intelligenceBank.some((q) => q.enabled)
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  const handleSave = () => {
    toast.success("Company profile saved")
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
        <p className="text-muted-foreground mt-1">
          Define your company intelligence to power AI-generated content.
        </p>
      </div>

      <WizardStepper steps={STEPS} currentStep={currentStep} />

      <Card className="glass">
        <CardHeader>
          <CardTitle>
            Step {currentStep + 1}: {STEPS[currentStep]}
          </CardTitle>
          <CardDescription>
            {currentStep === 0 &&
              "Tell us the basics about your brand and value."}
            {currentStep === 1 &&
              "Set the primary call-to-action for your content."}
            {currentStep === 2 &&
              "Add competitors for comparison content."}
            {currentStep === 3 &&
              "Review and curate your intelligence questions."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === 0 && (
            <BrandDnaStep profile={profile} onUpdate={updateProfile} />
          )}
          {currentStep === 1 && (
            <GoalStep profile={profile} onUpdate={updateProfile} />
          )}
          {currentStep === 2 && (
            <CompetitorsStep profile={profile} onUpdate={updateProfile} />
          )}
          {currentStep === 3 && (
            <IntelligenceBankStep profile={profile} onUpdate={updateProfile} />
          )}

          <div className="flex justify-between pt-4 border-t border-white/5">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </Button>
            <div className="flex gap-2">
              {currentStep === STEPS.length - 1 ? (
                <Button onClick={handleSave} disabled={!canProceed()}>
                  Save Profile
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
