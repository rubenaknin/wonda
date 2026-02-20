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
} from "@tanstack/react-table"
import {
  Filter,
  ArrowUpDown,
  Columns3,
  Plus,
  Download,
  Upload,
  Play,
  Trash2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Send,
  X,
  Search,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useArticles } from "@/context/ArticlesContext"
import { useWebhook } from "@/context/WebhookContext"
import { sendWebhook } from "@/lib/webhook"
import { formatRelativeTime } from "@/lib/date"
import {
  FilterModal,
  matchesFilterGroup,
  type FilterGroup,
} from "./FilterModal"
import type { Article, ArticleStatus, WizardStep } from "@/types"

// ── Types ──────────────────────────────────────────────────────
interface TableView {
  id: string
  name: string
  columnVisibility: VisibilityState
  columnOrder: string[]
  sorting: SortingState
  globalFilter: string
  filterGroup: FilterGroup
}

interface SpreadsheetTableProps {
  articles: Article[]
  onEditArticle: (articleId: string, startStep?: WizardStep) => void
  onOpenUpload: () => void
  onNewArticle: () => void
}

// ── Constants ──────────────────────────────────────────────────
const STATUS_STYLES: Record<ArticleStatus, string> = {
  pending: "bg-slate-100 text-slate-500",
  draft: "bg-[#0061FF]/10 text-[#0061FF]",
  published: "bg-[#10B981]/10 text-[#10B981]",
  generating: "bg-[#F59E0B]/10 text-[#F59E0B] animate-pulse",
  error: "bg-red-50 text-red-500",
}

const VIEWS_KEY = "wonda_table_views"
const ACTIVE_VIEW_KEY = "wonda_active_view"
const SEEDED_KEY = "wonda_articles_seeded"

// Column id → friendly label
const COLUMN_LABELS: Record<string, string> = {
  action: "Next Action",
  keyword: "Keyword",
  title: "Title",
  slug: "Slug",
  category: "Category",
  status: "Status",
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
  { id: "metaTitle", label: "Meta Title" },
  { id: "metaDescription", label: "Meta Description" },
]

// Hideable column ids (in default order)
const DEFAULT_COLUMN_ORDER = [
  "action",
  "keyword",
  "title",
  "slug",
  "category",
  "status",
  "metaTitle",
  "metaDescription",
  "createdAt",
  "updatedAt",
]

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
    columnVisibility: {},
    columnOrder: DEFAULT_COLUMN_ORDER,
    sorting: [],
    globalFilter: "",
    filterGroup: emptyFilterGroup,
  }
}

function getNextAction(
  article: Article
): { label: string; icon: typeof Play; step: WizardStep } {
  if (!article.bodyHtml || article.status === "pending") {
    return { label: "Generate", icon: Play, step: "generate" }
  }
  if (article.status === "draft") {
    return { label: "Publish", icon: Send, step: "export" }
  }
  return { label: "Refresh", icon: RefreshCw, step: "editor" }
}

function getResumeStep(article: Article): WizardStep {
  if (!article.slug) return "slug"
  if (!article.category) return "category"
  if (!article.bodyHtml) return "generate"
  return "editor"
}

// ── Seed mock articles ─────────────────────────────────────────
const MOCK_KEYWORDS = [
  "best project management tools 2025",
  "how to improve team productivity",
  "remote work communication strategies",
  "agile vs waterfall methodology",
  "employee onboarding best practices",
  "customer retention strategies SaaS",
  "how to reduce churn rate",
  "data-driven marketing guide",
  "B2B content marketing strategy",
  "SEO for SaaS companies",
]

