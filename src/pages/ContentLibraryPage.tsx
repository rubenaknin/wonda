import { useState, useEffect, useRef, useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useArticles } from "@/context/ArticlesContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { usePlan } from "@/context/PlanContext"
import { useWebhook } from "@/context/WebhookContext"
import { sendWebhook } from "@/lib/webhook"
import { SpreadsheetTable } from "@/components/content-library/SpreadsheetTable"
import { InlineArticleWizard } from "@/components/article-wizard/InlineArticleWizard"
import { UpgradeModal } from "@/components/plan/UpgradeModal"
import { ArticlePreviewModal } from "@/components/content-library/ArticlePreviewModal"
import { CsvUploadPanel } from "@/components/content-library/CsvUploadPanel"
import { KeywordResearchPanel } from "@/components/content-library/KeywordResearchPanel"
import { parseSitemapUrls } from "@/lib/sitemap"
import { useChat } from "@/context/ChatContext"
import type { ChatCommand } from "@/lib/chat/types"
import type { WizardStep } from "@/types"

type PanelMode =
  | { type: "wizard"; articleId?: string; startStep?: WizardStep; skipPreSteps?: boolean }
  | { type: "csv" }
  | { type: "research" }
  | null

export function ContentLibraryPage() {
  const { articles, addArticle, getArticleById, updateArticle } = useArticles()
  const { profile } = useCompanyProfile()
  const { canGenerate } = usePlan()
  const { commandBus, setSidebarOpen } = useChat()
  const { webhookUrls } = useWebhook()
  const location = useLocation()
  const navigate = useNavigate()
  const [panel, setPanel] = useState<PanelMode>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [previewArticleId, setPreviewArticleId] = useState<string | null>(null)
  const sitemapLoaded = useRef(false)

  // Close sidebar chat on this page — Content Library needs full width
  useEffect(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  // Handle commands passed via navigation state (from AppLayout global handler)
  useEffect(() => {
    const cmd = (location.state as { chatCommand?: ChatCommand })?.chatCommand
    if (cmd) {
      handleChatCommand(cmd)
      // Clear the state so it doesn't re-trigger
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state]) // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to chat command bus
  const handleChatCommand = useCallback(
    (command: ChatCommand) => {
      if (command.type === "open_article_wizard") {
        const startStep = (command.payload.startStep as WizardStep) || undefined
        setPanel({ type: "wizard", articleId: command.payload.articleId, startStep })
      } else if (command.type === "open_article_preview") {
        setPreviewArticleId(command.payload.articleId)
      }
    },
    []
  )

  useEffect(() => {
    return commandBus.subscribe(handleChatCommand)
  }, [commandBus, handleChatCommand])

  // Load sitemap articles on mount
  useEffect(() => {
    if (sitemapLoaded.current) return
    if (profile.contentSitemapUrls.length === 0) return
    const hasSitemapArticles = articles.some((a) => a.source === "sitemap")
    if (hasSitemapArticles) return

    sitemapLoaded.current = true
    parseSitemapUrls(profile.contentSitemapUrls).then((sitemapArticles) => {
      for (const article of sitemapArticles) {
        addArticle(article)
      }
    })
  }, [profile.contentSitemapUrls, articles, addArticle])

  const handleEditArticle = (articleId: string, startStep?: WizardStep) => {
    setPanel({ type: "wizard", articleId, startStep })
  }

  const handleGenerateArticle = (articleId: string) => {
    if (!canGenerate) {
      setShowUpgradeModal(true)
      return
    }

    const article = getArticleById(articleId)
    if (article) {
      const updates: Record<string, string> = {}
      if (!article.slug && article.keyword) {
        updates.slug = article.keyword
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      }
      if (!article.title && article.keyword) {
        updates.title = article.keyword
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      }
      if (!article.category) {
        updates.category = "blog"
      }
      if (Object.keys(updates).length > 0) {
        updateArticle(articleId, updates)
      }
    }

    setPanel({ type: "wizard", articleId, startStep: "generate", skipPreSteps: true })
  }

  const handlePreviewArticle = (articleId: string) => {
    setPreviewArticleId(articleId)
  }

  const handleBulkGenerate = useCallback(
    (articleIds: string[]) => {
      for (const id of articleIds) {
        const article = getArticleById(id)
        if (article) {
          updateArticle(id, { status: "generating" })
          sendWebhook(webhookUrls.generateArticle, "generate_article", {
            articleId: id,
            keyword: article.keyword,
            slug: article.slug || article.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            category: article.category || "blog",
          })
        }
      }
      toast.success(`Generation started for ${articleIds.length} article${articleIds.length !== 1 ? "s" : ""}`)
    },
    [getArticleById, updateArticle, webhookUrls.generateArticle]
  )

  const handleBulkRefresh = useCallback(
    (articleIds: string[]) => {
      for (const id of articleIds) {
        const article = getArticleById(id)
        if (article) {
          updateArticle(id, { status: "generating" })
          sendWebhook(webhookUrls.generateArticle, "refresh_aeo", {
            articleId: id,
            keyword: article.keyword,
          })
        }
      }
      toast.success(`Refresh started for ${articleIds.length} article${articleIds.length !== 1 ? "s" : ""}`)
    },
    [getArticleById, updateArticle, webhookUrls.generateArticle]
  )

  const handleClosePanel = () => {
    setPanel(null)
  }

  const previewArticle = previewArticleId ? getArticleById(previewArticleId) ?? null : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Content Library
        </h1>
      </div>

      {panel?.type === "wizard" && (
        <InlineArticleWizard
          editArticleId={panel.articleId}
          startStep={panel.startStep}
          skipPreSteps={panel.skipPreSteps}
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

      <ArticlePreviewModal
        article={previewArticle}
        open={Boolean(previewArticleId)}
        onClose={() => setPreviewArticleId(null)}
      />

      {!panel && (
        <SpreadsheetTable
          articles={articles}
          onEditArticle={handleEditArticle}
          onOpenUpload={() => setPanel({ type: "csv" })}
          onGenerateArticle={handleGenerateArticle}
          onPreviewArticle={handlePreviewArticle}
          onBulkGenerate={handleBulkGenerate}
          onBulkRefresh={handleBulkRefresh}
        />
      )}
    </div>
  )
}
