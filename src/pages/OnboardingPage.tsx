import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Check, Loader2, Trash2, Plus, ArrowRight, Sparkles, Globe, Search, Users, Zap } from "lucide-react"
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

const STEP_DELAYS = [2500, 3000, 3000, 2500]
const STEP_ICONS = [Globe, Search, Users, Zap]

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
  const { user, firebaseUser, refreshUser, updateUserLocally } = useAuth()
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

  // Smooth progress (0–100)
  const [smoothProgress, setSmoothProgress] = useState(0)
  const [saving, setSaving] = useState(false)

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
      })
      .catch(() => {
        // Enrich failed, keep default labels
      })

    // Run animation timer in parallel with smooth progress
    const totalDuration = STEP_DELAYS.reduce((a, b) => a + b, 0)
    const timerPromise = (async () => {
      let elapsed = 0
      for (let i = 0; i < STEP_DELAYS.length; i++) {
        setAnalysisStep(i)
        const stepDuration = STEP_DELAYS[i]
        const steps = 20 // sub-steps per step for smooth progress
        const interval = stepDuration / steps
        for (let j = 0; j < steps; j++) {
          await new Promise((r) => setTimeout(r, interval))
          elapsed += interval
          setSmoothProgress(Math.min((elapsed / totalDuration) * 100, 100))
        }
      }
      setAnalysisStep(STEP_DELAYS.length)
      setSmoothProgress(100)
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
    if (saving) return
    setSaving(true)

    // Save profile + mark onboarding complete in parallel, don't block UI
    updateProfile({
      ...profileData,
      competitors,
      intelligenceBank: questions,
    })

    // Import sitemap articles — fire all at once, don't await each
    const articlesToImport = sitemapArticlesRef.current
    for (const article of articlesToImport) {
      addArticle(article)
    }

    // Mark onboarding complete — update local state immediately so ProtectedRoute won't redirect
    updateUserLocally({ onboardingComplete: true })
    const currentUser = userRef.current
    if (currentUser?.uid) {
      writeUserDoc(currentUser.uid, { onboardingComplete: true, domain })
        .then(() => refreshUser())
        .catch(() => {})
    }

    setSaving(false)
    setPhase("complete")
  }

  const handleNavigate = (path: string) => {
    updateUserLocally({ onboardingComplete: true })
    const currentUser = userRef.current
    if (currentUser?.uid && !currentUser.onboardingComplete) {
      writeUserDoc(currentUser.uid, { onboardingComplete: true })
        .then(() => refreshUser())
        .catch(() => {})
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

  const handleFinishOnboardingWithData = (
    finalCompetitors: Competitor[],
    finalQuestions: IntelligenceBankQuestion[]
  ) => {
    if (saving) return
    setSaving(true)

    updateProfile({
      ...profileData,
      competitors: finalCompetitors,
      intelligenceBank: finalQuestions,
    })

    // Import sitemap articles — fire all at once
    const articlesToImport = sitemapArticlesRef.current
    for (const article of articlesToImport) {
      addArticle(article)
    }

    updateUserLocally({ onboardingComplete: true })
    const currentUser = userRef.current
    if (currentUser?.uid) {
      writeUserDoc(currentUser.uid, { onboardingComplete: true, domain })
        .then(() => refreshUser())
        .catch(() => {})
    }

    setSaving(false)
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
          <div className="pt-8 space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="space-y-3 text-center max-w-lg mx-auto">
              <h1 className="text-3xl font-bold tracking-tight">
                Building Your Strategy
              </h1>
              <p className="text-muted-foreground text-base">
                Analyzing <span className="font-medium text-foreground">{domain}</span>
              </p>
            </div>

            {/* Smooth progress bar */}
            <div className="max-w-md mx-auto">
              <div className="h-1.5 rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0061FF] via-[#0061FF] to-[#10B981]"
                  style={{
                    width: `${smoothProgress}%`,
                    transition: "width 150ms ease-out",
                  }}
                />
              </div>
              <div className="flex justify-end mt-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(smoothProgress)}%
                </span>
              </div>
            </div>

            {/* Steps — vertical timeline */}
            <div className="max-w-md mx-auto space-y-0">
              {stepLabels.map((label, index) => {
                const isDone = index < analysisStep || isAnalysisDone
                const isActive = index === analysisStep && !isAnalysisDone
                const isPending = index > analysisStep && !isAnalysisDone
                const StepIcon = STEP_ICONS[index]

                return (
                  <div key={index} className="flex gap-4 relative">
                    {/* Vertical line */}
                    {index < stepLabels.length - 1 && (
                      <div
                        className="absolute left-[19px] top-[40px] w-[2px] h-[calc(100%-24px)]"
                        style={{
                          background: isDone ? "#10B981" : "#E2E8F0",
                          transition: "background 0.5s ease",
                        }}
                      />
                    )}

                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative z-10"
                      style={{
                        background: isDone
                          ? "#10B981"
                          : isActive
                            ? "#0061FF"
                            : "#F1F5F9",
                        transition: "background 0.4s ease, transform 0.3s ease",
                        transform: isActive ? "scale(1.1)" : "scale(1)",
                        boxShadow: isActive
                          ? "0 0 0 4px rgba(0, 97, 255, 0.15)"
                          : isDone
                            ? "0 0 0 4px rgba(16, 185, 129, 0.1)"
                            : "none",
                      }}
                    >
                      {isDone ? (
                        <Check className="h-4 w-4 text-white" />
                      ) : isActive ? (
                        <StepIcon className="h-4 w-4 text-white animate-pulse" />
                      ) : (
                        <StepIcon className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className="pb-6 pt-2 min-w-0"
                      style={{
                        opacity: isPending ? 0.35 : 1,
                        transition: "opacity 0.4s ease",
                      }}
                    >
                      <p
                        className="text-sm leading-snug"
                        style={{
                          fontWeight: isActive || isDone ? 500 : 400,
                          color: isDone
                            ? "#10B981"
                            : isActive
                              ? "#0F172A"
                              : "#94A3B8",
                          transition: "color 0.4s ease",
                        }}
                      >
                        {label}
                      </p>
                      {isActive && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="flex gap-0.5">
                            <span className="block w-1 h-1 rounded-full bg-[#0061FF] animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="block w-1 h-1 rounded-full bg-[#0061FF] animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="block w-1 h-1 rounded-full bg-[#0061FF] animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Rotating tip — minimal */}
            <div className="max-w-md mx-auto">
              <div className="rounded-xl bg-white border border-border/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-[#0061FF]/5 shrink-0 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#0061FF]" />
                  </div>
                  <div className="min-h-[36px]">
                    <p className="text-sm font-medium text-foreground/90">{TIPS[tipIndex].title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{TIPS[tipIndex].desc}</p>
                  </div>
                </div>
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

            {/* spacer for sticky bar */}
            <div className="h-20" />
          </div>
        )}

        {/* Sticky bar: Competitors */}
        {phase === "review-competitors" && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-t border-border">
            <div className="max-w-4xl mx-auto px-8 py-4 flex items-center gap-3">
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

            {/* spacer for sticky bar */}
            <div className="h-20" />
          </div>
        )}

        {/* Sticky bar: Questions */}
        {phase === "review-questions" && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-t border-border">
            <div className="max-w-4xl mx-auto px-8 py-4 flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setPhase("review-competitors")}
                disabled={saving}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={handleSkipQuestions}
                disabled={saving}
              >
                Skip <span className="text-xs ml-1 text-muted-foreground/60">(not recommended)</span>
              </Button>
              <Button onClick={handleFinishOnboarding} className="h-11 px-6" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
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
