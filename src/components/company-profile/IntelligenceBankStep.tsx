import { useEffect, useState } from "react"
import { Plus, X, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { generateQuestions } from "@/lib/questions"
import type { CompanyProfile } from "@/types"

interface IntelligenceBankStepProps {
  profile: CompanyProfile
  onUpdate: (partial: Partial<CompanyProfile>) => void
}

export function IntelligenceBankStep({
  profile,
  onUpdate,
}: IntelligenceBankStepProps) {
  const [newQuestion, setNewQuestion] = useState("")

  useEffect(() => {
    const generated = generateQuestions(profile)
    // Keep existing questions that were manually added, merge with generated
    const existingIds = new Set(profile.intelligenceBank.map((q) => q.id))
    const manualQuestions = profile.intelligenceBank.filter(
      (q) => q.id.startsWith("manual-")
    )
    const merged = [
      ...generated.filter((q) => !existingIds.has(q.id) || !q.id.startsWith("manual-")),
      ...manualQuestions,
    ]
    onUpdate({ intelligenceBank: merged })
    // Only regenerate when entering this step
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeQuestion = (id: string) => {
    onUpdate({
      intelligenceBank: profile.intelligenceBank.filter((q) => q.id !== id),
    })
  }

  const addQuestion = () => {
    if (!newQuestion.trim()) return
    const id = `manual-${crypto.randomUUID()}`
    onUpdate({
      intelligenceBank: [
        ...profile.intelligenceBank,
        { id, text: newQuestion.trim(), enabled: true },
      ],
    })
    setNewQuestion("")
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Intelligence Bank</h3>
        <p className="text-sm text-muted-foreground">
          We think that these are the top questions your audience is asking about
          your product. Add or remove questions if you feel it's not 100%
          accurate.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {profile.intelligenceBank.length} questions
        </p>
      </div>

      <ScrollArea className="h-[360px] rounded-lg border border-border p-1">
        <div className="space-y-1 p-2">
          {profile.intelligenceBank.map((question) => (
            <div
              key={question.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-[#F8FAFC] transition-colors group"
            >
              <span className="text-sm flex-1 pr-4">{question.text}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => removeQuestion(question.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex items-center gap-2">
        <Input
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Add a new question..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addQuestion()
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addQuestion}
          disabled={!newQuestion.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Prompt Instructions */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <Label htmlFor="intelligence-prompt" className="text-sm">
            Intelligence Bank Instructions
          </Label>
        </div>
        <Textarea
          id="intelligence-prompt"
          value={profile.intelligenceBankPrompt ?? ""}
          onChange={(e) => onUpdate({ intelligenceBankPrompt: e.target.value })}
          placeholder="e.g. Prioritize questions about pricing and ROI. Include at least 2 technical questions per article. Avoid questions about our competitors' internal processes."
          rows={3}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Free-text instructions to control how intelligence bank questions are selected and used.
        </p>
      </div>
    </div>
  )
}
