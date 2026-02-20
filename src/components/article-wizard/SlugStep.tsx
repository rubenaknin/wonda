import { useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SeoTooltip } from "@/components/shared/SeoTooltip"
import { generateSlug, isSlugTaken } from "@/lib/slug"
import { useArticles } from "@/context/ArticlesContext"

interface SlugStepProps {
  keyword: string
  slug: string
  onChange: (slug: string) => void
  editArticleId?: string
}

export function SlugStep({
  keyword,
  slug,
  onChange,
  editArticleId,
}: SlugStepProps) {
  const { articles } = useArticles()
  const duplicate = slug ? isSlugTaken(slug, articles, editArticleId) : false

  useEffect(() => {
    if (!slug && keyword) {
      onChange(generateSlug(keyword))
    }
  }, [keyword, slug, onChange])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          <SeoTooltip term="slug">Article Slug</SeoTooltip>
        </h3>
        <p className="text-sm text-muted-foreground">
          The URL-friendly identifier for this article. Auto-generated from your
          keyword — edit if needed.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          placeholder="best-project-management-software"
        />
        {duplicate && (
          <p className="text-sm text-destructive">
            This slug is already taken. Please choose a different one.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Preview: yoursite.com/blog/{slug || "..."}
        </p>
      </div>
    </div>
  )
}
