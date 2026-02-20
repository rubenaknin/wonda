import { useState, useMemo, useCallback } from "react"
import { toast } from "sonner"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
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
  X,
  Search,
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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useArticles } from "@/context/ArticlesContext"
import { useWebhook } from "@/context/WebhookContext"
import { sendWebhook } from "@/lib/webhook"
import { formatRelativeTime } from "@/lib/date"
import type { Article, ArticleStatus, WizardStep } from "@/types"

// ── Types ──────────────────────────────────────────────────────
interface TableView {
  id: string
  name: string
  columnVisibility: VisibilityState
  sorting: SortingState
  globalFilter: string
}

interface SpreadsheetTableProps {
  articles: Article[]
  onEditArticle: (articleId: string, startStep?: WizardStep) => void
  onOpenUpload: () => void
}

// ── Constants ──────────────────────────────────────────────────
const STATUS_STYLES: Record<ArticleStatus, string> = {
  pending: "bg-slate-100 text-slate-500",
  draft: "bg-[#0061FF]/10 text-[#0061FF]",
  published: "bg-[#10B981]/10 text-[#10B981]",
  generating: "bg-[#F59E0B]/10 text-[#F59E0B] animate-pulse",
  error: "bg-red-50 text-red-500",
}

const VIEWS_STORAGE_KEY = "wonda_table_views"
const ACTIVE_VIEW_KEY = "wonda_active_view"

