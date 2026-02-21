import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Loader2, Trash2, Plus, ArrowRight, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { useArticles } from "@/context/ArticlesContext"
import { writeUserDoc } from "@/lib/firestore"
import { aiFillFromDomain } from "@/lib/ai-fill"
import { parseSitemapUrls } from "@/lib/sitemap"
import { isPersonalEmail } from "@/lib/auth-helpers"
import type { Competitor, IntelligenceBankQuestion, CompanyProfile, Article } from "@/types"

const STEP_DELAYS = [3000, 3000, 3000, 3000]

const TOTAL_ONBOARDING_STEPS = 7 // dots indicator

const TIPS = [
  { title: "Fresh content is winning content", desc: "Fresh content earns 70% more citations in AI search." },
  { title: "Consistency beats perfection", desc: "Publishing 2-4 articles per week drives 3x more organic traffic." },
  { title: "AI-optimized content matters", desc: "Pages optimized for AI search get 40% more visibility." },
  { title: "Internal linking is key", desc: "Strong internal linking boosts page authority by up to 50%." },
]

type Phase = "loading" | "domain-input" | "analyzing" | "review-competitors" | "review-questions" | "complete"

function DotIndicator({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "w-3 h-3 bg-foreground"
              : i < current
                ? "w-2 h-2 bg-foreground/40"
                : "w-2 h-2 bg-foreground/15"
          }`}
        />
      ))}
    </div>
  )
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user, firebaseUser, refreshUser } = useAuth()
  const { updateProfile } = useCompanyProfile()
  const { addArticle } = useArticles()
  const [phase, setPhase] = useState<Phase>("loading")
  const [analysisStep, setAnalysisStep] = useState(0)
  const [customDomain, setCustomDomain] = useState("")
  const [domain, setDomain] = useState("")
  const [tipIndex, setTipIndex] = useState(0)
  const animationStarted = useRef(false)
  const domainChecked = useRef(false)
  const userRef = useRef(user)
  userRef.current = user

  // Dynamic step labels
  const [stepLabels, setStepLabels] = useState([
    "Analyzing your search presence...",
    "Scanning your sitemap...",
    "Researching competitors...",
    "Generating your intelligence bank...",
  ])

  // Generated data for review steps
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [questions, setQuestions] = useState<IntelligenceBankQuestion[]>([])
  const [profileData, setProfileData] = useState<Partial<CompanyProfile>>({})

  // Store enrichment + sitemap results in refs for use after animation
  const enrichResultRef = useRef<Partial<CompanyProfile> | null>(null)
  const sitemapArticlesRef = useRef<Article[]>([])

  // New competitor inputs
  const [newCompName, setNewCompName] = useState("")
  const [newCompDomain, setNewCompDomain] = useState("")

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
    if (!user || domainChecked.current) return
    domainChecked.current = true

    if (isPersonalEmail(user.email)) {
      setPhase("domain-input")
    } else {
      startAnalysis(user.domain)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  // Rotate tips during analysis
  useEffect(() => {
    if (phase !== "analyzing") return
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [phase])

  const startAnalysis = useCallback(async (dom: string) => {
    if (animationStarted.current) return
    animationStarted.current = true
    setDomain(dom)
    setPhase("analyzing")
    setAnalysisStep(0)

    // Update step 0 with the actual domain
    setStepLabels((prev) => {
      const next = [...prev]
      next[0] = `Analyzing ${dom}...`
      return next
    })

    // Track completion of API calls and timer
    let timerDone = false
    let apisDone = false
    let enrichData: Partial<CompanyProfile> | null = null
    let sitemapArticles: Article[] = []

    const resolveIfReady = () => {
      if (timerDone && apisDone && enrichData) {
        // Set final state and transition
        setProfileData(enrichData)
        setCompetitors(enrichData.competitors || [])
        setQuestions(enrichData.intelligenceBank || [])
        enrichResultRef.current = enrichData
        sitemapArticlesRef.current = sitemapArticles

        setTimeout(() => setPhase("review-competitors"), 500)
      }
    }

    // Fire API calls in parallel
    const sitemapPromise = parseSitemapUrls([`https://${dom}/sitemap.xml`])
      .then((articles) => {
        sitemapArticles = articles
        sitemapArticlesRef.current = articles
        if (articles.length > 0) {
          setStepLabels((prev) => {
            const next = [...prev]
            next[1] = `Found ${articles.length} blog post${articles.length !== 1 ? "s" : ""}`
            return next
          })
        }
      })
      .catch(() => {
        // Sitemap parse failed, keep default label
      })

    const enrichPromise = aiFillFromDomain(dom)
      .then((data) => {
        enrichData = data
        enrichResultRef.current = data
        // Update competitor step label
        const compNames = (data.competitors || []).slice(0, 2).map((c) => c.name)
        if (compNames.length > 0) {
          setStepLabels((prev) => {
            const next = [...prev]
            next[2] = `Analyzing ${compNames.join(", ")}...`
            return next
          })
        }
        // Update questions step label
        const qCount = (data.intelligenceBank || []).length
        if (qCount > 0) {
          setStepLabels((prev) => {
            const next = [...prev]
            next[3] = `Generated ${qCount} personalized question${qCount !== 1 ? "s" : ""}`
            return next
          })
        }
      })
      .catch(() => {
        // Enrich failed, keep default labels
      })

    // Run animation timer in parallel
    const timerPromise = (async () => {
      for (let i = 0; i < STEP_DELAYS.length; i++) {
        setAnalysisStep(i)
        await new Promise((r) => setTimeout(r, STEP_DELAYS[i]))
      }
      setAnalysisStep(STEP_DELAYS.length)
    })()

    // Wait for APIs
    Promise.all([sitemapPromise, enrichPromise]).then(() => {
      apisDone = true
      resolveIfReady()
    })

    // Wait for timer
    timerPromise.then(() => {
      timerDone = true
      resolveIfReady()
    })
  }, [])

  const handleDomainSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dom = customDomain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    if (!dom) return
    startAnalysis(dom)
  }

  const handleFinishOnboarding = async () => {
    // Save all profile data with reviewed competitors and questions
    updateProfile({
      ...profileData,
      competitors,
      intelligenceBank: questions,
    })

    // Import sitemap articles into content library
    const articlesToImport = sitemapArticlesRef.current
    for (const article of articlesToImport) {
      addArticle(article)
    }

    // Mark onboarding complete
    const currentUser = userRef.current
    if (currentUser?.uid) {
      try {
        await writeUserDoc(currentUser.uid, { onboardingComplete: true, domain })
        await refreshUser()
      } catch {
        // Still proceed
      }
    }
    setPhase("complete")
  }

  const handleNavigate = async (path: string) => {
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

  const handleSkipCompetitors = () => {
    setCompetitors([])
    setPhase("review-questions")
  }

  const handleSkipQuestions = () => {
    setQuestions([])
    handleFinishOnboardingWithData([], [])
  }

  const handleFinishOnboardingWithData = async (
    finalCompetitors: Competitor[],
    finalQuestions: IntelligenceBankQuestion[]
  ) => {
    updateProfile({
      ...profileData,
      competitors: finalCompetitors,
      intelligenceBank: finalQuestions,
    })

    // Import sitemap articles into content library
    const articlesToImport = sitemapArticlesRef.current
    for (const article of articlesToImport) {
      addArticle(article)
    }

    const currentUser = userRef.current
    if (currentUser?.uid) {
      try {
        await writeUserDoc(currentUser.uid, { onboardingComplete: true, domain })
        await refreshUser()
      } catch {
        // Continue
      }
    }
    setPhase("complete")
  }

  const handleRemoveCompetitor = (id: string) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id))
  }

  const handleAddCompetitor = () => {
    const name = newCompName.trim()
    if (!name) return
    setCompetitors((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        url: newCompDomain.trim() || `${name.toLowerCase().replace(/\s+/g, "")}.com`,
      },
    ])
    setNewCompName("")
    setNewCompDomain("")
  }

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const [newQuestion, setNewQuestion] = useState("")
  const handleAddQuestion = () => {
    const text = newQuestion.trim()
    if (!text) return
    setQuestions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, enabled: true },
    ])
    setNewQuestion("")
  }

  const isAnalysisDone = analysisStep >= STEP_DELAYS.length
  const analysisProgress = (analysisStep / STEP_DELAYS.length) * 100

  // Compute which dot is active
  const dotStep = (() => {
    switch (phase) {
      case "domain-input": return 0
      case "analyzing": return 1
      case "review-competitors": return 2
      case "review-questions": return 3
      case "complete": return 4
      default: return 0
    }
  })()

  const companyName = profileData.name || domain.split(".")[0] || ""

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-onboarding">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 max-w-5xl mx-auto">
        <div className="text-xl font-bold tracking-tight">
          {companyName || "Wonda"}
        </div>
        {phase !== "loading" && (
          <DotIndicator total={TOTAL_ONBOARDING_STEPS} current={dotStep} />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-8 pb-16">
        {/* Loading Phase */}
        {phase === "loading" && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#0061FF]" />
          </div>
        )}

        {/* Domain Input Phase */}
        {phase === "domain-input" && (
          <div className="max-w-md mx-auto pt-16 space-y-8 animate-in fade-in duration-300">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight">
                What's your company domain?
              </h1>
              <p className="text-muted-foreground">
                We'll use this to analyze your market, identify competitors, and generate a tailored content strategy.
              </p>
            </div>
            <form onSubmit={handleDomainSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="yourcompany.com"
                  required
                  className="text-base h-12"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={!customDomain.trim()}>
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>
          </div>
        )}

        {/* Analysis Phase */}
        {phase === "analyzing" && (
          <div className="pt-12 space-y-8 animate-in fade-in duration-300">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                Stand by for Your Content Strategy
              </h1>
              <p className="text-muted-foreground">
                Loading Competitive Report for {domain}
              </p>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-border overflow-hidden max-w-xl mx-auto">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#0061FF] transition-all duration-700"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>

            {/* Steps checklist */}
            <div className="max-w-xl mx-auto rounded-xl border border-border bg-white p-6 space-y-4">
              {stepLabels.map((label, index) => {
                const isDone = index < analysisStep
                const isActive = index === analysisStep && !isAnalysisDone

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 transition-opacity duration-300 ${
                      index > analysisStep && !isAnalysisDone ? "opacity-30" : "opacity-100"
                    }`}
                  >
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      {isDone || (isAnalysisDone && index === stepLabels.length - 1) ? (
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
                      className={`text-sm transition-all duration-300 ${
                        isDone || isAnalysisDone
                          ? "text-[#10B981] font-medium"
                          : isActive
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Rotating tip */}
            <div className="max-w-xl mx-auto rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#10B981]/10 shrink-0">
                  <Sparkles className="h-4 w-4 text-[#10B981]" />
                </div>
                <div className="min-h-[40px]">
                  <p className="text-sm font-medium">{TIPS[tipIndex].title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{TIPS[tipIndex].desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {TIPS.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === tipIndex ? "w-3 h-2 bg-[#10B981]" : "w-2 h-2 bg-[#10B981]/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Review Competitors */}
        {phase === "review-competitors" && (
          <div className="pt-12 space-y-8 animate-in fade-in duration-300">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Review your competitors
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                We'll use this list to compare your brand's visibility against competitors across topics to identify gaps and opportunities. Review the initial list of competitors we've identified based on your brand and audience.
              </p>
            </div>

            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-1">
                <div className="text-sm font-medium">
                  Competitors <span className="text-muted-foreground font-normal">({competitors.length})</span>
                </div>
                <div className="text-sm font-medium">Domain</div>
                <div />
              </div>

              {/* Rows */}
              {competitors.map((comp) => (
                <div key={comp.id} className="grid grid-cols-[1fr_1fr_40px] gap-3 items-center">
                  <Input
                    value={comp.name}
                    onChange={(e) =>
                      setCompetitors((prev) =>
                        prev.map((c) => (c.id === comp.id ? { ...c, name: e.target.value } : c))
                      )
                    }
                    className="h-11"
                  />
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${comp.url}&sz=16`}
                      alt=""
                      className="w-4 h-4 shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                    <Input
                      value={comp.url}
                      onChange={(e) =>
                        setCompetitors((prev) =>
                          prev.map((c) => (c.id === comp.id ? { ...c, url: e.target.value } : c))
                        )
                      }
                      className="h-11"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveCompetitor(comp.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Add new competitor */}
              <div className="grid grid-cols-[1fr_1fr_40px] gap-3 items-center pt-2 border-t border-border">
                <Input
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  placeholder="Competitor name"
                  className="h-11"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCompetitor())}
                />
                <Input
                  value={newCompDomain}
                  onChange={(e) => setNewCompDomain(e.target.value)}
                  placeholder="domain.com"
                  className="h-11"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCompetitor())}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleAddCompetitor}
                  disabled={!newCompName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={handleSkipCompetitors}
              >
                Skip <span className="text-xs ml-1 text-muted-foreground/60">(not recommended)</span>
              </Button>
              <Button onClick={() => setPhase("review-questions")} className="h-11 px-6">
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Review Questions / Prompts */}
        {phase === "review-questions" && (
          <div className="pt-12 space-y-8 animate-in fade-in duration-300">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Review your initial questions
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                We've built your initial question list based on your brand, audience, and competitors — targeting the topics your audience is searching for. Later, you'll scale this by adding custom questions and your own first-party data sources.
              </p>
            </div>

            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[1fr_40px] gap-3 px-1">
                <div className="text-sm font-medium">
                  Question <span className="text-muted-foreground font-normal">({questions.length})</span>
                </div>
                <div />
              </div>

              {/* Rows */}
              {questions.map((q) => (
                <div key={q.id} className="grid grid-cols-[1fr_40px] gap-3 items-center">
                  <Input
                    value={q.text}
                    onChange={(e) =>
                      setQuestions((prev) =>
                        prev.map((item) =>
                          item.id === q.id ? { ...item, text: e.target.value } : item
                        )
                      )
                    }
                    className="h-11"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveQuestion(q.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Add new question */}
              <div className="grid grid-cols-[1fr_40px] gap-3 items-center pt-2 border-t border-border">
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Add a new question..."
                  className="h-11"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddQuestion())}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleAddQuestion}
                  disabled={!newQuestion.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setPhase("review-competitors")}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={handleSkipQuestions}
              >
                Skip <span className="text-xs ml-1 text-muted-foreground/60">(not recommended)</span>
              </Button>
              <Button onClick={handleFinishOnboarding} className="h-11 px-6">
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Complete */}
        {phase === "complete" && (
          <div className="max-w-lg mx-auto pt-24 text-center space-y-8 animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-[#10B981]" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                You're all set!
              </h1>
              <p className="text-muted-foreground">
                Your workspace is ready. What would you like to do first?
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleNavigate("/company-profile")}
              >
                Review Company Profile
              </Button>
              <Button
                size="lg"
                onClick={() => handleNavigate("/content-library")}
              >
                Generate Your First Article
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