function generateSeedArticles(): Article[] {
  const baseDate = new Date()
  return MOCK_KEYWORDS.map((keyword, i) => {
    const created = new Date(baseDate)
    created.setDate(created.getDate() - (MOCK_KEYWORDS.length - i) * 3)
    const slug = keyword
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    const title = keyword
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
    return {
      id: crypto.randomUUID(),
      title,
      keyword,
      slug,
      category: "blog" as const,
      status: "published" as const,
      bodyHtml: `<h1>${title}</h1><p>Article content for ${keyword}.</p>`,
      faqHtml: "",
      faqItems: [],
      metaTitle: title,
      metaDescription: `Learn about ${keyword} in this comprehensive guide.`,
      ctaText: "Start Free Trial",
      ctaUrl: "/trial",
      internalLinks: [],
      selectedQuestions: [],
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
    }
  })
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
  const dragItem = useRef<number | null>(null) // eslint-disable-line
  const dragOver = useRef<number | null>(null) // eslint-disable-line

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
    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-border rounded-lg shadow-lg w-56 py-1">
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
  onNewArticle,
}: SpreadsheetTableProps) {
  const { addArticle, deleteArticle } = useArticles()
  const { webhookUrls } = useWebhook()

  // Seed default articles on first ever load
  useEffect(() => {
    if (localStorage.getItem(SEEDED_KEY)) return
    if (articles.length > 0) {
      localStorage.setItem(SEEDED_KEY, "1")
      return
    }
    const seeds = generateSeedArticles()
    for (const a of seeds) addArticle(a)
    localStorage.setItem(SEEDED_KEY, "1")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Views ──────────────────────────────────
  const [views, setViews] = useState<TableView[]>(() => {
    const saved = loadViews()
    return saved.length > 0 ? saved : [defaultView()]
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
              }
            : v
        )
        persistViews(updated)
        return updated
      })
    }, 500)
    return () => clearTimeout(autoSaveTimer.current)
  }, [columnVisibility, columnOrder, sorting, globalFilter, filterGroup, activeViewId])

  // ── Filter logic ───────────────────────────
  const filteredByAdvanced = useMemo(() => {
    if (filterGroup.rules.length === 0) return articles
    return articles.filter((a) =>
      matchesFilterGroup(a as unknown as Record<string, unknown>, filterGroup)
    )
  }, [articles, filterGroup])

  // ── Column definitions (ordered) ───────────
  const columnDefs = useMemo<Record<string, ColumnDef<Article>>>(
    () => ({
      action: {
        id: "action",
        header: "Next Action",
        size: 130,
        cell: ({ row }) => {
          const article = row.original
          const { label, icon: Icon } = getNextAction(article)
          const colorClass =
            label === "Generate"
              ? "text-[#0061FF] hover:text-[#0061FF]/80"
              : label === "Publish"
                ? "text-[#10B981] hover:text-[#10B981]/80"
                : "text-[#F59E0B] hover:text-[#F59E0B]/80"
          return (
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 text-xs gap-1.5 ${colorClass}`}
              onClick={(e) => {
                e.stopPropagation()
                if (label === "Generate") {
                  onEditArticle(article.id, getResumeStep(article))
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
          )
        },
        enableSorting: false,
      },
      keyword: {
        accessorKey: "keyword",
        header: "Keyword",
        size: 220,
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue<string>()}</span>
        ),
      },
      title: {
        accessorKey: "title",
        header: "Title",
        size: 250,
        cell: ({ getValue, row }) => (
          <span className="text-sm">
            {getValue<string>() || row.original.keyword}
          </span>
        ),
      },
      slug: {
        accessorKey: "slug",
        header: "Slug",
        size: 180,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm font-mono">
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
        size: 110,
        cell: ({ getValue }) => {
          const status = getValue<ArticleStatus>()
          return (
            <Badge className={`text-xs capitalize ${STATUS_STYLES[status]}`}>
              {status}
            </Badge>
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
        size: 130,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(getValue<string>())}
          </span>
        ),
      },
      updatedAt: {
        accessorKey: "updatedAt",
        header: "Updated",
        size: 130,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(getValue<string>())}
          </span>
        ),
      },
    }),
    [onEditArticle]
  )

  // Build ordered columns array: select + rowNumber + ordered data cols + more menu
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

    const moreCol: ColumnDef<Article> = {
      id: "more",
      header: "",
      size: 40,
      cell: ({ row }) => {
        const article = row.original
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditArticle(article.id)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                {article.bodyHtml && (
                  <DropdownMenuItem
                    onClick={async () => {
                      await sendWebhook(
                        webhookUrls.generateArticle,
                        "refresh_aeo",
                        { articleId: article.id, keyword: article.keyword }
                      )
                      toast.success("AEO refresh triggered")
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Refresh AEO
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    deleteArticle(article.id)
                    toast.success("Article deleted")
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    }

    return [...fixed, ...ordered, moreCol]
  }, [columnOrder, columnDefs, onEditArticle, deleteArticle, webhookUrls])

  const table = useReactTable({
    data: filteredByAdvanced,
    columns,
    state: {
      sorting,
      columnVisibility,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
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
      columnVisibility: {},
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
    setColumnVisibility({})
    setColumnOrder(DEFAULT_COLUMN_ORDER)
    setSorting([])
    setGlobalFilter("")
    setFilterGroup(emptyFilterGroup)
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

  const handleAddRow = useCallback(() => {
    onNewArticle()
  }, [onNewArticle])

  const handleAddRows = useCallback(
    (count: number) => {
      const now = new Date().toISOString()
      for (let i = 0; i < count; i++) {
        addArticle({
          id: crypto.randomUUID(),
          title: "",
          keyword: "",
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
        })
      }
      toast.success(`Added ${count} empty rows`)
    },
    [addArticle]
  )

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

        <Button size="sm" className="h-8 text-xs gap-1" onClick={onNewArticle}>
          <Plus className="h-3 w-3" />
          New Article
        </Button>
      </div>

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
                    className="text-left text-xs font-medium text-muted-foreground px-3 py-2 border-r border-border last:border-r-0 whitespace-nowrap"
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
                  className="border-b border-border hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                  onClick={() => onEditArticle(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3 py-2 border-r border-border last:border-r-0 whitespace-nowrap"
                      style={{ maxWidth: cell.column.getSize() }}
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
      <div className="flex items-center justify-between px-3 py-2 border border-t-0 border-border bg-[#FAFBFC] rounded-b-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={handleAddRow}
          >
            <Plus className="h-3 w-3" />
            Add Row
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => handleAddRows(10)}
          >
            <Plus className="h-3 w-3" />
            Add 10 Rows
          </Button>
        </div>
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
