import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { SeoTooltip } from "@/components/shared/SeoTooltip"
import { CharCounter } from "./CharCounter"
import { CtaPreview } from "./CtaPreview"

interface MetadataStepProps {
  metaTitle: string
  metaDescription: string
  ctaText: string
  ctaUrl: string
  onUpdateMeta: (field: "metaTitle" | "metaDescription", value: string) => void
  onUpdateCta: (field: "ctaText" | "ctaUrl", value: string) => void
}

export function MetadataStep({
  metaTitle,
  metaDescription,
  ctaText,
  ctaUrl,
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
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Preview</h3>
          <p className="text-sm text-muted-foreground">
            See how your CTA will appear in the article.
          </p>
        </div>

        <CtaPreview text={ctaText} url={ctaUrl} />

        <div className="glass rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Search Result Preview
          </h4>
          <div className="space-y-1">
            <p className="text-blue-400 text-base font-medium truncate">
              {metaTitle || "Your article title will appear here"}
            </p>
            <p className="text-xs text-emerald-400">
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
