import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Sparkles, Loader2 } from "lucide-react"
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
import { AuthorsStep } from "@/components/company-profile/AuthorsStep"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { aiFillAll } from "@/lib/ai-fill"
import { ROUTES } from "@/lib/constants"

const STEPS = ["Brand DNA", "The Goal", "Competitors", "Intelligence Bank", "Authors"]

export function CompanyProfilePage() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useCompanyProfile()
  const [currentStep, setCurrentStep] = useState(0)
  const [aiLoading, setAiLoading] = useState(false)

  const handleAiFillAll = async () => {
    setAiLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    const updates = aiFillAll(profile)
    updateProfile(updates)
    setAiLoading(false)
    toast.success("AI filled all empty fields")
  }

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return Boolean(profile.name.trim() && profile.valueProp.trim())
      case 1:
        return Boolean(profile.ctaText.trim())
      case 2:
        return true // competitors are optional
      case 3:
        return profile.intelligenceBank.length > 0
      case 4:
        return true // authors are optional
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
    toast.success("Company profile saved! You can access it anytime from Settings.", {
      duration: 5000,
    })
    navigate(ROUTES.DASHBOARD)
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

      <Card className="wonda-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Step {currentStep + 1}: {STEPS[currentStep]}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAiFillAll}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              AI Fill All
            </Button>
          </div>
          <CardDescription>
            {currentStep === 0 &&
              "Tell us the basics about your brand and value."}
            {currentStep === 1 &&
              "Set the primary call-to-action for your content."}
            {currentStep === 2 &&
              "Add competitors for comparison content."}
            {currentStep === 3 &&
              "Review and curate your intelligence questions."}
            {currentStep === 4 &&
              "Add authors and set topic-based assignment rules."}
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
          {currentStep === 4 && (
            <AuthorsStep profile={profile} onUpdate={updateProfile} />
          )}

          <div className="flex justify-between pt-4 border-t border-border">
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
