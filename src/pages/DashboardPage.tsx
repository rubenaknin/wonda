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
  ArrowUpRight,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { QuickActionCard } from "@/components/dashboard/QuickActionCard"
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}{displayName ? `, ${displayName}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your content engine.
          </p>
        </div>
        <Button onClick={() => navigate(ROUTES.CONTENT_LIBRARY)}>
          <FilePlus className="h-4 w-4 mr-2" />
          New Article
        </Button>
      </div>

      {/* Trial Banner */}
      {isTrialActive && (
        <Card className="border-[#0061FF]/20 bg-gradient-to-r from-[#0061FF]/5 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0061FF]/10">
                <Sparkles className="h-4 w-4 text-[#0061FF]" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Trial &middot; {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining
                </p>
                <p className="text-xs text-muted-foreground">
                  {articlesRemaining} article{articlesRemaining !== 1 ? "s" : ""} left in your trial
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-[#0061FF]/30 text-[#0061FF] hover:bg-[#0061FF]/5"
              onClick={() => navigate(ROUTES.SETTINGS)}
            >
              Upgrade
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Profile Completion Banner */}
      {profileCompletion < 100 && (
        <Card className="border-[#F59E0B]/20 bg-gradient-to-r from-[#F59E0B]/5 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#F59E0B]/10">
                <Brain className="h-4 w-4 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Complete your company profile
                </p>
                <p className="text-xs text-muted-foreground">
                  {profileCompletion}% complete &middot; Better profiles generate better content
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/5"
              onClick={() => navigate(ROUTES.COMPANY_PROFILE)}
            >
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Articles"
          value={articles.length}
          subtitle={`${existingCount} legacy · ${wondaCount} Wonda${draftCount > 0 ? ` · ${draftCount} ready to publish` : ""}`}
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

      {/* Plan Info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-[10px] capitalize">
          {plan.tier} Plan
        </Badge>
        <span>&middot;</span>
        <span>
          {articlesRemaining === Infinity
            ? "Unlimited articles"
            : `${articlesRemaining} articles remaining this cycle`}
        </span>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="Generate New Article"
            description="Create SEO-optimized content using your company intelligence and AI."
            icon={FilePlus}
            actionLabel="Generate"
            onAction={() => navigate(ROUTES.CONTENT_LIBRARY)}
          />
          <QuickActionCard
            title="Refresh Existing Content"
            description="Update and re-optimize your published articles for better rankings."
            icon={RefreshCw}
            actionLabel="Refresh"
            onAction={handleRefreshContent}
          />
          <QuickActionCard
            title="Update Intelligence"
            description="Keep your brand voice, keywords, and audience profile current."
            icon={Brain}
            actionLabel="Update"
            onAction={() => navigate(ROUTES.COMPANY_PROFILE)}
          />
        </div>
      </div>
    </div>
  )
}
