import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { writeUserDoc } from "@/lib/firestore"
import { aiFillFromDomain } from "@/lib/ai-fill"
import { isPersonalEmail } from "@/lib/auth-helpers"

const ONBOARDING_STEPS = [
  { label: "Analyzing your domain...", delay: 1500 },
  { label: "Generating company profile...", delay: 2000 },
  { label: "Building your intelligence bank...", delay: 1500 },
  { label: "Preparing your content engine...", delay: 1000 },
]

type Phase = "domain-input" | "animating" | "complete"

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user, firebaseUser, refreshUser } = useAuth()
  const { updateProfile } = useCompanyProfile()
  const [phase, setPhase] = useState<Phase>("animating")
  const [currentStep, setCurrentStep] = useState(0)
  const [customDomain, setCustomDomain] = useState("")
  const started = useRef(false)
  const userRef = useRef(user)
  userRef.current = user

  // Redirect if not logged in or already onboarded
  useEffect(() => {
    if (!firebaseUser) {
      navigate("/login", { replace: true })
      return
    }
    if (user?.onboardingComplete) {
      navigate("/", { replace: true })
    }
  }, [firebaseUser, user?.onboardingComplete, navigate])

  // Determine if we need domain input (personal email)
  useEffect(() => {
    if (!user || started.current) return
    if (isPersonalEmail(user.email)) {
      setPhase("domain-input")
    } else {
      // Work email — start animation immediately
      runAnimation(user.domain)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  const runAnimation = useCallback(async (domain: string) => {
    if (started.current) return
    started.current = true
    setPhase("animating")

    for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
      setCurrentStep(i)
      await new Promise((r) => setTimeout(r, ONBOARDING_STEPS[i].delay))
    }
    setCurrentStep(ONBOARDING_STEPS.length)

    // Fill profile from domain
    if (domain) {
      const profileData = aiFillFromDomain(domain)
      updateProfile(profileData)
    }

    // Mark onboarding complete in Firestore
    const currentUser = userRef.current
    if (currentUser?.uid) {
      try {
        await writeUserDoc(currentUser.uid, { onboardingComplete: true, domain })
        await refreshUser()
      } catch {
        // Still mark complete locally so user can proceed
      }
    }

    setPhase("complete")
  }, [updateProfile, refreshUser])

  const handleDomainSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const domain = customDomain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    if (!domain) return
    runAnimation(domain)
  }

  const handleNavigate = async (path: string) => {
    // Ensure onboarding is marked complete before navigating
    const currentUser = userRef.current
    if (currentUser?.uid && !currentUser.onboardingComplete) {
      try {
        await writeUserDoc(currentUser.uid, { onboardingComplete: true })
        await refreshUser()
      } catch {
        // Continue anyway
      }
    }
    navigate(path, { replace: true })
  }

  const isAnimationDone = currentStep >= ONBOARDING_STEPS.length

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-lg p-8 text-center space-y-8">
        <img src="/wonda-logo.png" alt="Wonda" className="h-8 mx-auto" />

        {/* Domain Input Phase (personal email only) */}
        {phase === "domain-input" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">What's your company domain?</h2>
              <p className="text-sm text-muted-foreground">
                We'll use this to set up your company profile and generate content tailored to your brand.
              </p>
            </div>
            <form onSubmit={handleDomainSubmit} className="space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="yourcompany.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={!customDomain.trim()}>
                Continue
              </Button>
            </form>
          </div>
        )}

        {/* Animation Phase */}
        {phase !== "domain-input" && (
          <>
            <div className="space-y-4 text-left">
              {ONBOARDING_STEPS.map((step, index) => {
                const isDone = index < currentStep
                const isActive = index === currentStep && !isAnimationDone

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 transition-opacity duration-300 ${
                      index > currentStep && !isAnimationDone ? "opacity-30" : "opacity-100"
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

            {phase === "complete" && (
              <div className="space-y-4 pt-4 animate-in fade-in duration-500">
                <p className="text-sm text-muted-foreground">
                  Your workspace is ready! What would you like to do first?
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => handleNavigate("/company-profile")}
                  >
                    Review Company Profile
                  </Button>
                  <Button onClick={() => handleNavigate("/content-library")}>
                    Generate Your First Article
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
