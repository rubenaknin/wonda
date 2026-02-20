import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { SeoTooltip } from "@/components/shared/SeoTooltip"
import { CharCounter } from "./CharCounter"
import { CtaPreview } from "./CtaPreview"
import { Calendar } from "lucide-react"

interface MetadataStepProps {
  metaTitle: string
  metaDescription: string
  metaImageUrl: string
  ctaText: string
  ctaUrl: string
  createdAt?: string
  updatedAt?: string
  onUpdateMeta: (field: "metaTitle" | "metaDescription" | "metaImageUrl", value: string) => void
  onUpdateCta: (field: "ctaText" | "ctaUrl", value: string) => void
}

function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function MetadataStep({
  metaTitle,
  metaDescription,
  metaImageUrl,
  ctaText,
  ctaUrl,
  createdAt,
  updatedAt,
  onUpdateMeta,
  onUpdateCta,
}: MetadataStepProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">SEO Metadata</h3>
          <p className="text-sm text-muted-foreground">
            Optimize how your article appears in search results.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="meta-title">
              <SeoTooltip term="meta title">Meta Title</SeoTooltip>
            </Label>
            <CharCounter current={metaTitle.length} max={60} />
          </div>
          <Input
            id="meta-title"
            value={metaTitle}
            onChange={(e) => onUpdateMeta("metaTitle", e.target.value)}
            placeholder="SEO-optimized page title..."
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="meta-description">
              <SeoTooltip term="meta description">Meta Description</SeoTooltip>
            </Label>
            <CharCounter current={metaDescription.length} max={160} />
          </div>
          <Textarea
            id="meta-description"
            value={metaDescription}
            onChange={(e) => onUpdateMeta("metaDescription", e.target.value)}
            placeholder="A compelling description for search results..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta-image">Meta Image URL (og:image)</Label>
          <Input
            id="meta-image"
            type="url"
            value={metaImageUrl}
            onChange={(e) => onUpdateMeta("metaImageUrl", e.target.value)}
            placeholder="https://yoursite.com/images/article-cover.jpg"
          />
          {metaImageUrl && (
            <div className="rounded-lg border border-border overflow-hidden">
              <img
                src={metaImageUrl}
                alt="Meta preview"
                className="w-full h-32 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none"
                }}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cta-text-edit">
            <SeoTooltip term="cta">CTA Text</SeoTooltip>
          </Label>
          <Input
            id="cta-text-edit"
            value={ctaText}
            onChange={(e) => onUpdateCta("ctaText", e.target.value)}
            placeholder="Book a Demo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cta-url-edit">CTA URL</Label>
          <Input
            id="cta-url-edit"
            type="url"
            value={ctaUrl}
            onChange={(e) => onUpdateCta("ctaUrl", e.target.value)}
            placeholder="https://yoursite.com/demo"
          />
        </div>

        {/* Dates */}
        {(createdAt || updatedAt) && (
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">Dates</span>
            </div>
            {createdAt && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Created</span>
                <span>{formatDate(createdAt)}</span>
              </div>
            )}
            {updatedAt && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last updated</span>
                <span>{formatDate(updatedAt)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Preview</h3>
          <p className="text-sm text-muted-foreground">
            See how your CTA will appear in the article.
          </p>
        </div>

        <CtaPreview text={ctaText} url={ctaUrl} />

        <div className="wonda-card p-4 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Search Result Preview
          </h4>
          <div className="space-y-1">
            <p className="text-[#0061FF] text-base font-medium truncate">
              {metaTitle || "Your article title will appear here"}
            </p>
            <p className="text-xs text-[#10B981]">
              yoursite.com/blog/your-slug
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {metaDescription ||
                "Your meta description will appear here in search results..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
