import { useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useWebhook } from "@/context/WebhookContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { usePlan } from "@/context/PlanContext"
import { sendWebhook } from "@/lib/webhook"
import { ROUTES } from "@/lib/constants"
import type { FaqItem } from "@/types"

const PROGRESS_STAGES = [
  { threshold: 20, status: "Analyzing keyword intent..." },
  { threshold: 40, status: "Researching competitor content..." },
  { threshold: 60, status: "Structuring article outline..." },
  { threshold: 80, status: "Writing article body..." },
  { threshold: 95, status: "Generating FAQ section..." },
  { threshold: 100, status: "Finalizing content..." },
]

function getStatusForProgress(progress: number): string {
  for (const stage of PROGRESS_STAGES) {
    if (progress <= stage.threshold) return stage.status
  }
  return "Complete!"
}

interface GenerateStepProps {
  keyword: string
  slug: string
  category: string
  internalLinks: string[]
  selectedQuestions: string[]
  isGenerating: boolean
  progress: number
  status: string
  onStart: () => void
  onProgress: (progress: number, status: string) => void
  onComplete: (bodyHtml: string, faqHtml: string, faqItems: FaqItem[], title: string, metaTitle: string, metaDescription: string) => void
  onError: (error: string) => void
}

export function GenerateStep({
  keyword,
  slug,
  category,
  internalLinks,
  selectedQuestions,
  isGenerating,
  progress,
  status,
  onStart,
  onProgress,
  onComplete,
  onError,
}: GenerateStepProps) {
  const navigate = useNavigate()
  const { webhookUrls } = useWebhook()
  const { profile, profileCompletion } = useCompanyProfile()
  const { canGenerate, incrementUsage } = usePlan()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const generateMockContent = useCallback(() => {
    const companyName = profile.name || "Your Company"
    const questions = profile.intelligenceBank
      .filter((q) => selectedQuestions.includes(q.id))
      .map((q) => q.text)

    const title = keyword
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")

    const faqItems: FaqItem[] = questions.slice(0, 5).map((q) => ({
      id: crypto.randomUUID(),
      question: q,
      answer: `${companyName} provides comprehensive solutions for this. Our platform is designed to address this question with data-driven insights and proven results.`,
    }))

    // If no questions from intelligence bank, generate some defaults
    if (faqItems.length === 0) {
      const defaultQuestions = [
        `What is ${keyword}?`,
        `How does ${keyword} work?`,
        `Why is ${keyword} important for businesses?`,
        `How can ${companyName} help with ${keyword}?`,
        `What are the benefits of ${keyword}?`,
      ]
      defaultQuestions.forEach((q) => {
        faqItems.push({
          id: crypto.randomUUID(),
          question: q,
          answer: `${companyName} provides comprehensive solutions for this. Our platform is designed to address this question with data-driven insights and proven results.`,
        })
      })
    }

    const faqHtml = faqItems
      .map(
        (item) =>
          `<div class="faq-item"><h3>${item.question}</h3><p>${item.answer}</p></div>`
      )
      .join("\n")

    const bodyHtml = `<h2>The Complete Guide to ${title}</h2>
<p>In today's competitive landscape, understanding <strong>${keyword}</strong> is essential for businesses looking to stay ahead. ${companyName} has been at the forefront of this space, helping teams achieve measurable results.</p>

<h2>Why ${title} Matters</h2>
<p>With the rapid evolution of digital marketing and SEO, <strong>${keyword}</strong> has become a critical factor in content strategy. Organizations that invest in this area see significant improvements in organic traffic and search visibility.</p>

<h3>Key Benefits</h3>
<ul>
<li>Improved search engine rankings for target keywords</li>
<li>Higher quality organic traffic to your website</li>
<li>Better alignment with user search intent</li>
<li>Increased brand authority in your industry</li>
</ul>

<h2>How ${companyName} Can Help</h2>
<p>${profile.valueProp || "We provide industry-leading solutions"} that empower teams to create content that ranks. Our approach combines data analysis with creative strategy to deliver results that matter.</p>

<h2>Getting Started</h2>
<p>Ready to transform your content strategy? ${profile.ctaText || "Get started today"} and see the difference that strategic, SEO-optimized content can make for your business.</p>`

    const metaTitle = `${title} | ${companyName}`.slice(0, 60)
    const metaDescription = `Learn about ${keyword}. A comprehensive guide by ${companyName}.`.slice(0, 160)

    return { bodyHtml, faqHtml, faqItems, title, metaTitle, metaDescription }
  }, [keyword, profile, selectedQuestions])

  const handleGenerate = async () => {
    onStart()
    incrementUsage()

    const questionTexts = profile.intelligenceBank
      .filter((q) => selectedQuestions.includes(q.id))
      .map((q) => q.text)

    sendWebhook(webhookUrls.generateArticle, "generate_article", {
      companyProfile: profile,
      keyword,
      slug,
      category,
      internalLinks,
      selectedQuestions,
      questionTexts,
    })

    let currentProgress = 0
    intervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 12 + 3
      if (currentProgress >= 100) {
        currentProgress = 100
        if (intervalRef.current) clearInterval(intervalRef.current)
        const { bodyHtml, faqHtml, faqItems, title, metaTitle, metaDescription } = generateMockContent()
        onComplete(bodyHtml, faqHtml, faqItems, title, metaTitle, metaDescription)
      } else {
        onProgress(
          Math.round(currentProgress),
          getStatusForProgress(currentProgress)
        )
      }
    }, 800)
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isGenerating && progress === 0 && status.startsWith("Error:")) {
      onError(status)
    }
  }, [isGenerating, progress, status, onError])

  const profileIncomplete = profileCompletion < 100

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Generate Article</h3>
        <p className="text-sm text-muted-foreground">
          Ready to generate your SEO-optimized article. This will send all your
          settings to the n8n workflow.
        </p>
      </div>

      {profileIncomplete && (
        <div className="rounded-lg p-4 border border-[#F59E0B]/20 bg-[#F59E0B]/5 space-y-2">
          <div className="flex items-center gap-2 text-[#F59E0B] font-medium text-sm">
            <AlertTriangle className="h-4 w-4" />
            Company Profile Incomplete ({profileCompletion}%)
          </div>
          <p className="text-xs text-[#F59E0B]/80">
            Complete your company profile before generating articles. This ensures your brand voice, URLs, and intelligence bank are used in content generation.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/5"
            onClick={() => navigate(ROUTES.COMPANY_PROFILE)}
          >
            Complete Profile
          </Button>
        </div>
      )}

      {!canGenerate && !profileIncomplete && (
        <div className="rounded-lg p-4 border border-[#0061FF]/20 bg-[#0061FF]/5 space-y-2">
          <div className="flex items-center gap-2 text-[#0061FF] font-medium text-sm">
            <AlertTriangle className="h-4 w-4" />
            Upgrade Required
          </div>
          <p className="text-xs text-[#0061FF]/70">
            You've reached your article limit or your trial has expired. Upgrade your plan to continue generating content.
          </p>
          <Button
            size="sm"
            className="bg-[#0061FF] hover:bg-[#0061FF]/90"
            onClick={() => navigate(ROUTES.SETTINGS)}
          >
            Upgrade Plan
          </Button>
        </div>
      )}

      <div className="wonda-card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Keyword:</span>
            <p className="font-medium">{keyword}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Category:</span>
            <p className="font-medium capitalize">
              {category.replace("-", " ")}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Internal Links:</span>
            <p className="font-medium">{internalLinks.length} selected</p>
          </div>
          <div>
            <span className="text-muted-foreground">Questions:</span>
            <p className="font-medium">{selectedQuestions.length} selected</p>
          </div>
        </div>
      </div>

      {isGenerating ? (
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status}
          </div>
        </div>
      ) : progress === 100 ? (
        <div className="text-sm text-[#10B981] font-medium">
          Article generated successfully! Click Next to review and edit.
        </div>
      ) : (
        <Button
          onClick={handleGenerate}
          className="w-full"
          size="lg"
          disabled={profileIncomplete || !canGenerate}
        >
          Generate Article
        </Button>
      )}
    </div>
  )
}
