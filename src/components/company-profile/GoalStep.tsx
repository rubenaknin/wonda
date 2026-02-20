import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SeoTooltip } from "@/components/shared/SeoTooltip"
import type { CompanyProfile } from "@/types"

interface GoalStepProps {
  profile: CompanyProfile
  onUpdate: (partial: Partial<CompanyProfile>) => void
}

export function GoalStep({ profile, onUpdate }: GoalStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">The Goal</h3>
        <p className="text-sm text-muted-foreground">
          Define the primary call-to-action for your content. Every article will
          include this{" "}
          <SeoTooltip term="cta">
            <span className="underline underline-offset-2">CTA</span>
          </SeoTooltip>
          .
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cta-text">CTA Button Text</Label>
        <Input
          id="cta-text"
          value={profile.ctaText}
          onChange={(e) => onUpdate({ ctaText: e.target.value })}
          placeholder="Book a Demo"
        />
        <p className="text-xs text-muted-foreground">
          This text will appear on the call-to-action button in every article.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cta-url">CTA Destination URL</Label>
        <Input
          id="cta-url"
          type="url"
          value={profile.ctaUrl}
          onChange={(e) => onUpdate({ ctaUrl: e.target.value })}
          placeholder="https://yoursite.com/demo"
        />
        <p className="text-xs text-muted-foreground">
          Where should the CTA button send visitors?
        </p>
      </div>
    </div>
  )
}
