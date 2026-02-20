import { useState } from "react"
import { Plus, X, Sparkles, Loader2, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { aiFillField } from "@/lib/ai-fill"
import { REVIEW_PLATFORMS } from "@/lib/constants"
import type { CompanyProfile } from "@/types"

interface BrandDnaStepProps {
  profile: CompanyProfile
  onUpdate: (partial: Partial<CompanyProfile>) => void
}

function AiFillButton({
  fieldName,
  profile,
  onUpdate,
}: {
  fieldName: string
  profile: CompanyProfile
  onUpdate: (partial: Partial<CompanyProfile>) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    const value = aiFillField(fieldName, profile)
    onUpdate({ [fieldName]: value })
    setLoading(false)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 text-muted-foreground hover:text-[#0061FF]"
      onClick={handleClick}
      disabled={loading}
      title="AI Fill"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
    </Button>
  )
}

export function BrandDnaStep({ profile, onUpdate }: BrandDnaStepProps) {
  const addSitemapUrl = () => {
    onUpdate({ contentSitemapUrls: [...profile.contentSitemapUrls, ""] })
  }

  const updateSitemapUrl = (index: number, value: string) => {
    const updated = [...profile.contentSitemapUrls]
    updated[index] = value
    onUpdate({ contentSitemapUrls: updated })
  }

  const removeSitemapUrl = (index: number) => {
    onUpdate({
      contentSitemapUrls: profile.contentSitemapUrls.filter((_, i) => i !== index),
    })
  }

  const addContentPath = () => {
    onUpdate({ contentPaths: [...profile.contentPaths, ""] })
  }

  const updateContentPath = (index: number, value: string) => {
    const updated = [...profile.contentPaths]
    updated[index] = value
    onUpdate({ contentPaths: updated })
  }

  const removeContentPath = (index: number) => {
    onUpdate({
      contentPaths: profile.contentPaths.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Brand DNA</h3>
        <p className="text-sm text-muted-foreground">
          Tell us about your company. This forms the foundation of all generated
          content.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="company-name">Company Name</Label>
          <AiFillButton fieldName="name" profile={profile} onUpdate={onUpdate} />
        </div>
        <Input
          id="company-name"
          value={profile.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Acme Inc."
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="company-description">Company Description</Label>
          <AiFillButton fieldName="description" profile={profile} onUpdate={onUpdate} />
        </div>
        <Textarea
          id="company-description"
          value={profile.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="What does your company do? Who do you serve?"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="value-prop">Value Proposition</Label>
          <AiFillButton fieldName="valueProp" profile={profile} onUpdate={onUpdate} />
        </div>
        <Textarea
          id="value-prop"
          value={profile.valueProp}
          onChange={(e) => onUpdate({ valueProp: e.target.value })}
          placeholder="What makes you unique? Why should customers choose you?"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="website-url">Website URL</Label>
          <AiFillButton fieldName="websiteUrl" profile={profile} onUpdate={onUpdate} />
        </div>
        <Input
          id="website-url"
          type="url"
          value={profile.websiteUrl}
          onChange={(e) => onUpdate({ websiteUrl: e.target.value })}
          placeholder="https://yourcompany.com"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="sitemap-url">Sitemap URL</Label>
          <AiFillButton fieldName="sitemapUrl" profile={profile} onUpdate={onUpdate} />
        </div>
        <Input
          id="sitemap-url"
          type="url"
          value={profile.sitemapUrl}
          onChange={(e) => onUpdate({ sitemapUrl: e.target.value })}
          placeholder="https://yourcompany.com/sitemap.xml"
        />
      </div>

      {/* Content Sitemap URLs */}
      <div className="space-y-2">
        <Label>Content Sitemap URLs</Label>
        <div className="space-y-2">
          {profile.contentSitemapUrls.map((url, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="url"
                value={url}
                onChange={(e) => updateSitemapUrl(index, e.target.value)}
                placeholder="https://yourcompany.com/blog-sitemap.xml"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeSitemapUrl(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addSitemapUrl}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Sitemap URL
        </Button>
        <p className="text-xs text-muted-foreground">
          Add sitemap URLs for your content sections. Used for generating
          internal links and loading existing articles.
        </p>
      </div>

      {/* Content Paths */}
      <div className="space-y-2">
        <Label>Content Paths</Label>
        <div className="space-y-2">
          {profile.contentPaths.map((path, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={path}
                onChange={(e) => updateContentPath(index, e.target.value)}
                placeholder="/blog"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeContentPath(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addContentPath}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Content Path
        </Button>
        <p className="text-xs text-muted-foreground">
          Enter the URL paths where your content lives (e.g., /blog, /learn)
        </p>
      </div>

      {/* Prompt Instructions */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <Label htmlFor="brand-dna-prompt" className="text-sm">
            Brand DNA Instructions
          </Label>
        </div>
        <Textarea
          id="brand-dna-prompt"
          value={profile.brandDnaPrompt ?? ""}
          onChange={(e) => onUpdate({ brandDnaPrompt: e.target.value })}
          placeholder="e.g. Always emphasize our sustainability mission. Avoid mentioning legacy products. Our tone should be professional but approachable."
          rows={3}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Free-text instructions to control how brand information is used during content generation.
        </p>
      </div>

      {/* Review Platforms */}
      <div className="space-y-2">
        <Label>Review Platforms</Label>
        <p className="text-xs text-muted-foreground">
          Select the platforms where your customers leave reviews.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {REVIEW_PLATFORMS.map((platform) => {
            const isSelected = profile.reviewPlatforms?.includes(platform)
            return (
              <button
                key={platform}
                type="button"
                onClick={() => {
                  const current = profile.reviewPlatforms ?? []
                  const updated = isSelected
                    ? current.filter((p) => p !== platform)
                    : [...current, platform]
                  onUpdate({ reviewPlatforms: updated })
                }}
                className={`text-left rounded-lg px-3 py-2 border text-sm transition-all ${
                  isSelected
                    ? "border-[#0061FF] bg-[#0061FF]/5 text-[#0061FF]"
                    : "border-border bg-white hover:border-[#0061FF]/30"
                }`}
              >
                {platform}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
