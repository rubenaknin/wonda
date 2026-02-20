import { useState, useRef } from "react"
import { toast } from "sonner"
import { Upload, FileText, X, Search, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

type UploadMode = "choose" | "csv" | "keywords"

const MAPPABLE_FIELDS = [
  { key: "keyword", label: "Keyword" },
  { key: "title", label: "Title" },
  { key: "slug", label: "Slug" },
  { key: "metaTitle", label: "Meta Title" },
  { key: "metaDescription", label: "Meta Description" },
  { key: "skip", label: "— Skip —" },
] as const

type MappableField = (typeof MAPPABLE_FIELDS)[number]["key"]

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

function autoMapHeader(header: string): MappableField {
  const h = header.toLowerCase().trim()
  if (h === "keyword" || h === "keywords" || h === "target keyword") return "keyword"
  if (h === "title" || h === "page title" || h === "article title") return "title"
  if (h === "slug" || h === "url slug") return "slug"
  if (h === "meta title" || h === "metatitle" || h === "seo title") return "metaTitle"
  if (h === "meta description" || h === "metadescription" || h === "seo description" || h === "description") return "metaDescription"
  return "skip"
}

export function CsvUploadPanel({ onClose }: CsvUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<UploadMode>("choose")
  const [keywords, setKeywords] = useState<ParsedKeyword[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { addArticle } = useArticles()
  const { webhookUrls } = useWebhook()

  // CSV mapping state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [columnMapping, setColumnMapping] = useState<MappableField[]>([])

  // Keywords paste state
  const [keywordText, setKeywordText] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)

      if (lines.length < 1) {
        toast.error("CSV file is empty")
        return
      }

      // Parse headers and rows
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""))
      const rows = lines.slice(1).map((line) =>
        line.split(",").map((cell) => cell.trim().replace(/^["']|["']$/g, ""))
      )

      // Auto-map columns
      const mapping = headers.map(autoMapHeader)

      // If no keyword column found, map first column to keyword
      if (!mapping.includes("keyword") && mapping.length > 0) {
        mapping[0] = "keyword"
      }

      setCsvHeaders(headers)
      setCsvRows(rows)
      setColumnMapping(mapping)

      toast.success(`Parsed ${rows.length} rows with ${headers.length} columns`)
    }
    reader.readAsText(file)
  }

  const handleImportCsv = () => {
    const keywordIdx = columnMapping.indexOf("keyword")
    if (keywordIdx === -1) {
      toast.error("Please map at least one column to Keyword")
      return
    }

    const titleIdx = columnMapping.indexOf("title")
    const slugIdx = columnMapping.indexOf("slug")
    const metaTitleIdx = columnMapping.indexOf("metaTitle")
    const metaDescIdx = columnMapping.indexOf("metaDescription")

    const now = new Date().toISOString()
    let count = 0

    for (const row of csvRows) {
      const keyword = row[keywordIdx]?.trim()
      if (!keyword) continue

      const newArticle: Article = {
        id: crypto.randomUUID(),
        title: (titleIdx >= 0 ? row[titleIdx]?.trim() : "") || keyword,
        keyword,
        slug: slugIdx >= 0 ? row[slugIdx]?.trim() || "" : "",
        category: "blog",
        status: "pending",
        bodyHtml: "",
        faqHtml: "",
        faqItems: [],
        metaTitle: metaTitleIdx >= 0 ? row[metaTitleIdx]?.trim() || "" : "",
        metaDescription: metaDescIdx >= 0 ? row[metaDescIdx]?.trim() || "" : "",
        ctaText: "",
        ctaUrl: "",
        internalLinks: [],
        selectedQuestions: [],
        createdAt: now,
        updatedAt: now,
      }
      addArticle(newArticle)
      count++
    }

    toast.success(`Added ${count} articles to Content Library`)
    onClose()
  }

  const handleAddKeywords = () => {
    const lines = keywordText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length === 0) {
      toast.error("No keywords entered")
      return
    }

    setKeywords(lines.map((kw) => ({ keyword: kw, selected: true })))
    setKeywordText("")
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
    <Card className="wonda-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Keywords
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode chooser */}
        {mode === "choose" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              className="text-left rounded-lg border-2 border-dashed border-border p-6 hover:border-[#0061FF]/30 transition-colors space-y-2"
              onClick={() => setMode("csv")}
            >
              <FileText className="h-6 w-6 text-[#0061FF]" />
              <p className="text-sm font-medium">Upload CSV</p>
              <p className="text-xs text-muted-foreground">
                Import from a CSV file with automatic field mapping
              </p>
            </button>
            <button
              className="text-left rounded-lg border-2 border-dashed border-border p-6 hover:border-[#0061FF]/30 transition-colors space-y-2"
              onClick={() => setMode("keywords")}
            >
              <Plus className="h-6 w-6 text-[#0061FF]" />
              <p className="text-sm font-medium">Paste Keywords</p>
              <p className="text-xs text-muted-foreground">
                Add keywords manually, one per line
              </p>
            </button>
          </div>
        )}

        {/* CSV Upload Mode */}
        {mode === "csv" && csvHeaders.length === 0 && (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setMode("choose")} className="mb-3 -ml-2 text-muted-foreground">
              &larr; Back
            </Button>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-[#0061FF]/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Drop a CSV file or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Columns will be auto-mapped to article fields
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {/* CSV Column Mapping */}
        {mode === "csv" && csvHeaders.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-1">Column Mapping</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Map your CSV columns to article fields. We've auto-mapped what we could.
              </p>
              <div className="space-y-2">
                {csvHeaders.map((header, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-40 truncate" title={header}>
                      {header}
                    </span>
                    <span className="text-muted-foreground text-xs">&rarr;</span>
                    <Select
                      value={columnMapping[i] || "skip"}
                      onValueChange={(v) => {
                        setColumnMapping((prev) => {
                          const next = [...prev]
                          next[i] = v as MappableField
                          return next
                        })
                      }}
                    >
                      <SelectTrigger className="w-48 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAPPABLE_FIELDS.map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {csvRows.length} row{csvRows.length !== 1 ? "s" : ""} found
            </div>

            {/* Preview first 3 rows */}
            {csvRows.length > 0 && (
              <div className="max-h-40 overflow-auto rounded-lg border border-border text-xs">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      {csvHeaders.map((h, i) => (
                        <TableHead key={i} className="text-xs py-1 px-2">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvRows.slice(0, 3).map((row, ri) => (
                      <TableRow key={ri} className="border-border">
                        {row.map((cell, ci) => (
                          <TableCell key={ci} className="py-1 px-2 text-xs">
                            {cell || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setCsvHeaders([]); setCsvRows([]); setColumnMapping([]) }}>
                Re-upload
              </Button>
              <Button size="sm" onClick={handleImportCsv}>
                <Plus className="h-3 w-3 mr-1" />
                Import {csvRows.length} Row{csvRows.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* Keywords Paste Mode */}
        {mode === "keywords" && keywords.length === 0 && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setMode("choose")} className="-ml-2 text-muted-foreground">
              &larr; Back
            </Button>
            <div className="space-y-2">
              <Label htmlFor="keyword-paste">Keywords (one per line)</Label>
              <Textarea
                id="keyword-paste"
                value={keywordText}
                onChange={(e) => setKeywordText(e.target.value)}
                placeholder={"best project management software\nhow to manage remote teams\nproject management tools comparison"}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAddKeywords}
                disabled={!keywordText.trim()}
              >
                <Plus className="h-3 w-3 mr-1" />
                Parse Keywords
              </Button>
            </div>
          </div>
        )}

        {/* Keyword list (after paste or CSV single-column) */}
        {mode === "keywords" && keywords.length > 0 && (
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

            <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
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
                    <TableRow key={i} className="border-border">
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
                                    ? "bg-[#10B981]/10 text-[#10B981]"
                                    : kw.difficulty === "Medium"
                                      ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                                      : "bg-red-50 text-red-500"
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
