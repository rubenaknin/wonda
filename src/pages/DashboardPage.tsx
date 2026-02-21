import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  FilePlus,
  RefreshCw,
  Brain,
  FileText,
  TrendingUp,
  Globe,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { PageSpeedCard } from "@/components/dashboard/PageSpeedCard"
import { useArticles } from "@/context/ArticlesContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { useWebhook } from "@/context/WebhookContext"
import { usePlan } from "@/context/PlanContext"
import { useAuth } from "@/context/AuthContext"
import { sendWebhook } from "@/lib/webhook"
import { ROUTES } from "@/lib/constants"
import { readGscData, writeGscData } from "@/lib/firestore"
import type { GscData } from "@/types"

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`
  return String(n)
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { webhookUrls } = useWebhook()
  const { articles } = useArticles()
  const { profile, updateProfile, profileCompletion } = useCompanyProfile()
  const { plan, articlesRemaining, isTrialActive, trialDaysRemaining } = usePlan()
  const { user } = useAuth()

  const draftCount = articles.filter((a) => a.status === "draft").length
  const existingCount = articles.filter((a) => a.origin !== "wonda").length
  const wondaCount = articles.filter((a) => a.origin === "wonda").length

  // Stale Wonda articles (older than 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const staleWondaCount = articles.filter(
    (a) => a.origin === "wonda" && new Date(a.updatedAt) < thirtyDaysAgo
  ).length

  // Refresh description logic
  const refreshDescription = (() => {
    if (wondaCount === 0 && existingCount > 0) {
      return `${existingCount} existing article${existingCount !== 1 ? "s" : ""} ready to refresh`
    }
    if (staleWondaCount > 0) {
      return `${staleWondaCount} article${staleWondaCount !== 1 ? "s" : ""} older than 30 days`
    }
    if (existingCount > 0) {
      return `${existingCount} legacy article${existingCount !== 1 ? "s" : ""} to optimize`
    }
    return "Re-optimize published articles for better rankings"
  })()

  const [gscData, setGscData] = useState<GscData | null>(null)

  useEffect(() => {
    if (!user?.uid || !profile.gscConnected) return
    readGscData(user.uid).then((data) => {
      if (data) setGscData(data)
    }).catch(() => {})
  }, [user?.uid, profile.gscConnected])

  const handleRefreshContent = async () => {
    await sendWebhook(webhookUrls.generateArticle, "refresh_content", {})
  }

  const handleConnectGsc = () => {
    updateProfile({
      gscConnected: true,
      gscPropertyUrl: profile.websiteUrl || "https://example.com",
    })
    const defaultData: GscData = {
      nonBrandedClicks: 12450,
      nonBrandedImpressions: 234000,
      blogClicks: 8230,
      blogImpressions: 156000,
      lastUpdated: new Date().toISOString(),
    }
    if (user?.uid) {
      writeGscData(user.uid, defaultData).catch(() => {})
    }
    setGscData(defaultData)
    toast.success("Google Search Console connected")
  }

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  })()

  const displayName = user?.displayName?.split(" ")[0] || ""

  return (
    <div className="space-y-6">
      {/* Header — clean, no button */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}{displayName ? `, ${displayName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here's what's happening with your content engine.
        </p>
      </div>

      {/* Row 1: Action cards — compact horizontal row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Complete profile (conditional) or Generate first/new article */}
        {profileCompletion < 100 ? (
          <Card
            className="wonda-card group cursor-pointer border-[#F59E0B]/30 hover:border-[#F59E0B]/50 hover:shadow-md transition-all"
            onClick={() => navigate(ROUTES.COMPANY_PROFILE)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#F59E0B]/10 shrink-0">
                <UserCheck className="h-4 w-4 text-[#F59E0B]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">Complete Profile</p>
                <p className="text-xs text-muted-foreground">{profileCompletion}% done</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </CardContent>
          </Card>
        ) : null}

        {/* Generate */}
        <Card
          className="wonda-card group cursor-pointer border-[#0061FF]/20 hover:border-[#0061FF]/40 hover:shadow-md transition-all"
          onClick={() => navigate(ROUTES.CONTENT_LIBRARY)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#0061FF]/10 shrink-0">
              <FilePlus className="h-4 w-4 text-[#0061FF]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {articles.length === 0 ? "First Article" : "New Article"}
              </p>
              <p className="text-xs text-muted-foreground">AI-powered SEO content</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
          </CardContent>
        </Card>

        {/* Refresh (always show) */}
        <Card
          className={`wonda-card group cursor-pointer hover:shadow-md transition-all ${
            existingCount > 0 || staleWondaCount > 0
              ? "border-[#F59E0B]/20 hover:border-[#F59E0B]/40"
              : "hover:border-border/80"
          }`}
          onClick={existingCount > 0 || staleWondaCount > 0 ? handleRefreshContent : () => navigate(ROUTES.CONTENT_LIBRARY)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${
              existingCount > 0 || staleWondaCount > 0 ? "bg-[#F59E0B]/10" : "bg-muted"
            }`}>
              <RefreshCw className={`h-4 w-4 ${
                existingCount > 0 || staleWondaCount > 0 ? "text-[#F59E0B]" : "text-muted-foreground"
              }`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">Refresh Content</p>
              <p className="text-xs text-muted-foreground truncate">{refreshDescription}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
          </CardContent>
        </Card>

        {/* Intelligence */}
        <Card
          className="wonda-card group cursor-pointer hover:border-[#8B5CF6]/40 hover:shadow-md transition-all"
          onClick={() => navigate(ROUTES.COMPANY_PROFILE)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#8B5CF6]/10 shrink-0">
              <Brain className="h-4 w-4 text-[#8B5CF6]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">Intelligence</p>
              <p className="text-xs text-muted-foreground">Brand voice & strategy</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Metrics + PageSpeed side by side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard
          label="Total Articles"
          value={articles.length}
          subtitle={`${existingCount} legacy · ${wondaCount} Wonda${draftCount > 0 ? ` · ${draftCount} drafts` : ""}`}
          icon={FileText}
          accentColor="text-[#0061FF]"
        />
        <SummaryCard
          label="Non-Branded Organic Traffic"
          value={
            profile.gscConnected && gscData
              ? formatCompact(gscData.nonBrandedClicks)
              : "—"
          }
          subtitle={
            profile.gscConnected && gscData
              ? `${formatCompact(gscData.nonBrandedImpressions)} impressions`
              : undefined
          }
          icon={TrendingUp}
          accentColor="text-[#10B981]"
        >
          {!profile.gscConnected && (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={handleConnectGsc}
            >
              <Globe className="h-3.5 w-3.5 mr-1.5" />
              Connect Google Search Console
            </Button>
          )}
        </SummaryCard>
        <PageSpeedCard />
      </div>

      {/* Row 3: Plan info + trial */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-[10px] capitalize">
            {plan.tier} Plan
          </Badge>
          <span>&middot;</span>
          <span>
            {articlesRemaining === Infinity
              ? "Unlimited articles"
              : `${articlesRemaining} articles remaining`}
          </span>
        </div>
        {isTrialActive && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 text-xs text-[#0061FF]">
              <Sparkles className="h-3 w-3" />
              <span className="font-medium">
                {trialDaysRemaining}d left &middot; {articlesRemaining} article{articlesRemaining !== 1 ? "s" : ""}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-[#0061FF]/30 text-[#0061FF] hover:bg-[#0061FF]/5"
              onClick={() => navigate(ROUTES.SETTINGS)}
            >
              Upgrade
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
