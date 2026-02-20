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
        <div className="glass rounded-lg p-4 text-sm text-amber-400/80 border border-amber-500/20">
          No webhook URLs configured. Go to{" "}
          <button
            onClick={() => navigate(ROUTES.SETTINGS)}
            className="underline underline-offset-2 hover:text-amber-300"
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
          accentColor="text-blue-400"
        />
        <SummaryCard
          label="AEO Health Score"
          value="78/100"
          icon={Activity}
          accentColor="text-emerald-400"
        />
        <SummaryCard
          label="Pending Exports"
          value={0}
          icon={Upload}
          accentColor="text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          title="Generate New Article"
          description="Create SEO-optimized content using your company intelligence and AI."
          icon={FilePlus}
          actionLabel="Generate"
          onAction={() => navigate(ROUTES.CONTENT_LIBRARY)}
          accentColor="from-purple-500/20 to-indigo-500/20"
        />
        <QuickActionCard
          title="Refresh Existing Content"
          description="Update and re-optimize your published articles for better rankings."
          icon={RefreshCw}
          actionLabel="Refresh"
          onAction={handleRefreshContent}
          accentColor="from-blue-500/20 to-cyan-500/20"
        />
        <QuickActionCard
          title="Update Company Intelligence"
          description="Keep your brand voice, keywords, and audience profile current."
          icon={Brain}
          actionLabel="Update"
          onAction={() => navigate(ROUTES.COMPANY_PROFILE)}
          accentColor="from-emerald-500/20 to-teal-500/20"
        />
      </div>
    </div>
  )
}
