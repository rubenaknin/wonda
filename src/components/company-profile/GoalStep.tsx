import { useState } from "react"
import { Sparkles, Loader2, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SeoTooltip } from "@/components/shared/SeoTooltip"
import { aiFillField } from "@/lib/ai-fill"
import type { CompanyProfile } from "@/types"

interface GoalStepProps {
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
        <div className="flex items-center gap-1.5">
          <Label htmlFor="cta-text">CTA Button Text</Label>
          <AiFillButton fieldName="ctaText" profile={profile} onUpdate={onUpdate} />
        </div>
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
        <div className="flex items-center gap-1.5">
          <Label htmlFor="cta-url">CTA Destination URL</Label>
          <AiFillButton fieldName="ctaUrl" profile={profile} onUpdate={onUpdate} />
        </div>
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

      {/* Prompt Instructions */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <Label htmlFor="goal-prompt" className="text-sm">
            CTA Instructions
          </Label>
        </div>
        <Textarea
          id="goal-prompt"
          value={profile.goalPrompt ?? ""}
          onChange={(e) => onUpdate({ goalPrompt: e.target.value })}
          placeholder="e.g. For comparison articles, use 'See How We Compare' as CTA text. For how-to guides, use 'Try It Free' instead."
          rows={3}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Free-text instructions to control how the CTA varies across different article types.
        </p>
      </div>
    </div>
  )
}
