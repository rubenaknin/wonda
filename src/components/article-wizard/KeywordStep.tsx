import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SeoTooltip } from "@/components/shared/SeoTooltip"

interface KeywordStepProps {
  keyword: string
  onChange: (keyword: string) => void
}

export function KeywordStep({ keyword, onChange }: KeywordStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Target Keyword</h3>
        <p className="text-sm text-muted-foreground">
          Enter the primary{" "}
          <SeoTooltip term="keyword">
            <span className="underline underline-offset-2">keyword</span>
          </SeoTooltip>{" "}
          you want this article to rank for.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="keyword">Keyword</Label>
        <Input
          id="keyword"
          value={keyword}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., best project management software"
          autoFocus
        />
      </div>
    </div>
  )
}
