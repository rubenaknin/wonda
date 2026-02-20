import { useNavigate } from "react-router-dom"
import {
  FilePlus,
  RefreshCw,
  Brain,
  FileText,
  TrendingUp,
  CheckCircle,
} from "lucide-react"
import { QuickActionCard } from "@/components/dashboard/QuickActionCard"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { useArticles } from "@/context/ArticlesContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { useWebhook } from "@/context/WebhookContext"
import { sendWebhook } from "@/lib/webhook"
import { ROUTES, STORAGE_KEYS } from "@/lib/constants"
import type { GscData } from "@/types"

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`
  return String(n)
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { webhookUrls } = useWebhook()
  const { articles } = useArticles()
  const { profile } = useCompanyProfile()

  const draftCount = articles.filter((a) => a.status === "draft").length

  // Read GSC data from localStorage
  let gscData: GscData | null = null
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GSC_DATA)
    if (raw) gscData = JSON.parse(raw)
  } catch {
    // ignore
  }

  const handleRefreshContent = async () => {
    await sendWebhook(webhookUrls.generateArticle, "refresh_content", {})
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to Wonda. Choose a quick action to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Articles"
          value={articles.length}
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
          icon={TrendingUp}
          accentColor="text-[#10B981]"
        />
        <SummaryCard
          label="Articles Ready to Publish"
          value={draftCount}
          icon={CheckCircle}
          accentColor="text-[#F59E0B]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          title="Update Company Intelligence"
          description="Keep your brand voice, keywords, and audience profile current."
          icon={Brain}
          actionLabel="Update"
          onAction={() => navigate(ROUTES.COMPANY_PROFILE)}
        />
      </div>
    </div>
  )
}
