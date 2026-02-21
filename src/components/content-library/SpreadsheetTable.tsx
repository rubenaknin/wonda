import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type ColumnSizingState,
} from "@tanstack/react-table"
import {
  Filter,
  ArrowUpDown,
  Columns3,
  Plus,
  Download,
  Upload,
  Play,
  Pencil,
  RefreshCw,
  Send,
  X,
  Search,
  Eye,
  EyeOff,
  GripVertical,
  Sparkles,
  Trash2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useArticles } from "@/context/ArticlesContext"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
// formatRelativeTime no longer used — dates are now editable date inputs
import {
  FilterModal,
  matchesFilterGroup,
  type FilterGroup,
} from "./FilterModal"
import type { Article, ArticleStatus, WizardStep, CompanyProfile } from "@/types"

// ── Ranking type options ────────────────────────────────────
const RANKING_TYPE_OPTIONS = ["SEO/LLM", "Leadership", "Thought Leadership", "Product", "Comparison", "How-To"] as const

// ── Types ──────────────────────────────────────────────────────
interface TableView {
  id: string
  name: string
  columnVisibility: VisibilityState
  columnOrder: string[]
  sorting: SortingState
  globalFilter: string
  filterGroup: FilterGroup
  columnSizing?: ColumnSizingState
}

interface SpreadsheetTableProps {
  articles: Article[]
  onEditArticle: (articleId: string, startStep?: WizardStep) => void
  onOpenUpload: () => void
  onGenerateArticle: (articleId: string) => void
  onPreviewArticle: (articleId: string) => void
  onBulkGenerate?: (articleIds: string[]) => void
  onBulkRefresh?: (articleIds: string[]) => void
}

// ── Constants ──────────────────────────────────────────────────
const STATUS_STYLES: Record<ArticleStatus, string> = {
  pending: "bg-slate-100 text-slate-500",
  draft: "bg-[#0061FF]/10 text-[#0061FF]",
  published: "bg-[#10B981]/10 text-[#10B981]",
  generating: "bg-[#F59E0B]/10 text-[#F59E0B] animate-pulse",
  error: "bg-red-50 text-red-500",
  archived: "bg-slate-100 text-slate-400",
}

const VIEWS_KEY = "wonda_table_views"
const ACTIVE_VIEW_KEY = "wonda_active_view"
const TABLE_VERSION_KEY = "wonda_table_version"
const CURRENT_TABLE_VERSION = "6" // bump to force reset of stale localStorage views

// Column id → friendly label
const COLUMN_LABELS: Record<string, string> = {
  action: "Next Action",
  keyword: "Keyword",
  title: "Title",
  slug: "Slug",
  category: "Category",
  status: "Status",
  origin: "Source",
  rankingType: "Ranking Type",
  metaTitle: "Meta Title",
  metaDescription: "Meta Description",
  createdAt: "Created",
  updatedAt: "Updated",
}

// Columns available for filtering
const FILTERABLE_COLUMNS = [
  { id: "keyword", label: "Keyword" },
  { id: "title", label: "Title" },
  { id: "slug", label: "Slug" },
  { id: "category", label: "Category" },
  { id: "status", label: "Status" },
  { id: "origin", label: "Source" },
  { id: "rankingType", label: "Ranking Type" },
  { id: "metaTitle", label: "Meta Title" },
  { id: "metaDescription", label: "Meta Description" },
]

// Hideable column ids (in default order)
const DEFAULT_COLUMN_ORDER = [
  "action",
  "keyword",
  "title",
  "status",
  "origin",
  "rankingType",
  "createdAt",
  "updatedAt",
  "slug",
  "category",
  "metaTitle",
  "metaDescription",
]

const DEFAULT_VISIBILITY: VisibilityState = {
  slug: false,
  category: false,
  metaTitle: false,
  metaDescription: false,
}

// Threshold for flagging stale articles (30 days)
const STALE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000

const emptyFilterGroup: FilterGroup = { conjunction: "and", rules: [] }

function loadViews(): TableView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistViews(views: TableView[]) {
  localStorage.setItem(VIEWS_KEY, JSON.stringify(views))
}

