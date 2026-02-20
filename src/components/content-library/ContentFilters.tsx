import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ARTICLE_CATEGORIES } from "@/lib/constants"

export interface FilterState {
  search: string
  source: "all" | "new" | "sitemap"
  contentPath: string
  status: string
  category: string
}

interface ContentFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  contentPaths: string[]
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "generating", label: "Generating" },
  { value: "error", label: "Error" },
]

export function ContentFilters({
  filters,
  onFiltersChange,
  contentPaths,
}: ContentFiltersProps) {
  const update = (partial: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...partial })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, keyword, or slug..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.source}
        onValueChange={(v) => update({ source: v as FilterState["source"] })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="new">New Articles</SelectItem>
          <SelectItem value="sitemap">Existing (Sitemap)</SelectItem>
        </SelectContent>
      </Select>

      {contentPaths.length > 0 && (
        <Select
          value={filters.contentPath}
          onValueChange={(v) => update({ contentPath: v })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Path" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Paths</SelectItem>
            {contentPaths.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.status}
        onValueChange={(v) => update({ status: v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category}
        onValueChange={(v) => update({ category: v })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {ARTICLE_CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
