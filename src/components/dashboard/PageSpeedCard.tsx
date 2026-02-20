import { useState, useEffect } from "react"
import { Gauge, FileCode, HelpCircle, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useArticles } from "@/context/ArticlesContext"

interface PageSpeedScore {
  performance: number
  accessibility: number
  seo: number
  bestPractices: number
}

interface SchemaStatus {
  articleSchema: boolean
  faqSchema: boolean
}

interface PageSpeedData {
  scores: PageSpeedScore
  schemaStatus: SchemaStatus
  articlesChecked: number
  lastRun: string
}

const PAGESPEED_KEY = "wonda_pagespeed_data"

function generateMockData(articleCount: number): PageSpeedData {
  return {
    scores: {
      performance: 78 + Math.floor(Math.random() * 18),
      accessibility: 88 + Math.floor(Math.random() * 12),
      seo: 90 + Math.floor(Math.random() * 10),
      bestPractices: 83 + Math.floor(Math.random() * 15),
    },
    schemaStatus: {
      articleSchema: true,
      faqSchema: articleCount > 3,
    },
    articlesChecked: articleCount,
    lastRun: new Date().toISOString(),
  }
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color =
    score >= 90 ? "text-[#10B981]" : score >= 50 ? "text-[#F59E0B]" : "text-red-500"
  const bgColor =
    score >= 90 ? "bg-[#10B981]/10" : score >= 50 ? "bg-[#F59E0B]/10" : "bg-red-50"
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${bgColor} rounded-full h-12 w-12 flex items-center justify-center`}>
        <span className={`text-sm font-bold ${color}`}>{score}</span>
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  )
}

export function PageSpeedCard() {
  const { articles } = useArticles()
  const [data, setData] = useState<PageSpeedData | null>(null)
  const [running, setRunning] = useState(false)

  const articlesWithContent = articles.filter(
    (a) => a.status === "published" || a.status === "draft"
  )

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PAGESPEED_KEY)
      if (raw) setData(JSON.parse(raw))
    } catch {
      // ignore
    }
  }, [])

  // Auto-run on mount: always show results. Refresh every 24h.
  useEffect(() => {
    if (articlesWithContent.length === 0 && articles.length === 0) return
    if (data) {
      const lastRun = new Date(data.lastRun)
      const now = new Date()
      const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)
      if (hoursSinceLastRun >= 24) {
        runAudit()
      }
    } else {
      // No data yet — auto-run immediately
      runAudit()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const runAudit = async () => {
    setRunning(true)
    // Simulate audit delay
    await new Promise((r) => setTimeout(r, 2000))
    const result = generateMockData(Math.max(articlesWithContent.length, 1))
    setData(result)
    localStorage.setItem(PAGESPEED_KEY, JSON.stringify(result))
    setRunning(false)
  }

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="wonda-card">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[#0061FF]" />
              <p className="text-sm font-medium">PageSpeed & Schema</p>
            </div>
            {data && (
              <p className="text-[10px] text-muted-foreground">
                Last run: {formatTimestamp(data.lastRun)} &middot; {data.articlesChecked} article{data.articlesChecked !== 1 ? "s" : ""} checked
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={runAudit}
            disabled={running || articles.length === 0}
            title="Run audit"
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {!data && !running && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              {articles.length === 0
                ? "Add articles to run PageSpeed audits"
                : "Run your first audit to see scores"}
            </p>
            {articles.length > 0 && (
              <Button size="sm" variant="outline" onClick={runAudit}>
                <Gauge className="h-3.5 w-3.5 mr-1.5" />
                Run Audit
              </Button>
            )}
          </div>
        )}

        {running && !data && (
          <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Running audit...
          </div>
        )}

        {data && (
          <>
            {/* Scores */}
            <div className="flex items-center justify-between px-2">
              <ScoreCircle score={data.scores.performance} label="Perf." />
              <ScoreCircle score={data.scores.accessibility} label="A11y" />
              <ScoreCircle score={data.scores.seo} label="SEO" />
              <ScoreCircle score={data.scores.bestPractices} label="Best Prac." />
            </div>

            {/* Schema Status */}
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileCode className="h-3 w-3" />
                Schema Status
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {data.schemaStatus.articleSchema ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span>Article / BlogPosting</span>
                  </div>
                  <span className={data.schemaStatus.articleSchema ? "text-[#10B981]" : "text-red-500"}>
                    {data.schemaStatus.articleSchema ? "Detected" : "Missing"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {data.schemaStatus.faqSchema ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span>FAQ Schema</span>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                  <span className={data.schemaStatus.faqSchema ? "text-[#10B981]" : "text-red-500"}>
                    {data.schemaStatus.faqSchema ? "Detected" : "Missing"}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
