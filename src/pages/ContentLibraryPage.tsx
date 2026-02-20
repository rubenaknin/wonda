import { useState } from "react"
import { Plus, Upload, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useArticles } from "@/context/ArticlesContext"
import { usePlan } from "@/context/PlanContext"
import { EmptyState } from "@/components/content-library/EmptyState"
import { ArticleTable } from "@/components/content-library/ArticleTable"
import { InlineArticleWizard } from "@/components/article-wizard/InlineArticleWizard"
import { CsvUploadPanel } from "@/components/content-library/CsvUploadPanel"
import { KeywordResearchPanel } from "@/components/content-library/KeywordResearchPanel"
import type { WizardStep } from "@/types"

type PanelMode =
  | { type: "wizard"; articleId?: string; startStep?: WizardStep }
  | { type: "csv" }
  | { type: "research" }
  | null

export function ContentLibraryPage() {
  const { articles } = useArticles()
  const { isGrowthOrAbove } = usePlan()
  const [panel, setPanel] = useState<PanelMode>(null)

  const handleCreateArticle = () => {
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

      {!panel && articles.length === 0 ? (
        <EmptyState onCreateArticle={handleCreateArticle} />
      ) : !panel ? (
        <ArticleTable onEditArticle={handleEditArticle} />
      ) : null}
    </div>
  )
}
