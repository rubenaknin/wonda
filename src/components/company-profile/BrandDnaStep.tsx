import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { CompanyProfile } from "@/types"

interface BrandDnaStepProps {
  profile: CompanyProfile
  onUpdate: (partial: Partial<CompanyProfile>) => void
}

export function BrandDnaStep({ profile, onUpdate }: BrandDnaStepProps) {
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
        <Label htmlFor="company-name">Company Name</Label>
        <Input
          id="company-name"
          value={profile.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Acme Inc."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company-description">Company Description</Label>
        <Textarea
          id="company-description"
          value={profile.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="What does your company do? Who do you serve?"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="value-prop">Value Proposition</Label>
        <Textarea
          id="value-prop"
          value={profile.valueProp}
          onChange={(e) => onUpdate({ valueProp: e.target.value })}
          placeholder="What makes you unique? Why should customers choose you?"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="website-url">Website URL</Label>
        <Input
          id="website-url"
          type="url"
          value={profile.websiteUrl}
          onChange={(e) => onUpdate({ websiteUrl: e.target.value })}
          placeholder="https://yourcompany.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sitemap-url">Sitemap URL</Label>
        <Input
          id="sitemap-url"
          type="url"
          value={profile.sitemapUrl}
          onChange={(e) => onUpdate({ sitemapUrl: e.target.value })}
          placeholder="https://yourcompany.com/sitemap.xml"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-sitemap-url">Blog Sitemap URL</Label>
        <Input
          id="blog-sitemap-url"
          type="url"
          value={profile.blogSitemapUrl}
          onChange={(e) => onUpdate({ blogSitemapUrl: e.target.value })}
          placeholder="https://yourcompany.com/blog-sitemap.xml"
        />
        <p className="text-xs text-muted-foreground">
          If your blog sitemap is different from the main sitemap, enter it
          here. Used for generating internal links.
        </p>
      </div>
    </div>
  )
}
