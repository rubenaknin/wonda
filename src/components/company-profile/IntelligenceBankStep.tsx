import { useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
  useEffect(() => {
    const generated = generateQuestions(profile)
    // Preserve existing enabled state for questions that match by id
    const existingMap = new Map(
      profile.intelligenceBank.map((q) => [q.id, q.enabled])
    )
    const merged = generated.map((q) => ({
      ...q,
      enabled: existingMap.has(q.id) ? existingMap.get(q.id)! : q.enabled,
    }))
    onUpdate({ intelligenceBank: merged })
    // Only regenerate when entering this step (when name/competitors change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleQuestion = (id: string) => {
    onUpdate({
      intelligenceBank: profile.intelligenceBank.map((q) =>
        q.id === id ? { ...q, enabled: !q.enabled } : q
      ),
    })
  }

  const enabledCount = profile.intelligenceBank.filter((q) => q.enabled).length

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Intelligence Bank</h3>
        <p className="text-sm text-muted-foreground">
          These are the top questions your audience is asking. Toggle the ones
          you want the AI to answer in your content.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {enabledCount} of {profile.intelligenceBank.length} questions enabled
        </p>
      </div>

      <ScrollArea className="h-[360px] rounded-lg border border-white/5 p-1">
        <div className="space-y-1 p-2">
          {profile.intelligenceBank.map((question) => (
            <div
              key={question.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-white/5 transition-colors"
            >
              <Label
                htmlFor={question.id}
                className="text-sm cursor-pointer flex-1 pr-4"
              >
                {question.text}
              </Label>
              <Switch
                id={question.id}
                checked={question.enabled}
                onCheckedChange={() => toggleQuestion(question.id)}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