function defaultView(): TableView {
  return {
    id: "default",
    name: "All Articles",
    columnVisibility: DEFAULT_VISIBILITY,
    columnOrder: DEFAULT_COLUMN_ORDER,
    sorting: [],
    globalFilter: "",
    filterGroup: emptyFilterGroup,
  }
}

function existingArticlesView(): TableView {
  return {
    id: "existing",
    name: "Existing Articles",
    columnVisibility: DEFAULT_VISIBILITY,
    columnOrder: DEFAULT_COLUMN_ORDER,
    sorting: [],
    globalFilter: "",
    filterGroup: {
      conjunction: "and",
      rules: [
        {
          id: "origin-legacy",
          column: "origin",
          operator: "does_not_equal",
          value: "wonda",
        },
      ],
    },
  }
}

function getNextAction(
  article: Article
): { label: string; icon: typeof Play; step: WizardStep } {
  // Non-Wonda articles are already live — always show Refresh
  if (article.origin !== "wonda") {
    return { label: "Refresh", icon: RefreshCw, step: "editor" }
  }
  if (!article.bodyHtml || article.status === "pending") {
    return { label: "Generate", icon: Play, step: "generate" }
  }
  if (article.status === "draft") {
    return { label: "Publish", icon: Send, step: "export" }
  }
  return { label: "Refresh", icon: RefreshCw, step: "editor" }
}

