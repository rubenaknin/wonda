import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SeoTooltip } from "@/components/shared/SeoTooltip"
import { ARTICLE_CATEGORIES } from "@/lib/constants"
import { useArticles } from "@/context/ArticlesContext"
import type { ArticleCategory } from "@/types"

interface CategoryStepProps {
  keyword: string
  category: ArticleCategory | ""
  onChange: (category: ArticleCategory) => void
}

export function CategoryStep({
  keyword,
  category,
  onChange,
}: CategoryStepProps) {
  const { articles } = useArticles()

  const checkCannibalization = () => {
    const conflicts = articles.filter(
      (a) =>
        a.keyword.toLowerCase() === keyword.toLowerCase() &&
        a.category === category
    )
    if (conflicts.length > 0) {
      toast.warning(
        `Cannibalization detected! ${conflicts.length} existing article(s) target "${keyword}" in the same category.`,
        { duration: 5000 }
      )
    } else {
      toast.success("No cannibalization found. You're good to go!")
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Category</h3>
        <p className="text-sm text-muted-foreground">
          Choose a content category for this article.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Article Category</Label>
        <Select
          value={category}
          onValueChange={(v) => onChange(v as ArticleCategory)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category..." />
          </SelectTrigger>
          <SelectContent>
            {ARTICLE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {category && keyword && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkCannibalization}
          >
            <SeoTooltip term="cannibalization">
              Check Cannibalization
            </SeoTooltip>
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Scan your Content Library for articles targeting the same keyword
            and category.
          </p>
        </div>
      )}
    </div>
  )
}
