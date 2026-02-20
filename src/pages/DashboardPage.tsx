import { useNavigate } from "react-router-dom"
import {
  FilePlus,
  RefreshCw,
  Brain,
  FileText,
  Activity,
  Upload,
} from "lucide-react"
import { QuickActionCard } from "@/components/dashboard/QuickActionCard"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { useWebhook } from "@/context/WebhookContext"
import { useArticles } from "@/context/ArticlesContext"
import { sendWebhook } from "@/lib/webhook"
import { ROUTES } from "@/lib/constants"

export function DashboardPage() {
  const navigate = useNavigate()
  const { webhookUrls, hasAnyWebhook } = useWebhook()
  const { articles } = useArticles()

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

      {!hasAnyWebhook && (
        <div className="wonda-card p-4 text-sm text-[#F59E0B] border-[#F59E0B]/20">
          No webhook URLs configured. Go to{" "}
          <button
            onClick={() => navigate(ROUTES.SETTINGS)}
            className="underline underline-offset-2 hover:text-[#F59E0B]/80"
          >
            Settings
          </button>{" "}
          to connect your n8n workflows.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Articles"
          value={articles.length}
          icon={FileText}
          accentColor="text-[#0061FF]"
        />
        <SummaryCard
          label="AEO Health Score"
          value="78/100"
          icon={Activity}
          accentColor="text-[#10B981]"
        />
        <SummaryCard
          label="Pending Exports"
          value={0}
          icon={Upload}
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