function generateRelevantKeyword(profile: CompanyProfile): string {
  const candidates: string[] = []
  for (const q of (profile.intelligenceBank || [])) {
    if (q.text) {
      const clean = q.text
        .replace(/^(what|how|why|when|where|which|can|does|do|is|are|should)\s+(is|are|does|do|can|should|would)?\s*/i, "")
        .replace(/\?$/, "")
        .trim()
        .toLowerCase()
      if (clean.length > 5 && clean.length < 60) candidates.push(clean)
    }
  }
  for (const comp of (profile.competitors || [])) {
    if (comp.name) {
      candidates.push(`${comp.name.toLowerCase()} alternative`)
      candidates.push(`best ${comp.name.toLowerCase()} alternatives`)
    }
  }
  if (profile.valueProp) {
    candidates.push(profile.valueProp.toLowerCase().slice(0, 50))
  }
  if (candidates.length === 0) {
    const name = profile.name || "your product"
    candidates.push(`best ${name.toLowerCase()} alternatives`, `how to use ${name.toLowerCase()}`, `${name.toLowerCase()} guide`)
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function generateMockTitle(keyword: string): string {
  return keyword
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

// ── Inline editable cell ──────────────────────────────────────
function InlineEditCell({
  articleId,
  value,
  field,
  placeholder,
  isNew,
  onUpdate,
  onGenerate,
  autoFocus,
}: {
  articleId: string
  value: string
  field: "keyword" | "title"
  placeholder: string
  isNew: boolean
  onUpdate: (articleId: string, field: string, value: string) => void
  onGenerate?: () => void
  autoFocus?: boolean
}) {
  const [editing, setEditing] = useState(isNew && !value)
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (editing && autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing, autoFocus])

  const commit = () => {
    if (localValue !== value) {
      onUpdate(articleId, field, localValue)
    }
    setEditing(false)
  }

  if (!editing && !isNew) {
    return (
      <span
        className={`${field === "keyword" ? "font-medium" : "text-sm"} cursor-text truncate block`}
        onClick={(e) => {
          e.stopPropagation()
          setEditing(true)
        }}
      >
        {value || <span className="text-muted-foreground italic">{placeholder}</span>}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Input
        ref={inputRef}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") {
            setLocalValue(value)
            setEditing(false)
          }
        }}
        placeholder={placeholder}
        className="h-7 text-sm px-2 py-0"
        autoFocus={autoFocus}
      />
      {onGenerate && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-[#0061FF]"
          title={`Generate ${field}`}
          onClick={(e) => {
            e.stopPropagation()
            onGenerate()
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

// ── Column Manager Panel (stays open, eye icons, drag-and-drop) ─
function ColumnManagerPanel({
  columnOrder,
  columnVisibility,
  onToggle,
  onReorder,
  onClose,
}: {
  columnOrder: string[]
  columnVisibility: VisibilityState
  onToggle: (colId: string) => void
  onReorder: (newOrder: string[]) => void
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const dragItem = useRef<number | null>(null) // eslint-disable-line
  const dragOver = useRef<number | null>(null) // eslint-disable-line

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  const handleDragStart = (idx: number) => {
    dragItem.current = idx
  }

  const handleDragEnter = (idx: number) => {
    dragOver.current = idx
  }

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return
    const from = dragItem.current
    const to = dragOver.current
    if (from === to) return
    const reordered = [...columnOrder]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    onReorder(reordered)
    dragItem.current = null
    dragOver.current = null
  }

  return (
    <div ref={panelRef} className="absolute top-full left-0 mt-1 z-50 bg-white border border-border rounded-lg shadow-lg w-56 py-1">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="text-xs font-medium">Columns</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {columnOrder.map((colId, idx) => {
        const visible = columnVisibility[colId] !== false
        return (
          <div
            key={colId}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#F8FAFC] cursor-grab text-sm select-none"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <span className="flex-1 text-xs">{COLUMN_LABELS[colId] || colId}</span>
            <button
              onClick={() => onToggle(colId)}
              className={`shrink-0 ${visible ? "text-foreground" : "text-muted-foreground/40"}`}
            >
              {visible ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export function SpreadsheetTable({
  articles,
  onEditArticle,
  onOpenUpload,
  onGenerateArticle,
  onPreviewArticle,
  onBulkGenerate,
  onBulkRefresh,
}: SpreadsheetTableProps) {
  const { addArticle, updateArticle, deleteArticle } = useArticles()
  const { profile } = useCompanyProfile()

  // Track which article IDs are "new" inline rows
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set())

  // ── Version migration: reset stale views when version bumps ──
  const [migrated] = useState(() => {
    const storedVersion = localStorage.getItem(TABLE_VERSION_KEY)
    if (storedVersion !== CURRENT_TABLE_VERSION) {
      localStorage.removeItem(VIEWS_KEY)
      localStorage.removeItem(ACTIVE_VIEW_KEY)
      localStorage.setItem(TABLE_VERSION_KEY, CURRENT_TABLE_VERSION)
      return true
    }
    return false
  })

  // ── Views ──────────────────────────────────
  const [views, setViews] = useState<TableView[]>(() => {
    if (migrated) return [defaultView(), existingArticlesView()]
    const saved = loadViews()
    return saved.length > 0 ? saved : [defaultView(), existingArticlesView()]
  })
  const [activeViewId, setActiveViewId] = useState<string>(
    () => localStorage.getItem(ACTIVE_VIEW_KEY) || views[0]?.id || "default"
  )

  const activeView =
    views.find((v) => v.id === activeViewId) || views[0] || defaultView()

  // ── Table state ────────────────────────────
  const [sorting, setSorting] = useState<SortingState>(activeView.sorting)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    activeView.columnVisibility
  )
  const [columnOrder, setColumnOrder] = useState<string[]>(
    activeView.columnOrder?.length ? activeView.columnOrder : DEFAULT_COLUMN_ORDER
  )
  const [globalFilter, setGlobalFilter] = useState(activeView.globalFilter)
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(
    activeView.filterGroup || emptyFilterGroup
  )
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(
    activeView.columnSizing || {}
  )
  const [rowSelection, setRowSelection] = useState({})
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showColumnManager, setShowColumnManager] = useState(false)

  // ── Auto-save to current view on change ────
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      setViews((prev) => {
        const updated = prev.map((v) =>
          v.id === activeViewId
            ? {
                ...v,
                columnVisibility,
                columnOrder,
                sorting,
                globalFilter,
                filterGroup,
                columnSizing,
              }
            : v
        )
        persistViews(updated)
        return updated
      })
    }, 500)
    return () => clearTimeout(autoSaveTimer.current)
  }, [columnVisibility, columnOrder, sorting, globalFilter, filterGroup, columnSizing, activeViewId])

  // ── Filter logic ───────────────────────────
  const filteredByAdvanced = useMemo(() => {
    if (filterGroup.rules.length === 0) return articles
    return articles.filter((a) => {
      // Map raw data values to display values so filters match what users see
      const displayRecord: Record<string, unknown> = { ...a }
      displayRecord.origin = a.origin === "wonda" ? "Wonda" : "Legacy"
      if (a.origin !== "wonda" || a.status === "published") {
        displayRecord.status = "Live"
      }
      return matchesFilterGroup(displayRecord, filterGroup)
    })
  }, [articles, filterGroup])

  // ── Inline cell update handler ─────────────
  const handleInlineCellUpdate = useCallback(
    (articleId: string, field: string, value: string) => {
      updateArticle(articleId, { [field]: value, updatedAt: new Date().toISOString() })
    },
    [updateArticle]
  )

  const handleGenerateKeyword = useCallback(
    (articleId: string) => {
      const keyword = generateRelevantKeyword(profile)
      updateArticle(articleId, {
        keyword,
        updatedAt: new Date().toISOString(),
      })
    },
    [updateArticle, profile]
  )

  const handleGenerateTitle = useCallback(
    (articleId: string, keyword: string) => {
      const title = generateMockTitle(keyword || "untitled article")
      updateArticle(articleId, {
        title,
        updatedAt: new Date().toISOString(),
      })
    },
    [updateArticle]
  )

  // ── Column definitions (ordered) ───────────
  const columnDefs = useMemo<Record<string, ColumnDef<Article>>>(
    () => ({
      action: {
        id: "action",
        header: "Next Action",
        size: 160,
        cell: ({ row }) => {
          const article = row.original
          const { label, icon: Icon } = getNextAction(article)
          const hasKeyword = Boolean(article.keyword?.trim())
          const colorClass =
            label === "Generate"
              ? hasKeyword
                ? "text-[#0061FF] hover:text-[#0061FF]/80"
                : "text-muted-foreground cursor-not-allowed"
              : label === "Publish"
                ? "text-[#10B981] hover:text-[#10B981]/80"
                : "text-[#F59E0B] hover:text-[#F59E0B]/80"
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 text-xs gap-1.5 ${colorClass}`}
                disabled={label === "Generate" && !hasKeyword}
                title={label === "Generate" && !hasKeyword ? "Enter a keyword first" : undefined}
                onClick={(e) => {
                  e.stopPropagation()
                  if (label === "Generate") {
                    setNewRowIds((prev) => {
                      const next = new Set(prev)
                      next.delete(article.id)
                      return next
                    })
                    onGenerateArticle(article.id)
                  } else if (label === "Publish") {
                    onEditArticle(article.id, "export")
                  } else {
                    onEditArticle(article.id, "editor")
                  }
                }}
              >
                <Icon className="h-3 w-3" />
                {label}
              </Button>
            </div>
          )
        },
        enableSorting: false,
      },
      keyword: {
        accessorKey: "keyword",
        header: "Keyword",
        size: 240,
        cell: ({ row }) => {
          const article = row.original
          const isNew = newRowIds.has(article.id)
          return (
            <InlineEditCell
              articleId={article.id}
              value={article.keyword}
              field="keyword"
              placeholder="Enter keyword..."
              isNew={isNew}
              onUpdate={handleInlineCellUpdate}
              onGenerate={() => handleGenerateKeyword(article.id)}
              autoFocus={isNew}
            />
          )
        },
      },
      title: {
        accessorKey: "title",
        header: "Title",
        size: 280,
        cell: ({ row }) => {
          const article = row.original
          const isNew = newRowIds.has(article.id)
          return (
            <InlineEditCell
              articleId={article.id}
              value={article.title}
              field="title"
              placeholder="Enter title..."
              isNew={isNew}
              onUpdate={handleInlineCellUpdate}
              onGenerate={() => handleGenerateTitle(article.id, article.keyword)}
            />
          )
        },
      },
      slug: {
        accessorKey: "slug",
        header: "Slug",
        size: 180,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm font-mono truncate block max-w-[180px]">
            {getValue<string>() || "—"}
          </span>
        ),
      },
      category: {
        accessorKey: "category",
        header: "Category",
        size: 130,
        cell: ({ getValue }) => (
          <Badge variant="secondary" className="text-xs capitalize">
            {(getValue<string>() || "blog").replace("-", " ")}
          </Badge>
        ),
      },
      status: {
        accessorKey: "status",
        header: "Status",
        size: 140,
        cell: ({ row, getValue }) => {
          const article = row.original
          const status = getValue<ArticleStatus>()
          const isLegacy = article.origin !== "wonda"
          const displayLabel = isLegacy || status === "published" ? "Live" : status
          const styleKey = isLegacy ? "published" : status

          // Build the real article URL
          const hasContent = Boolean(article.bodyHtml) || isLegacy
          let articleUrl = ""
          if (article.contentPath) {
            if (article.contentPath.startsWith("http")) {
              articleUrl = article.contentPath
            } else {
              // Relative path like /blog — append slug for full URL
              const base = `${profile.websiteUrl || ""}${article.contentPath}`
              articleUrl = article.slug ? `${base}/${article.slug}` : base
            }
          } else if (article.slug && profile.websiteUrl) {
            const basePath = (profile.contentPaths?.[0] || `${profile.websiteUrl}/blog`).replace(/\/$/, "")
            articleUrl = `${basePath}/${article.slug}`
          }

          const isDraft = !isLegacy && status === "draft"
          const isLive = isLegacy || status === "published"

          return (
            <div className="flex items-center gap-1.5">
              <Badge className={`text-xs capitalize ${STATUS_STYLES[styleKey]}`}>
                {displayLabel}
              </Badge>
              {isDraft && hasContent && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPreviewArticle(article.id) }}
                  className="text-muted-foreground hover:text-[#0061FF] transition-colors"
                  title="Preview article"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              )}
              {isLive && articleUrl && (
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={articleUrl}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )
        },
      },
      origin: {
        accessorKey: "origin",
        header: "Source",
        size: 100,
        cell: ({ getValue }) => {
          const origin = getValue<string>()
          const isWonda = origin === "wonda"
          return (
            <Badge
              className={`text-xs ${
                isWonda
                  ? "bg-[#0061FF]/10 text-[#0061FF]"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {isWonda ? "Wonda" : "Legacy"}
            </Badge>
          )
        },
      },
      rankingType: {
        accessorKey: "rankingType",
        header: "Ranking Type",
        size: 140,
        cell: ({ row }) => {
          const article = row.original
          const value = article.rankingType || ""
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <select
                className="text-xs bg-transparent border-none outline-none cursor-pointer text-muted-foreground hover:text-foreground w-full max-w-[120px] truncate"
                value={value}
                onChange={(e) => {
                  handleInlineCellUpdate(article.id, "rankingType", e.target.value)
                }}
              >
                <option value="">—</option>
                {RANKING_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )
        },
      },
      metaTitle: {
        accessorKey: "metaTitle",
        header: "Meta Title",
        size: 200,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
            {getValue<string>() || "—"}
          </span>
        ),
      },
      metaDescription: {
        accessorKey: "metaDescription",
        header: "Meta Description",
        size: 250,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground truncate block max-w-[250px]">
            {getValue<string>() || "—"}
          </span>
        ),
      },
      createdAt: {
        accessorKey: "createdAt",
        header: "Created",
        size: 150,
        cell: ({ row }) => {
          const article = row.original
          const dateStr = article.createdAt
          return (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                type="date"
                className="text-xs text-muted-foreground bg-transparent border-none outline-none cursor-text w-[100px] [&::-webkit-calendar-picker-indicator]:hidden"
                value={dateStr ? new Date(dateStr).toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    handleInlineCellUpdate(article.id, "createdAt", new Date(e.target.value).toISOString())
                  }
                }}
              />
            </div>
          )
        },
      },
      updatedAt: {
        accessorKey: "updatedAt",
        header: "Updated",
        size: 150,
        cell: ({ row }) => {
          const article = row.original
          const dateStr = article.updatedAt
          // Stale flag: use updatedAt if it exists, otherwise createdAt
          const staleRef = dateStr || article.createdAt
          const isStale = staleRef ? Date.now() - new Date(staleRef).getTime() > STALE_THRESHOLD_MS : false
          return (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                type="date"
                className="text-xs text-muted-foreground bg-transparent border-none outline-none cursor-text w-[100px] [&::-webkit-calendar-picker-indicator]:hidden"
                value={dateStr ? new Date(dateStr).toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    handleInlineCellUpdate(article.id, "updatedAt", new Date(e.target.value).toISOString())
                  }
                }}
              />
              {isStale && (
                <span title="Over 1 month old — consider refreshing"><AlertTriangle className="h-3 w-3 text-[#F59E0B] shrink-0" /></span>
              )}
            </div>
          )
        },
      },
    }),
    [onEditArticle, onGenerateArticle, onPreviewArticle, newRowIds, handleInlineCellUpdate, handleGenerateKeyword, handleGenerateTitle, profile]
  )

  // Build ordered columns array: select + rowNumber + ordered data cols + actions col
  const columns = useMemo<ColumnDef<Article>[]>(() => {
    const fixed: ColumnDef<Article>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 40,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "rowNumber",
        header: "#",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{row.index + 1}</span>
        ),
        size: 40,
        enableSorting: false,
        enableHiding: false,
      },
    ]

    const ordered = columnOrder
      .filter((id) => columnDefs[id])
      .map((id) => columnDefs[id])

    const actionsCol: ColumnDef<Article> = {
      id: "actions",
      header: "",
      size: 40,
      cell: ({ row }) => {
        const article = row.original
        return (
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Edit article"
              onClick={() => onEditArticle(article.id)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    }

    return [...fixed, ...ordered, actionsCol]
  }, [columnOrder, columnDefs, onEditArticle])

  const table = useReactTable({
    data: filteredByAdvanced,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnVisibility,
      globalFilter,
      rowSelection,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  })

  const visibleDataCols = columnOrder.filter(
    (id) => columnVisibility[id] !== false
  ).length
  const rowCount = table.getFilteredRowModel().rows.length
  const activeFilterCount = filterGroup.rules.length

  // ── View management ────────────────────────
  const handleAddView = useCallback(() => {
    const newView: TableView = {
      id: crypto.randomUUID(),
      name: `View ${views.length + 1}`,
      columnVisibility: DEFAULT_VISIBILITY,
      columnOrder: DEFAULT_COLUMN_ORDER,
      sorting: [],
      globalFilter: "",
      filterGroup: emptyFilterGroup,
    }
    const updated = [...views, newView]
    setViews(updated)
    persistViews(updated)
    setActiveViewId(newView.id)
    localStorage.setItem(ACTIVE_VIEW_KEY, newView.id)
    setColumnVisibility(DEFAULT_VISIBILITY)
    setColumnOrder(DEFAULT_COLUMN_ORDER)
    setSorting([])
    setGlobalFilter("")
    setFilterGroup(emptyFilterGroup)
    setColumnSizing({})
  }, [views])

  const handleSwitchView = useCallback(
    (viewId: string) => {
      const view = views.find((v) => v.id === viewId)
      if (!view) return
      setActiveViewId(viewId)
      localStorage.setItem(ACTIVE_VIEW_KEY, viewId)
      setColumnVisibility(view.columnVisibility)
      setColumnOrder(view.columnOrder?.length ? view.columnOrder : DEFAULT_COLUMN_ORDER)
      setSorting(view.sorting)
      setGlobalFilter(view.globalFilter)
      setFilterGroup(view.filterGroup || emptyFilterGroup)
      setColumnSizing(view.columnSizing || {})
    },
    [views]
  )

  const handleDeleteView = useCallback(
    (viewId: string) => {
      if (views.length <= 1) return
      const updated = views.filter((v) => v.id !== viewId)
      setViews(updated)
      persistViews(updated)
      if (activeViewId === viewId) {
        handleSwitchView(updated[0].id)
      }
    },
    [views, activeViewId, handleSwitchView]
  )

  // ── New Article: adds inline row ────────────
  const handleAddInlineRow = useCallback(() => {
    // If current view has filters that would hide the new article, switch to All Articles
    if (filterGroup.rules.length > 0) {
      const allView = views.find((v) => v.id === "default")
      if (allView) {
        handleSwitchView(allView.id)
      }
    }
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    addArticle({
      id,
      title: "",
      keyword: "",
      slug: "",
      category: "blog",
      status: "pending",
      origin: "wonda",
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
    })
    setNewRowIds((prev) => new Set(prev).add(id))
  }, [addArticle, filterGroup.rules.length, views, handleSwitchView])

  const handleExportCsv = useCallback(() => {
    const exportCols = columnOrder.filter(
      (id) => columnVisibility[id] !== false
    )
    const headers = exportCols.map((id) => COLUMN_LABELS[id] || id)
    const rows = table.getFilteredRowModel().rows.map((row) =>
      exportCols.map((colId) => {
        const val = row.getValue(colId)
        const str = String(val ?? "")
        return str.includes(",") ? `"${str}"` : str
      })
    )
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "content-library.csv"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("CSV exported")
  }, [table, columnOrder, columnVisibility])

  const selectedRowCount = Object.keys(rowSelection).length

  const handleBulkDelete = useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows
    if (selectedRows.length === 0) return
    const liveRows = selectedRows.filter(
      (r) => r.original.status === "published" || r.original.origin !== "wonda"
    )
    const deletableRows = selectedRows.filter(
      (r) => r.original.status !== "published" && r.original.origin === "wonda"
    )
    // Archive live articles instead of deleting
    for (const row of liveRows) {
      updateArticle(row.original.id, { status: "archived" })
    }
    for (const row of deletableRows) {
      deleteArticle(row.original.id)
    }
    setRowSelection({})
    const parts: string[] = []
    if (deletableRows.length > 0) parts.push(`${deletableRows.length} deleted`)
    if (liveRows.length > 0) parts.push(`${liveRows.length} archived (live articles can't be deleted)`)
    toast.success(parts.join(", "))
  }, [table, deleteArticle, updateArticle])

  const handleToggleColumn = useCallback(
    (colId: string) => {
      setColumnVisibility((prev) => ({
        ...prev,
        [colId]: prev[colId] === false ? true : false,
      }))
    },
    []
  )

  const handleReorderColumns = useCallback((newOrder: string[]) => {
    setColumnOrder(newOrder)
  }, [])

  return (
    <div className="space-y-0">
      {/* View tabs */}
      <div className="flex items-center gap-1 border-b border-border px-1 bg-[#F8FAFC] rounded-t-lg">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => handleSwitchView(view.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-b-2 -mb-[1px] ${
              view.id === activeViewId
                ? "border-foreground text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {view.name}
            {views.length > 1 && view.id === activeViewId && (
              <X
                className="h-3 w-3 ml-1 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteView(view.id)
                }}
              />
            )}
          </button>
        ))}
        <button
          onClick={handleAddView}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          title="Add view"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-white flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 w-44 pl-7 text-sm"
          />
        </div>

        {/* Filter */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setShowFilterModal(true)}
        >
          <Filter className="h-3 w-3" />
          Filter
          {activeFilterCount > 0 && (
            <Badge className="ml-1 h-4 min-w-4 p-0 text-[9px] bg-[#0061FF] text-white flex items-center justify-center rounded-full">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {/* Sort indicator */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => sorting.length > 0 && setSorting([])}
        >
          <ArrowUpDown className="h-3 w-3" />
          Sort
          {sorting.length > 0 && (
            <Badge className="ml-1 h-4 min-w-4 p-0 text-[9px] bg-[#0061FF] text-white flex items-center justify-center rounded-full">
              {sorting.length}
            </Badge>
          )}
        </Button>

        {/* Column visibility (custom panel) */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setShowColumnManager((v) => !v)}
          >
            <Columns3 className="h-3 w-3" />
            {visibleDataCols} Columns
          </Button>
          {showColumnManager && (
            <ColumnManagerPanel
              columnOrder={columnOrder}
              columnVisibility={columnVisibility}
              onToggle={handleToggleColumn}
              onReorder={handleReorderColumns}
              onClose={() => setShowColumnManager(false)}
            />
          )}
        </div>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={handleExportCsv}
        >
          <Download className="h-3 w-3" />
          Export
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={onOpenUpload}
        >
          <Upload className="h-3 w-3" />
          Import
        </Button>

        <Button size="sm" className="h-8 text-xs gap-1" onClick={handleAddInlineRow}>
          <Plus className="h-3 w-3" />
          New Article
        </Button>
      </div>

      {/* Bulk action bar */}
      {selectedRowCount > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-[#0061FF]/5">
          <span className="text-xs font-medium">
            {selectedRowCount} article{selectedRowCount !== 1 ? "s" : ""} selected
          </span>
          {onBulkGenerate && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 text-[#0061FF] border-[#0061FF]/30 hover:bg-[#0061FF]/10"
              onClick={() => {
                const ids = table.getSelectedRowModel().rows
                  .filter((r) => {
                    const a = r.original
                    return a.origin === "wonda" && (!a.bodyHtml || a.status === "pending") && a.keyword?.trim()
                  })
                  .map((r) => r.original.id)
                if (ids.length === 0) {
                  toast.error("No eligible articles to generate (need keyword, no existing content)")
                  return
                }
                onBulkGenerate(ids)
                setRowSelection({})
              }}
            >
              <Play className="h-3 w-3" />
              Generate Selected
            </Button>
          )}
          {onBulkRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/10"
              onClick={() => {
                const ids = table.getSelectedRowModel().rows
                  .filter((r) => Boolean(r.original.bodyHtml))
                  .map((r) => r.original.id)
                if (ids.length === 0) {
                  toast.error("No articles with content to refresh")
                  return
                }
                onBulkRefresh(ids)
                setRowSelection({})
              }}
            >
              <RefreshCw className="h-3 w-3" />
              Refresh Selected
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-3 w-3" />
            Delete Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setRowSelection({})}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-[#FAFBFC] flex-wrap">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {filterGroup.rules.map((r, i) => (
            <Badge
              key={r.id}
              variant="secondary"
              className="text-xs gap-1 cursor-pointer"
              onClick={() => setShowFilterModal(true)}
            >
              {i > 0 && (
                <span className="text-muted-foreground mr-0.5">
                  {filterGroup.conjunction.toUpperCase()}
                </span>
              )}
              {COLUMN_LABELS[r.column] || r.column} {r.operator.replace(/_/g, " ")}{" "}
              {r.value && `"${r.value}"`}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground"
            onClick={() => setFilterGroup(emptyFilterGroup)}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto border-x border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#FAFBFC] sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`relative text-left text-xs font-medium text-muted-foreground px-3 py-2 border-r border-border last:border-r-0 whitespace-nowrap ${
                      header.id === "actions" ? "sticky right-0 bg-[#FAFBFC] z-20" : ""
                    }`}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-1 ${
                          header.column.getCanSort()
                            ? "cursor-pointer select-none hover:text-foreground"
                            : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getIsSorted() === "asc" && (
                          <span className="text-[10px]">↑</span>
                        )}
                        {header.column.getIsSorted() === "desc" && (
                          <span className="text-[10px]">↓</span>
                        )}
                      </div>
                    )}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-[#0061FF] ${
                          header.column.getIsResizing() ? "bg-[#0061FF]" : "bg-transparent"
                        }`}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12 text-muted-foreground"
                >
                  No articles match your filters. Adjust filters or add a new
                  article.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`group/row border-b border-border hover:bg-[#F8FAFC] cursor-pointer transition-colors ${
                    newRowIds.has(row.original.id) ? "bg-[#0061FF]/[0.02]" : ""
                  }`}
                  onClick={() => {
                    if (!newRowIds.has(row.original.id)) {
                      onEditArticle(row.original.id)
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-3 py-2 border-r border-border last:border-r-0 whitespace-nowrap overflow-hidden ${
                        cell.column.id === "actions" ? "sticky right-0 bg-white group-hover/row:bg-[#F8FAFC]" : ""
                      }`}
                      style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end px-3 py-2 border border-t-0 border-border bg-[#FAFBFC] rounded-b-lg">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            {rowCount} Row{rowCount !== 1 ? "s" : ""}
          </span>
          <span>
            {visibleDataCols}/{DEFAULT_COLUMN_ORDER.length} Columns
          </span>
        </div>
      </div>

      {/* Filter modal */}
      <FilterModal
        open={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterGroup={filterGroup}
        onApply={setFilterGroup}
        columns={FILTERABLE_COLUMNS}
      />
    </div>
  )
}
