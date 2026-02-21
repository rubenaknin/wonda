import { useState } from "react"
import { toast } from "sonner"
import {
  MoreHorizontal,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SeoTooltip } from "@/components/shared/SeoTooltip"
import { useWebhook } from "@/context/WebhookContext"
import { useArticles } from "@/context/ArticlesContext"
import { sendWebhook } from "@/lib/webhook"
import { formatRelativeTime } from "@/lib/date"
import type { Article, ArticleStatus, WizardStep } from "@/types"

const STATUS_STYLES: Record<ArticleStatus, string> = {
  pending: "bg-slate-100 text-slate-500",
  draft: "bg-[#0061FF]/10 text-[#0061FF]",
  published: "bg-[#10B981]/10 text-[#10B981]",
  generating: "bg-[#F59E0B]/10 text-[#F59E0B] animate-pulse",
  error: "bg-red-50 text-red-500",
  archived: "bg-slate-100 text-slate-400",
}

interface ArticleTableProps {
  filteredArticles: Article[]
  onEditArticle: (articleId: string, startStep?: WizardStep) => void
}

export function ArticleTable({ filteredArticles, onEditArticle }: ArticleTableProps) {
  const { deleteArticle } = useArticles()
  const { webhookUrls } = useWebhook()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredArticles.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredArticles.map((a) => a.id)))
    }
  }

  const handleRefreshAeo = async (article: Article) => {
    const result = await sendWebhook(webhookUrls.generateArticle, "refresh_aeo", {
      articleId: article.id,
      keyword: article.keyword,
      currentFaqHtml: article.faqHtml,
    })
    if (result.success) {
      toast.success(`AEO refresh triggered for "${article.title}"`)
    } else {
      toast.error(result.error ?? "Failed to trigger AEO refresh")
    }
  }

  const handleExportSelected = async () => {
    const selected = filteredArticles.filter((a) => selectedIds.has(a.id))
    if (selected.length === 0) {
      toast.error("No articles selected")
      return
    }
    const result = await sendWebhook(webhookUrls.generateArticle, "export_sheets", {
      articles: selected.map((a) => ({
        title: a.title,
        slug: a.slug,
        keyword: a.keyword,
        bodyHtml: a.bodyHtml,
        metaTitle: a.metaTitle,
        metaDescription: a.metaDescription,
      })),
    })
    if (result.success) {
      toast.success("Exported to Google Sheets", {
        description: "View your spreadsheet (mock link)",
      })
    } else {
      toast.error(result.error ?? "Export failed")
    }
    setSelectedIds(new Set())
  }

  const getResumeStep = (article: Article): WizardStep => {
    if (!article.slug) return "slug"
    if (!article.category) return "category"
    if (!article.bodyHtml) return "generate"
    return "editor"
  }

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0061FF]/5 border border-[#0061FF]/20">
          <span className="text-sm">
            {selectedIds.size} article{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <Button size="sm" variant="secondary" onClick={handleExportSelected}>
            <Upload className="h-4 w-4 mr-1" />
            Export Selected
          </Button>
        </div>
      )}

      <div className="wonda-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    filteredArticles.length > 0 && selectedIds.size === filteredArticles.length
                  }
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>
                <SeoTooltip term="keyword">Keyword</SeoTooltip>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredArticles.map((article) => (
              <TableRow
                key={article.id}
                className="border-border cursor-pointer"
                onClick={() => onEditArticle(article.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(article.id)}
                    onCheckedChange={() => toggleSelect(article.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {article.title || article.keyword}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {article.keyword}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {article.category.replace("-", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      article.source === "sitemap"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {article.source === "sitemap" ? "Sitemap" : "New"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {article.contentPath || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-xs capitalize ${STATUS_STYLES[article.status]}`}
                  >
                    {article.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatRelativeTime(article.updatedAt)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {article.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[#10B981] hover:text-[#10B981]/80"
                        title="Continue generation"
                        onClick={() =>
                          onEditArticle(article.id, getResumeStep(article))
                        }
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {(article.status === "draft" ||
                      article.status === "published") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[#0061FF] hover:text-[#0061FF]/80"
                        title="Refresh article"
                        onClick={() => onEditArticle(article.id, "generate")}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onEditArticle(article.id)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {article.bodyHtml && (
                          <DropdownMenuItem
                            onClick={() => handleRefreshAeo(article)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            <SeoTooltip term="aeo">Refresh AEO</SeoTooltip>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            deleteArticle(article.id)
                            toast.success("Article deleted")
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