function loadViews(): TableView[] {
  try {
    const raw = localStorage.getItem(VIEWS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveViews(views: TableView[]) {
  localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(views))
}

const defaultView: TableView = {
  id: "default",
  name: "All Articles",
  columnVisibility: {},
  sorting: [],
  globalFilter: "",
}

function getResumeStep(article: Article): WizardStep {
  if (!article.slug) return "slug"
  if (!article.category) return "category"
  if (!article.bodyHtml) return "generate"
  return "editor"
}

// ── Component ──────────────────────────────────────────────────
export function SpreadsheetTable({
  articles,
  onEditArticle,
  onOpenUpload,
}: SpreadsheetTableProps) {
  const { addArticle, deleteArticle } = useArticles()
  const { webhookUrls } = useWebhook()

  // Views
  const [views, setViews] = useState<TableView[]>(() => {
    const saved = loadViews()
    return saved.length > 0 ? saved : [defaultView]
  })
  const [activeViewId, setActiveViewId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_VIEW_KEY) || views[0]?.id || "default"
  })

  const activeView = views.find((v) => v.id === activeViewId) || views[0] || defaultView

  // Table state
  const [sorting, setSorting] = useState<SortingState>(activeView.sorting)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    activeView.columnVisibility
  )
  const [globalFilter, setGlobalFilter] = useState(activeView.globalFilter)
  const [rowSelection, setRowSelection] = useState({})
  const [showFilterBar, setShowFilterBar] = useState(false)
  const [filterColumn, setFilterColumn] = useState("")
  const [filterValue, setFilterValue] = useState("")

  // Column definitions
  const columns = useMemo<ColumnDef<Article>[]>(
    () => [
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
      {
        accessorKey: "keyword",
        header: "Keyword",
        size: 220,
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        size: 250,
        cell: ({ getValue, row }) => (
          <span className="text-sm">
            {getValue<string>() || row.original.keyword}
          </span>
        ),
      },
      {
        accessorKey: "slug",
        header: "Slug",
        size: 180,
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-sm font-mono">
            {getValue<string>() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        size: 130,
        cell: ({ getValue }) => (
          <Badge variant="secondary" className="text-xs capitalize">
            {(getValue<string>() || "blog").replace("-", " ")}
          </Badge>
        ),
        filterFn: "equals",
      },
      {
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
        filterFn: "equals",
      },
      {
        id: "action",
        header: "Action",
        size: 140,
        cell: ({ row }) => {
          const article = row.original
          if (article.status === "pending" || !article.bodyHtml) {
            return (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[#0061FF] hover:text-[#0061FF]/80 gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditArticle(article.id, getResumeStep(article))
                }}
              >
                <Play className="h-3 w-3" />
                Run Workflow
              </Button>
            )
          }
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground gap-1"
              onClick={(e) => {
                e.stopPropagation()
                onEditArticle(article.id, "editor")
              }}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "metaTitle",
        header: "Meta Title",
        size: 200,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
            {getValue<string>() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "metaDescription",
        header: "Meta Description",
        size: 250,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground truncate block max-w-[250px]">
            {getValue<string>() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        size: 130,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        size: 130,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(getValue<string>())}
          </span>
        ),
      },
      {
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
                        await sendWebhook(webhookUrls.generateArticle, "refresh_aeo", {
                          articleId: article.id,
                          keyword: article.keyword,
                        })
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
      },
    ],
    [onEditArticle, deleteArticle, webhookUrls]
  )

  const table = useReactTable({
    data: articles,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  })

  const visibleColumnCount = table.getVisibleLeafColumns().length
  const totalColumnCount = columns.length
  const rowCount = table.getFilteredRowModel().rows.length

  // ── View management ────────────────────────────
  const handleSaveView = useCallback(() => {
    const updated = views.map((v) =>
      v.id === activeViewId
        ? { ...v, columnVisibility, sorting, globalFilter }
        : v
    )
    setViews(updated)
    saveViews(updated)
    toast.success(`View "${activeView.name}" saved`)
  }, [views, activeViewId, columnVisibility, sorting, globalFilter, activeView.name])

  const handleAddView = useCallback(() => {
    const newView: TableView = {
      id: crypto.randomUUID(),
      name: `View ${views.length + 1}`,
      columnVisibility: {},
      sorting: [],
      globalFilter: "",
    }
    const updated = [...views, newView]
    setViews(updated)
    saveViews(updated)
    setActiveViewId(newView.id)
    localStorage.setItem(ACTIVE_VIEW_KEY, newView.id)
    setColumnVisibility({})
    setSorting([])
    setGlobalFilter("")
  }, [views])

  const handleSwitchView = useCallback(
    (viewId: string) => {
      const view = views.find((v) => v.id === viewId)
      if (!view) return
      setActiveViewId(viewId)
      localStorage.setItem(ACTIVE_VIEW_KEY, viewId)
      setColumnVisibility(view.columnVisibility)
      setSorting(view.sorting)
      setGlobalFilter(view.globalFilter)
    },
    [views]
  )

  const handleDeleteView = useCallback(
    (viewId: string) => {
      if (views.length <= 1) return
      const updated = views.filter((v) => v.id !== viewId)
      setViews(updated)
      saveViews(updated)
      if (activeViewId === viewId) {
        handleSwitchView(updated[0].id)
      }
    },
    [views, activeViewId, handleSwitchView]
  )

  const handleAddRow = useCallback(() => {
    const now = new Date().toISOString()
    const newArticle: Article = {
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
    }
    addArticle(newArticle)
    // Open the article wizard for the new row
    onEditArticle(newArticle.id)
  }, [addArticle, onEditArticle])

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
    const visibleCols = table
      .getVisibleLeafColumns()
      .filter((c) => !["select", "rowNumber", "action", "more"].includes(c.id))
    const headers = visibleCols.map((c) => c.id)
    const rows = table.getFilteredRowModel().rows.map((row) =>
      visibleCols.map((col) => {
        const val = row.getValue(col.id)
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
  }, [table])

  const handleApplyFilter = () => {
    if (filterColumn && filterValue) {
      setColumnFilters((prev) => {
        const without = prev.filter((f) => f.id !== filterColumn)
        return [...without, { id: filterColumn, value: filterValue }]
      })
      setFilterColumn("")
      setFilterValue("")
    }
  }

  const handleClearFilters = () => {
    setColumnFilters([])
    setGlobalFilter("")
    setShowFilterBar(false)
  }

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
        <div className="ml-auto pr-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleSaveView}>
            Save View
          </Button>
        </div>
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

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setShowFilterBar(!showFilterBar)}
        >
          <Filter className="h-3 w-3" />
          Filter
          {columnFilters.length > 0 && (
            <Badge className="ml-1 h-4 w-4 p-0 text-[9px] bg-[#0061FF] text-white flex items-center justify-center rounded-full">
              {columnFilters.length}
            </Badge>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => {
            if (sorting.length > 0) {
              setSorting([])
            }
          }}
        >
          <ArrowUpDown className="h-3 w-3" />
          Sort
          {sorting.length > 0 && (
            <Badge className="ml-1 h-4 w-4 p-0 text-[9px] bg-[#0061FF] text-white flex items-center justify-center rounded-full">
              {sorting.length}
            </Badge>
          )}
        </Button>

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Columns3 className="h-3 w-3" />
              {visibleColumnCount} Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  className="capitalize text-sm"
                >
                  {col.id === "metaTitle" ? "Meta Title" : col.id === "metaDescription" ? "Meta Description" : col.id === "createdAt" ? "Created" : col.id === "updatedAt" ? "Updated" : col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExportCsv}>
          <Download className="h-3 w-3" />
          Export CSV
        </Button>

        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onOpenUpload}>
          <Upload className="h-3 w-3" />
          Import
        </Button>
      </div>

      {/* Filter bar */}
      {showFilterBar && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-[#FAFBFC]">
          <Select value={filterColumn} onValueChange={setFilterColumn}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Column..." />
            </SelectTrigger>
            <SelectContent>
              {["status", "category", "keyword", "title"].map((col) => (
                <SelectItem key={col} value={col} className="text-xs capitalize">
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Filter value..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="h-8 w-40 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleApplyFilter()}
          />
          <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={handleApplyFilter}>
            Apply
          </Button>
          {columnFilters.length > 0 && (
            <>
              <div className="flex items-center gap-1 flex-wrap">
                {columnFilters.map((f) => (
                  <Badge
                    key={f.id}
                    variant="secondary"
                    className="text-xs gap-1 cursor-pointer"
                    onClick={() =>
                      setColumnFilters((prev) => prev.filter((pf) => pf.id !== f.id))
                    }
                  >
                    {f.id}: {String(f.value)}
                    <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleClearFilters}
              >
                Clear all
              </Button>
            </>
          )}
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
                          header.column.getCanSort() ? "cursor-pointer select-none hover:text-foreground" : ""
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && <span className="text-[10px]">↑</span>}
                        {header.column.getIsSorted() === "desc" && <span className="text-[10px]">↓</span>}
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
                  colSpan={visibleColumnCount}
                  className="text-center py-12 text-muted-foreground"
                >
                  No articles yet. Add a row or import keywords to get started.
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
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
          <span>{rowCount} Row{rowCount !== 1 ? "s" : ""}</span>
          <span>{visibleColumnCount}/{totalColumnCount} Columns</span>
        </div>
      </div>
    </div>
  )
}
