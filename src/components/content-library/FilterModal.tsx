import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ── Types ──────────────────────────────────────────────────────
export type FilterOperator =
  | "contains"
  | "does_not_contain"
  | "equals"
  | "does_not_equal"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"

export type FilterConjunction = "and" | "or"

export interface FilterRule {
  id: string
  column: string
  operator: FilterOperator
  value: string
}

export interface FilterGroup {
  conjunction: FilterConjunction
  rules: FilterRule[]
}

interface FilterModalProps {
  open: boolean
  onClose: () => void
  filterGroup: FilterGroup
  onApply: (group: FilterGroup) => void
  columns: { id: string; label: string }[]
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: "contains",
  does_not_contain: "does not contain",
  equals: "equals",
  does_not_equal: "does not equal",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
}

const VALUE_FREE_OPERATORS: FilterOperator[] = ["is_empty", "is_not_empty"]

function emptyRule(): FilterRule {
  return {
    id: crypto.randomUUID(),
    column: "keyword",
    operator: "contains",
    value: "",
  }
}

// ── Filter matching logic (exported for use in table) ──────────
export function matchesFilterGroup(
  row: Record<string, unknown>,
  group: FilterGroup
): boolean {
  if (group.rules.length === 0) return true

  const results = group.rules.map((rule) => {
    const cellValue = String(row[rule.column] ?? "").toLowerCase()
    const filterValue = rule.value.toLowerCase()

    switch (rule.operator) {
      case "contains":
        return cellValue.includes(filterValue)
      case "does_not_contain":
        return !cellValue.includes(filterValue)
      case "equals":
        return cellValue === filterValue
      case "does_not_equal":
        return cellValue !== filterValue
      case "starts_with":
        return cellValue.startsWith(filterValue)
      case "ends_with":
        return cellValue.endsWith(filterValue)
      case "is_empty":
        return cellValue.trim() === ""
      case "is_not_empty":
        return cellValue.trim() !== ""
    }
  })

  return group.conjunction === "and"
    ? results.every(Boolean)
    : results.some(Boolean)
}

// ── Component ──────────────────────────────────────────────────
export function FilterModal({
  open,
  onClose,
  filterGroup,
  onApply,
  columns,
}: FilterModalProps) {
  const [local, setLocal] = useState<FilterGroup>(() => ({
    conjunction: filterGroup.conjunction,
    rules:
      filterGroup.rules.length > 0
        ? filterGroup.rules.map((r) => ({ ...r }))
        : [emptyRule()],
  }))

  const addRule = () => {
    setLocal((prev) => ({
      ...prev,
      rules: [...prev.rules, emptyRule()],
    }))
  }

  const removeRule = (id: string) => {
    setLocal((prev) => ({
      ...prev,
      rules: prev.rules.filter((r) => r.id !== id),
    }))
  }

  const updateRule = (id: string, patch: Partial<FilterRule>) => {
    setLocal((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }

  const handleApply = () => {
    // Remove rules with no value (unless operator is is_empty/is_not_empty)
    const cleaned: FilterRule[] = local.rules.filter(
      (r) => VALUE_FREE_OPERATORS.includes(r.operator) || r.value.trim() !== ""
    )
    onApply({ conjunction: local.conjunction, rules: cleaned })
    onClose()
  }

  const handleClear = () => {
    onApply({ conjunction: "and", rules: [] })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Filter Articles</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Conjunction toggle */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Show rows matching</span>
            <Select
              value={local.conjunction}
              onValueChange={(v) =>
                setLocal((prev) => ({
                  ...prev,
                  conjunction: v as FilterConjunction,
                }))
              }
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and" className="text-xs">
                  AND
                </SelectItem>
                <SelectItem value="or" className="text-xs">
                  OR
                </SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">of the following rules:</span>
          </div>

          {/* Rules */}
          <div className="space-y-2 max-h-64 overflow-auto">
            {local.rules.map((rule, idx) => (
              <div key={rule.id} className="flex items-center gap-2">
                {/* Conjunction label for 2nd+ rows */}
                <span className="w-10 text-xs text-muted-foreground text-right shrink-0">
                  {idx === 0 ? "Where" : local.conjunction.toUpperCase()}
                </span>

                {/* Column */}
                <Select
                  value={rule.column}
                  onValueChange={(v) => updateRule(rule.id, { column: v })}
                >
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.id} value={col.id} className="text-xs">
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator */}
                <Select
                  value={rule.operator}
                  onValueChange={(v) =>
                    updateRule(rule.id, { operator: v as FilterOperator })
                  }
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue>
                      {OPERATOR_LABELS[rule.operator]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value */}
                {!VALUE_FREE_OPERATORS.includes(rule.operator) && (
                  <Input
                    placeholder="Value..."
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    className="h-8 flex-1 text-xs"
                  />
                )}

                {/* Remove */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeRule(rule.id)}
                  disabled={local.rules.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 text-muted-foreground"
            onClick={addRule}
          >
            <Plus className="h-3 w-3" />
            Add filter rule
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear All
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
