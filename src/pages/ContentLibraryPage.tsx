import { useState, useEffect, useMemo, useRef } from "react"
import { Plus, Upload, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useArticles } from "@/context/ArticlesContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import { usePlan } from "@/context/PlanContext"
import { EmptyState } from "@/components/content-library/EmptyState"
import { ArticleTable } from "@/components/content-library/ArticleTable"
import { InlineArticleWizard } from "@/components/article-wizard/InlineArticleWizard"
import { UpgradeModal } from "@/components/plan/UpgradeModal"
import { CsvUploadPanel } from "@/components/content-library/CsvUploadPanel"
import { KeywordResearchPanel } from "@/components/content-library/KeywordResearchPanel"
import { ContentFilters, type FilterState } from "@/components/content-library/ContentFilters"
import { parseSitemapUrls } from "@/lib/sitemap"
import type { WizardStep } from "@/types"

type PanelMode =
  | { type: "wizard"; articleId?: string; startStep?: WizardStep }
  | { type: "csv" }
  | { type: "research" }
  | null

const defaultFilters: FilterState = {
  search: "",
  source: "all",
  contentPath: "all",
  status: "all",
  category: "all",
}

export function ContentLibraryPage() {
  const { articles, addArticle } = useArticles()
  const { profile } = useCompanyProfile()
  const { isGrowthOrAbove, canGenerate } = usePlan()
  const [panel, setPanel] = useState<PanelMode>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const sitemapLoaded = useRef(false)

  // Load sitemap articles on mount if content sitemap URLs are configured
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

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300)
    return () => clearTimeout(timer)
  }, [filters.search])

  // Filter articles
  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase()
        const matches =
          a.title.toLowerCase().includes(q) ||
          a.keyword.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (filters.source !== "all") {
        const articleSource = a.source ?? "new"
        if (articleSource !== filters.source) return false
      }
      if (filters.contentPath !== "all") {
        if (a.contentPath !== filters.contentPath) return false
      }
      if (filters.status !== "all") {
        if (a.status !== filters.status) return false
      }
      if (filters.category !== "all") {
        if (a.category !== filters.category) return false
      }
      return true
    })
  }, [articles, debouncedSearch, filters.source, filters.contentPath, filters.status, filters.category])

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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Content Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage your generated content.
          </p>
        </div>
        {!panel && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPanel({ type: "csv" })}>
              <Upload className="h-4 w-4 mr-1" />
              Upload CSV
            </Button>
            {isGrowthOrAbove && (
              <Button
                variant="outline"
                onClick={() => setPanel({ type: "research" })}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Research Keywords
                <Badge className="ml-1.5 text-[9px] px-1 py-0 bg-[#0061FF]/10 text-[#0061FF]">
                  Growth
                </Badge>
              </Button>
            )}
            <Button onClick={handleCreateArticle}>
              <Plus className="h-4 w-4 mr-1" />
              New Article
            </Button>
          </div>
        )}
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

      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

      {!panel && articles.length === 0 ? (
        <EmptyState onCreateArticle={handleCreateArticle} />
      ) : !panel ? (
        <>
          <ContentFilters
            filters={filters}
            onFiltersChange={setFilters}
            contentPaths={profile.contentPaths}
          />
          <ArticleTable
            filteredArticles={filteredArticles}
            onEditArticle={handleEditArticle}
          />
        </>
      ) : null}
    </div>
  )
}
