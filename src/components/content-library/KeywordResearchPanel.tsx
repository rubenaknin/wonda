import { useState } from "react"
import { toast } from "sonner"
import { Sparkles, X, Plus, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useArticles } from "@/context/ArticlesContext"
import { useWebhook } from "@/context/WebhookContext"
import { sendWebhook } from "@/lib/webhook"
import type { Article } from "@/types"

interface SuggestedKeyword {
  keyword: string
  volume: string
  difficulty: string
  selected: boolean
}

interface KeywordResearchPanelProps {
  onClose: () => void
}

export function KeywordResearchPanel({ onClose }: KeywordResearchPanelProps) {
  const [topic, setTopic] = useState("")
  const [niche, setNiche] = useState("")
  const [competitorUrls, setCompetitorUrls] = useState("")
  const [isResearching, setIsResearching] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestedKeyword[]>([])
  const { addArticle } = useArticles()
  const { webhookUrls } = useWebhook()

  const handleResearch = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic")
      return
    }

    setIsResearching(true)

    sendWebhook(webhookUrls.researchKeywords, "research_keywords", {
      topic,
      niche,
      competitorUrls: competitorUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean),
    })

    // Simulate research results
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const mockKeywords: SuggestedKeyword[] = [
      `best ${topic} tools`,
      `${topic} for beginners`,
      `how to ${topic} effectively`,
      `${topic} vs alternatives`,
      `${topic} strategy guide`,
      `${topic} best practices 2025`,
      `top ${topic} platforms`,
      `${topic} case studies`,
      `${topic} ROI calculator`,
      `enterprise ${topic} solutions`,
    ].map((kw) => ({
      keyword: kw,
      volume: `${Math.floor(Math.random() * 15000 + 500)}`,
      difficulty: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
      selected: true,
    }))

    setSuggestions(mockKeywords)
    setIsResearching(false)
    toast.success(`Found ${mockKeywords.length} keyword suggestions`)
  }

  const toggleKeyword = (index: number) => {
    setSuggestions((prev) =>
      prev.map((kw, i) =>
        i === index ? { ...kw, selected: !kw.selected } : kw
      )
    )
  }

  const handleAddToLibrary = () => {
    const selected = suggestions.filter((kw) => kw.selected)
    if (selected.length === 0) {
      toast.error("No keywords selected")
      return
    }

    const now = new Date().toISOString()
    selected.forEach((kw) => {
      const newArticle: Article = {
        id: crypto.randomUUID(),
        title: kw.keyword,
        keyword: kw.keyword,
        slug: "",
        category: "blog",
        status: "pending",
        bodyHtml: "",
        faqHtml: "",
        faqItems: [],
        metaTitle: "",
        metaDescription: "",
        ctaText: "",
        ctaUrl: "",
        internalLinks: [],
        selectedQuestions: [],
        createdAt: now,
        updatedAt: now,
      }
      addArticle(newArticle)
    })

    toast.success(`Added ${selected.length} keywords to Content Library`)
    onClose()
  }

  return (
    <Card className="wonda-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#0061FF]" />
          Wonda Keyword Research
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic / Seed Keyword</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., content marketing"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="niche">Industry / Niche (optional)</Label>
              <Input
                id="niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g., SaaS, e-commerce, healthcare"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competitors">
                Competitor URLs (optional, one per line)
              </Label>
              <Textarea
                id="competitors"
                value={competitorUrls}
                onChange={(e) => setCompetitorUrls(e.target.value)}
                placeholder={"https://competitor1.com\nhttps://competitor2.com"}
                rows={3}
              />
            </div>
            <Button
              onClick={handleResearch}
              className="w-full"
              disabled={isResearching || !topic.trim()}
            >
              {isResearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Research Keywords
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {suggestions.filter((kw) => kw.selected).length} of{" "}
                {suggestions.length} keywords selected
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSuggestions([])}
                >
                  New Search
                </Button>
                <Button size="sm" onClick={handleAddToLibrary}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Selected
                </Button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {suggestions.map((kw, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    kw.selected
                      ? "border-[#0061FF]/30 bg-[#0061FF]/5"
                      : "border-border bg-[#F8FAFC]"
                  }`}
                >
                  <Checkbox
                    checked={kw.selected}
                    onCheckedChange={() => toggleKeyword(i)}
                  />
                  <span className="flex-1 text-sm font-medium">{kw.keyword}</span>
                  <span className="text-xs text-muted-foreground">
                    Vol: {kw.volume}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      kw.difficulty === "Low"
                        ? "bg-[#10B981]/10 text-[#10B981]"
                        : kw.difficulty === "Medium"
                          ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                          : "bg-red-50 text-red-500"
                    }`}
                  >
                    {kw.difficulty}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
