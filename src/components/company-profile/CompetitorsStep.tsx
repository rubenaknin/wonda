import { useState } from "react"
import { Plus, X, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { CompanyProfile, Competitor } from "@/types"

interface CompetitorsStepProps {
  profile: CompanyProfile
  onUpdate: (partial: Partial<CompanyProfile>) => void
}

export function CompetitorsStep({ profile, onUpdate }: CompetitorsStepProps) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")

  const addCompetitor = () => {
    if (!name.trim()) return
    const newCompetitor: Competitor = {
      id: crypto.randomUUID(),
      name: name.trim(),
      url: url.trim(),
    }
    onUpdate({ competitors: [...profile.competitors, newCompetitor] })
    setName("")
    setUrl("")
  }

  const removeCompetitor = (id: string) => {
    onUpdate({
      competitors: profile.competitors.filter((c) => c.id !== id),
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Competitors</h3>
        <p className="text-sm text-muted-foreground">
          Add your main competitors. This helps generate comparison content and
          competitive intelligence questions.
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="comp-name">Competitor Name</Label>
            <Input
              id="comp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Competitor Inc."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addCompetitor()
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="comp-url">Website URL</Label>
            <Input
              id="comp-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://competitor.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addCompetitor()
                }
              }}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addCompetitor}
          disabled={!name.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Competitor
        </Button>
      </div>

      {profile.competitors.length > 0 && (
        <div className="space-y-2">
          {profile.competitors.map((comp) => (
            <div
              key={comp.id}
              className="flex items-center justify-between rounded-lg bg-[#F8FAFC] border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{comp.name}</p>
                {comp.url && (
                  <p className="text-xs text-muted-foreground">{comp.url}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCompetitor(comp.id)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {profile.competitors.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No competitors added yet. Add at least one for better content
          generation.
        </p>
      )}

      {/* Prompt Instructions */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <Label htmlFor="competitors-prompt" className="text-sm">
            Competitor Instructions
          </Label>
        </div>
        <Textarea
          id="competitors-prompt"
          value={profile.competitorsPrompt ?? ""}
          onChange={(e) => onUpdate({ competitorsPrompt: e.target.value })}
          placeholder="e.g. Focus on our pricing advantage vs CompetitorA. Never mention CompetitorB's enterprise features as we don't compete on that level."
          rows={3}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Free-text instructions to control how competitors are referenced in generated content.
        </p>
      </div>
    </div>
  )
}
