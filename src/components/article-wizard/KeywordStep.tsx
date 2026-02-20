import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SeoTooltip } from "@/components/shared/SeoTooltip"
import { useCompanyProfile } from "@/context/CompanyProfileContext"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface KeywordStepProps {
  keyword: string
  onChange: (keyword: string) => void
  authorId?: string
  onAuthorChange?: (authorId: string) => void
}

export function KeywordStep({ keyword, onChange, authorId, onAuthorChange }: KeywordStepProps) {
  const { profile } = useCompanyProfile()
  const authors = profile.authors ?? []
  const hasAuthors = authors.length > 0

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

      {hasAuthors && onAuthorChange && (
        <div className="space-y-2">
          <Label htmlFor="author">Author</Label>
          <Select value={authorId || "auto"} onValueChange={(v) => onAuthorChange(v === "auto" ? "" : v)}>
            <SelectTrigger id="author">
              <SelectValue placeholder="Select an author" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                {profile.authorAssignmentRules ? "Auto-assign based on rules" : "No author"}
              </SelectItem>
              {authors.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  {author.name}{author.role ? ` — ${author.role}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!authorId && profile.authorAssignmentRules && (
            <p className="text-xs text-muted-foreground">
              Author will be assigned automatically based on your rules.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
