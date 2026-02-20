import { useState, useRef } from "react"
import { toast } from "sonner"
import { Upload, FileText, X, Search, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useArticles } from "@/context/ArticlesContext"
import { useWebhook } from "@/context/WebhookContext"
import { sendWebhook } from "@/lib/webhook"
import type { Article } from "@/types"

interface ParsedKeyword {
  keyword: string
  selected: boolean
  analyzed?: boolean
  volume?: string
  difficulty?: string
}

interface CsvUploadPanelProps {
  onClose: () => void
}

export function CsvUploadPanel({ onClose }: CsvUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [keywords, setKeywords] = useState<ParsedKeyword[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { addArticle } = useArticles()
  const { webhookUrls } = useWebhook()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.split(",")[0]?.trim())
        .filter((kw) => kw && kw.length > 0)

      // Skip header row if it looks like a header
      const startIdx =
        lines[0]?.toLowerCase() === "keyword" ||
        lines[0]?.toLowerCase() === "keywords"
          ? 1
          : 0

      const parsed: ParsedKeyword[] = lines.slice(startIdx).map((kw) => ({
        keyword: kw,
        selected: true,
      }))

      if (parsed.length === 0) {
        toast.error("No keywords found in CSV")
        return
      }

      setKeywords(parsed)
      toast.success(`Parsed ${parsed.length} keywords from CSV`)
    }
    reader.readAsText(file)
  }

  const toggleKeyword = (index: number) => {
    setKeywords((prev) =>
      prev.map((kw, i) =>
        i === index ? { ...kw, selected: !kw.selected } : kw
      )
    )
  }

  const toggleAll = () => {
    const allSelected = keywords.every((kw) => kw.selected)
    setKeywords((prev) => prev.map((kw) => ({ ...kw, selected: !allSelected })))
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)

    const selected = keywords.filter((kw) => kw.selected)
    sendWebhook(webhookUrls.analyzeKeywords, "analyze_keywords", {
      keywords: selected.map((kw) => kw.keyword),
    })

    // Simulate analysis results
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setKeywords((prev) =>
      prev.map((kw) => {
        if (!kw.selected) return kw
        return {
          ...kw,
          analyzed: true,
          volume: `${Math.floor(Math.random() * 10000 + 100)}`,
          difficulty: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
        }
      })
    )

    setIsAnalyzing(false)
    toast.success("Keywords analyzed")
  }

  const handleAddToLibrary = () => {
    const selected = keywords.filter((kw) => kw.selected)
    if (selected.length === 0) {
      toast.error("No keywords selected")
      return
    }

    const now = new Date().toISOString()
    selected.forEach((kw) => {
      const newArticle: Article = {
        id: crypto.randomUUID(),
        title: kw.keyword,
        keyword: kw.keyword,
        slug: "",
        category: "blog",
        status: "pending",
        bodyHtml: "",
        faqHtml: "",
        faqItems: [],
        metaTitle: "",
        metaDescription: "",
        ctaText: "",
        ctaUrl: "",
        internalLinks: [],
        selectedQuestions: [],
        createdAt: now,
        updatedAt: now,
      }
      addArticle(newArticle)
    })

    toast.success(`Added ${selected.length} keywords to Content Library`)
    onClose()
  }

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          CSV Keyword Upload
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {keywords.length === 0 ? (
          <div
            className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center cursor-pointer hover:border-white/20 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">Drop a CSV file or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              First column should contain keywords, one per row
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {keywords.filter((kw) => kw.selected).length} of{" "}
                {keywords.length} keywords selected
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  <Search className="h-3 w-3 mr-1" />
                  {isAnalyzing ? "Analyzing..." : "Analyze First"}
                </Button>
                <Button size="sm" onClick={handleAddToLibrary}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Selected
                </Button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border border-white/5">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={keywords.every((kw) => kw.selected)}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Keyword</TableHead>
                    {keywords.some((kw) => kw.analyzed) && (
                      <>
                        <TableHead>Volume</TableHead>
                        <TableHead>Difficulty</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywords.map((kw, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell>
                        <Checkbox
                          checked={kw.selected}
                          onCheckedChange={() => toggleKeyword(i)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {kw.keyword}
                      </TableCell>
                      {keywords.some((k) => k.analyzed) && (
                        <>
                          <TableCell className="text-sm text-muted-foreground">
                            {kw.volume || "—"}
                          </TableCell>
                          <TableCell>
                            {kw.difficulty ? (
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  kw.difficulty === "Low"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : kw.difficulty === "Medium"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {kw.difficulty}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
