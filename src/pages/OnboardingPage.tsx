import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { writeUserDoc } from "@/lib/firestore"
import { aiFillFromDomain } from "@/lib/ai-fill"

const ONBOARDING_STEPS = [
  { label: "Analyzing your domain...", delay: 1500 },
  { label: "Generating company profile...", delay: 2000 },
  { label: "Building your intelligence bank...", delay: 1500 },
  { label: "Preparing your content engine...", delay: 1000 },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user, firebaseUser, refreshUser } = useAuth()
  const { updateProfile } = useCompanyProfile()
  const [currentStep, setCurrentStep] = useState(0)
  const [complete, setComplete] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (!firebaseUser) {
      navigate("/login")
      return
    }

    // If already onboarded, skip
    if (user?.onboardingComplete) {
      navigate("/")
      return
    }
  }, [firebaseUser, user, navigate])

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function runSteps() {
      for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
        setCurrentStep(i)
        await new Promise((r) => setTimeout(r, ONBOARDING_STEPS[i].delay))
      }

      // Fill profile from domain
      if (user?.domain) {
        const profileData = aiFillFromDomain(user.domain)
        updateProfile(profileData)
      }

      // Mark onboarding complete
      if (user?.uid) {
        await writeUserDoc(user.uid, { onboardingComplete: true }).catch(() => {})
        await refreshUser()
      }

      setComplete(true)
    }

    runSteps()
  }, [user, updateProfile, refreshUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-lg p-8 text-center space-y-8">
        <img src="/wonda-logo.png" alt="Wonda" className="h-8 mx-auto" />

        <div className="space-y-4 text-left">
          {ONBOARDING_STEPS.map((step, index) => {
            const isDone = index < currentStep || complete
            const isActive = index === currentStep && !complete

            return (
              <div
                key={index}
                className={`flex items-center gap-3 transition-opacity duration-300 ${
                  index > currentStep && !complete ? "opacity-30" : "opacity-100"
                }`}
              >
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  {isDone ? (
                    <div className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#0061FF]" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-border" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isDone
                      ? "text-[#10B981] font-medium"
                      : isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {complete && (
          <div className="space-y-4 pt-4 animate-in fade-in duration-500">
            <p className="text-sm text-muted-foreground">
              Your workspace is ready! What would you like to do first?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate("/company-profile")}
              >
                Review Company Profile
              </Button>
              <Button onClick={() => navigate("/content-library")}>
                Generate Your First Article
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
