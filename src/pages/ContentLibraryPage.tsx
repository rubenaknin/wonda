import { useState, useEffect, useRef } from "react"
import { useArticles } from "@/context/ArticlesContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { usePlan } from "@/context/PlanContext"
import { SpreadsheetTable } from "@/components/content-library/SpreadsheetTable"
import { InlineArticleWizard } from "@/components/article-wizard/InlineArticleWizard"
import { UpgradeModal } from "@/components/plan/UpgradeModal"
import { CsvUploadPanel } from "@/components/content-library/CsvUploadPanel"
import { KeywordResearchPanel } from "@/components/content-library/KeywordResearchPanel"
import { parseSitemapUrls } from "@/lib/sitemap"
import type { WizardStep } from "@/types"

type PanelMode =
  | { type: "wizard"; articleId?: string; startStep?: WizardStep }
  | { type: "csv" }
  | { type: "research" }
  | null

export function ContentLibraryPage() {
  const { articles, addArticle } = useArticles()
  const { profile } = useCompanyProfile()
  const { canGenerate } = usePlan()
  const [panel, setPanel] = useState<PanelMode>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const sitemapLoaded = useRef(false)

  // Load sitemap articles on mount
  useEffect(() => {
    if (sitemapLoaded.current) return
    if (profile.contentPaths.length === 0) return
    const hasSitemapArticles = articles.some((a) => a.source === "sitemap")
    if (hasSitemapArticles) return

    sitemapLoaded.current = true
    const sitemapArticles = parseSitemapUrls(profile.contentPaths)
    for (const article of sitemapArticles) {
      addArticle(article)
    }
  }, [profile.contentPaths, articles, addArticle])

  const handleCreateArticle = () => {
    if (!canGenerate) {
      setShowUpgradeModal(true)
      return
    }
    setPanel({ type: "wizard" })
  }

  const handleEditArticle = (articleId: string, startStep?: WizardStep) => {
    setPanel({ type: "wizard", articleId, startStep })
  }

  const handleClosePanel = () => {
    setPanel(null)
  }

  return (
    <div className="space-y-3">
      {/* Subtle header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Content Library
        </h1>
      </div>

      {panel?.type === "wizard" && (
        <InlineArticleWizard
          editArticleId={panel.articleId}
          startStep={panel.startStep}
          onClose={handleClosePanel}
        />
      )}

      {panel?.type === "csv" && <CsvUploadPanel onClose={handleClosePanel} />}

      {panel?.type === "research" && (
        <KeywordResearchPanel onClose={handleClosePanel} />
      )}

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      {!panel && (
        <SpreadsheetTable
          articles={articles}
          onEditArticle={handleEditArticle}
          onOpenUpload={() => setPanel({ type: "csv" })}
          onNewArticle={handleCreateArticle}
        />
      )}
    </div>
  )
}
