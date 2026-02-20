import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { CompanyProfile, Author } from "@/types"

interface AuthorsStepProps {
  profile: CompanyProfile
  onUpdate: (partial: Partial<CompanyProfile>) => void
}

export function AuthorsStep({ profile, onUpdate }: AuthorsStepProps) {
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState("")

  const authors = profile.authors ?? []

  const handleAddAuthor = () => {
    const name = newName.trim()
    if (!name) return
    const newAuthor: Author = {
      id: crypto.randomUUID(),
      name,
      role: newRole.trim() || undefined,
    }
    onUpdate({ authors: [...authors, newAuthor] })
    setNewName("")
    setNewRole("")
  }

  const handleRemoveAuthor = (id: string) => {
    onUpdate({ authors: authors.filter((a) => a.id !== id) })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddAuthor()
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Authors</Label>
        <p className="text-sm text-muted-foreground">
          Add the people who will be credited as authors on your content.
        </p>

        {authors.length > 0 && (
          <div className="space-y-2">
            {authors.map((author) => (
              <div
                key={author.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{author.name}</p>
                  {author.role && (
                    <p className="text-xs text-muted-foreground truncate">
                      {author.role}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleRemoveAuthor(author.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="author-name" className="text-xs">
              Name
            </Label>
            <Input
              id="author-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="John Doe"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="author-role" className="text-xs">
              Role (optional)
            </Label>
            <Input
              id="author-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Head of Content"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddAuthor}
            disabled={!newName.trim()}
            className="shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="author-rules" className="text-sm font-medium">
          Author Assignment Rules
        </Label>
        <p className="text-sm text-muted-foreground">
          Describe rules for automatically assigning authors based on topics.
          For example: "If the article is about engineering, assign John. If it's about marketing, assign Sarah."
        </p>
        <Textarea
          id="author-rules"
          value={profile.authorAssignmentRules ?? ""}
          onChange={(e) =>
            onUpdate({ authorAssignmentRules: e.target.value })
          }
          placeholder="If the topic is about product updates, the author is John Doe. If it's about SEO or marketing, the author is Sarah Smith."
          rows={4}
        />
      </div>
    </div>
  )
}
